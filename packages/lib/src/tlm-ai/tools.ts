import logger from '../utils/logger.js';
import { inMemoryDbLogExporter, inMemoryDbMetricExporter, inMemoryDbSpanExporter } from '../telemetry/telemetryRegistry.js';
import { OasTlmConfig } from '../config/config.types.js';
import { loadApiSpec } from '../utils/oasUtils.js';
import { getSimplifiedLogs, getSimplifiedTraces, latestMetricTime, parseMetricTime, recentMetricPoints, summarizeMetricValue } from './tools-utils.js';

let aiConfig: OasTlmConfig | undefined;

export const configureAiTools = (config: OasTlmConfig) => {
    aiConfig = config;
};

const getTraces = async (input: {
    traceId?: string | null;
    spanId?: string | null;
    from?: string | null;
    to?: string | null;
    method?: string | null;
    statusCode?: number | null;
    offset?: number | null;
} = {}) => {
    const offset = Math.max(0, input.offset || 0);
    logger.debug('getTraces called with filters:', input);
    try {
        const search: Record<string, any> = {};
        if (input.traceId) search['_spanContext.traceId'] = input.traceId;
        if (input.spanId) search['_spanContext.spanId'] = input.spanId;
        const from = input.from ? Math.floor(Date.parse(input.from) / 1000) : undefined;
        const to = input.to ? Math.floor(Date.parse(input.to) / 1000) : undefined;
        if (from !== undefined && !Number.isNaN(from)) search['endTime.0'] = { $gte: from };
        if (to !== undefined && !Number.isNaN(to)) search['endTime.0'] = { ...(search['endTime.0'] || {}), $lte: to };
        if (input.method) search['attributes.http.method'] = input.method.toUpperCase();
        if (input.statusCode !== null && input.statusCode !== undefined) {
            search['attributes.http.status_code'] = input.statusCode;
        }
        const allTraces: any[] = await inMemoryDbSpanExporter.find({ query: search });
        const traces = allTraces.slice(offset, offset + 20);
        const simplifiedTraces = getSimplifiedTraces(traces);
        logger.debug(`Searching for traces with filters: ${JSON.stringify(search)}`);
        logger.debug(`Traces found: ${JSON.stringify(simplifiedTraces.length)}`);
        return {
            count: allTraces.length,
            offset,
            returned: simplifiedTraces.length,
            nextOffset: offset + simplifiedTraces.length < allTraces.length ? offset + simplifiedTraces.length : null,
            truncated: offset + simplifiedTraces.length < allTraces.length,
            traces: simplifiedTraces,
        };
    } catch (error) {
        logger.error('Error fetching traces:', error);
        throw error;
    }
};

const getMetricSummary = () => {
    try {
        const response = inMemoryDbMetricExporter.find({
            format: 'raw',
        });
        const metricNames = [...new Set(response.results.map((metric: any) => metric.descriptor?.name).filter(Boolean))].sort();
        const metrics = response.results
            .sort((a: any, b: any) => latestMetricTime(b) - latestMetricTime(a))
            .filter((metric: any, index: number, all: any[]) => all.findIndex((entry: any) =>
                entry.scope?.name === metric.scope?.name && entry.descriptor?.name === metric.descriptor?.name
            ) === index)
            .slice(0, 5)
            .map((metric: any) => ({
                scope: metric.scope?.name,
                name: metric.descriptor?.name,
                unit: metric.descriptor?.unit,
                series: metric.series?.slice(0, 3).map((series: any) => ({
                    attributes: series.attributes,
                    lastValue: summarizeMetricValue(series.values?.[series.values.length - 1]),
                })),
            }));

        return { stats: inMemoryDbMetricExporter.getStats(), metricNames, metrics };
    } catch (error) {
        logger.error('Error fetching metric summary:', error);
        throw error;
    }
};

const getMetricData = async (input: { metricName: string; from?: string | null; to?: string | null }) => {
    logger.debug('getMetricData called with metricName:', input.metricName);
    try {
        const response = inMemoryDbMetricExporter.find({
            format: 'raw',
            from: parseMetricTime(input.from || undefined),
            to: parseMetricTime(input.to || undefined),
        });
        const metric = response.results
            .filter((entry: any) => entry.descriptor?.name === input.metricName)
            .sort((a: any, b: any) => latestMetricTime(b) - latestMetricTime(a))[0];

        if (!metric) return { metricName: input.metricName, metrics: [] };

        const hasRange = Boolean(input.from || input.to);
        return {
            metric: {
                scope: metric.scope?.name,
                name: metric.descriptor?.name,
                unit: metric.descriptor?.unit,
                series: metric.series?.slice(0, 5).map((series: any) => ({
                    attributes: series.attributes,
                    points: recentMetricPoints(series, hasRange ? Number.MAX_SAFE_INTEGER : 10),
                })),
            },
        };
    } catch (error) {
        logger.error('Error fetching metric data:', error);
        throw error;
    }
};

const listApplicationEndpoints = () => {
    const spec = loadApiSpec(aiConfig);
    if (!spec) return { error: 'OpenAPI specification is not configured or could not be loaded.' };

    return {
        endpoints: Object.entries(spec.paths || {}).flatMap(([path, operations]: [string, any]) =>
            Object.entries(operations)
                .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method.toLowerCase()))
                .map(([method, operation]: [string, any]) => ({
                    method: method.toUpperCase(),
                    path,
                    summary: operation?.summary,
                }))
        ),
    };
};

const getApplicationEndpointDetails = (input: { path?: string; method?: string } = {}) => {
    const spec = loadApiSpec(aiConfig);
    const method = input.method?.toLowerCase();
    const operation = input.path && method ? spec?.paths?.[input.path]?.[method] : undefined;
    if (!operation) return { error: `Endpoint not found: ${input.method || ''} ${input.path || ''}`.trim() };

    return {
        method: method?.toUpperCase(),
        path: input.path,
        summary: operation.summary,
        description: operation.description,
        parameters: operation.parameters,
        requestBody: operation.requestBody,
        responses: operation.responses,
    };
};

const getLogs = async (input: { startDate?: string | null; endDate?: string | null; traceId?: string | null } = {}) => {
    const { startDate, endDate, traceId } = input;
    logger.debug("getLogs called with startDate:", startDate, "endDate:", endDate, "traceId:", traceId);
    try {
        const nedbQuery: Record<string, any> = {};
        if (startDate || endDate) {
            const startEpoch = startDate ? new Date(startDate).getTime() * 1000 : undefined;
            const endEpoch = endDate ? new Date(endDate).getTime() * 1000 : undefined;
            nedbQuery.timestamp = {
                ...(startEpoch !== undefined && !Number.isNaN(startEpoch) ? { $gte: startEpoch } : {}),
                ...(endEpoch !== undefined && !Number.isNaN(endEpoch) ? { $lte: endEpoch } : {}),
            };
            logger.debug(`Fetching logs from ${startEpoch} to ${endEpoch}`);
        }
        if (traceId) nedbQuery.traceId = traceId;
        const logs: any[] = (await inMemoryDbLogExporter.find({
            query: nedbQuery,
            messageSearch: null,
            limit: 100
        })) || [];
        logger.debug(`Found ${logs.length} logs in the specified range.`);
        const simplifiedLogs = getSimplifiedLogs(logs);
        return { count: simplifiedLogs.length, logs: simplifiedLogs };
    } catch (error) {
        logger.error('Error fetching logs:', error);
        throw error;
    }
};

const startTelemetry = () => {
    logger.debug("Starting telemetry...");
    inMemoryDbSpanExporter.enable();
    inMemoryDbLogExporter.enable();
    inMemoryDbMetricExporter.enable();
    return { started: true };
};

const stopTelemetry = () => {
    logger.debug("Stopping telemetry...");
    inMemoryDbSpanExporter.disable();
    inMemoryDbLogExporter.disable();
    inMemoryDbMetricExporter.disable();
    return { stopped: true };
};

const resetTelemetry = () => {
    logger.debug("Resetting telemetry...");
    inMemoryDbSpanExporter.reset();
    inMemoryDbLogExporter.reset();
    inMemoryDbMetricExporter.reset();
    return { reset: true };
};


const getTelemetryStatus = () => {
    logger.debug("Getting telemetry status...");
    return {
        spansEnabled: inMemoryDbSpanExporter.isEnabled(),
        logsEnabled: inMemoryDbLogExporter.isEnabled(),
        metricsEnabled: inMemoryDbMetricExporter.isEnabled()
    };
}


const getCurrentDate = () => {
    logger.debug("Getting the current date in ISO format...");
    const now = new Date();
    return { currentDateISO: now.toISOString() };
};

const tools = [
    {
        type: "function" as const,
        strict: true,
            name: "getTraces",
            description: `Fetches recorded request traces. Use explicit filters instead of building a database query. Pass traceId when following a trace ID from a log; use from and to as ISO dates. If no filters are provided, returns the latest page. The result includes count, returned, nextOffset and truncated; use nextOffset to fetch another page.`,
            parameters: {
                type: "object",
                properties: {
                    traceId: { type: ["string", "null"], description: "Trace ID from a log or another span." },
                    spanId: { type: ["string", "null"], description: "Optional span ID." },
                    from: { type: ["string", "null"], description: "Optional ISO start date." },
                    to: { type: ["string", "null"], description: "Optional ISO end date." },
                    method: { type: ["string", "null"], description: "Optional HTTP method, for example GET or POST." },
                    statusCode: { type: ["integer", "null"], description: "Optional HTTP status code." },
                    offset: {
                        type: ["integer", "null"],
                        description: "Zero-based offset for pagination. Use nextOffset from the previous result.",
                    }
                },
                required: ["traceId", "spanId", "from", "to", "method", "statusCode", "offset"],
                additionalProperties: false
            }
    },
    {
        type: "function" as const,
        strict: true,
            name: "getLogs",
            description: `Fetches log data for the microservice. 
        Logs provide information about system events, including timestamps, log levels (e.g., info, error), and messages. 
        Use traceId to find logs belonging to a specific request. The 'startDate' and 'endDate' parameters define the time range for fetching logs.
        Never invent dates or copy dates from examples. If the user did not specify a time range, set startDate and endDate to null. For relative ranges such as 'the last 20 minutes', call getCurrentDate first and calculate the dates.
        Common filters include timestamps or log levels.`,
            parameters: {
                type: "object",
                properties: {
                    startDate: {
                        type: ["string", "null"]
                    },
                    endDate: {
                        type: ["string", "null"]
                    },
                    traceId: {
                        type: ["string", "null"],
                        description: "Optional trace ID to retrieve logs from one request."
                    }
                },
                required: ["startDate", "endDate", "traceId"],
                additionalProperties: false
            }
    },
    {
        type: "function" as const,
        strict: true,
            name: "getMetricSummary",
            description: "Returns global metric statistics, all available metric names, and compact values for the most recently updated metrics. Use this once for a general overview; use getMetricData for one metric's values.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false
            }
    },
    {
        type: "function" as const,
        strict: true,
            name: "getMetricData",
            description: "Returns values and timestamps for one exact metric. Use from/to for a time range; without a range it returns only the 10 most recent points per series. If a range is provided, all points in that range are returned.",
            parameters: {
                type: "object",
                properties: {
                    metricName: { type: "string", description: "Exact metric name from getMetricSummary.metricNames." },
                    from: { type: ["string", "null"], description: "Optional ISO date/time lower bound." },
                    to: { type: ["string", "null"], description: "Optional ISO date/time upper bound." }
                },
                required: ["metricName", "from", "to"],
                additionalProperties: false
            }
    },
    {
        type: "function" as const,
        strict: true,
            name: "listApplicationEndpoints",
            description: "Lists the host application's API endpoints with only their method, path, and summary.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false
            }
    },
    {
        type: "function" as const,
        strict: true,
            name: "getApplicationEndpointDetails",
            description: "Returns details for one host application endpoint. Call listApplicationEndpoints first when the exact path or method is unknown.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string" },
                    method: { type: "string" }
                },
                required: ["path", "method"],
                additionalProperties: false
            }
    },
    {
        type: "function" as const,
        strict: true,
            name: "startTelemetry",
            description: "Starts telemetry collection. Use only when the user explicitly asks to start or resume telemetry.",
            parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    },
    {
        type: "function" as const,
        strict: true,
            name: "stopTelemetry",
            description: "Stops telemetry collection. Use only when the user explicitly asks to stop telemetry.",
            parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    },
    {
        type: "function" as const,
        strict: true,
            name: "resetTelemetry",
            description: "Clears stored telemetry data. Use only when the user explicitly asks to reset or clear telemetry.",
            parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    },
    {
        type: "function" as const,
        strict: true,
            name: "getTelemetryStatus",
            description: `Retrieves the current status of the telemetry system. 
        This function checks whether the telemetry system is currently active or inactive.`,
            parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    },
    {
        type: "function" as const,
        strict: true,
            name: "getCurrentDate",
            description: `Returns the current date in ISO 8601 format (e.g., "2024-06-07T12:34:56.789Z"). 
        Use this tool to obtain the current date when you need to specify a date for other tools, such as "getLogs".`,
            parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    }
];

export type AiToolInfo = {
    id: string;
    name: string;
    userDescription: string;
    description: string;
};

const userToolMetadata: Record<string, Pick<AiToolInfo, 'name' | 'userDescription'>> = {
    getTraces: { name: 'Traces', userDescription: 'Query recorded traces and requests.' },
    getLogs: { name: 'Logs', userDescription: 'Query recorded logs and filter them by date.' },
    getMetricSummary: { name: 'Metric summary', userDescription: 'Show a summary of the available metrics.' },
    getMetricData: { name: 'Metric data', userDescription: 'Query the values of a specific metric.' },
    listApplicationEndpoints: { name: 'App endpoints', userDescription: 'List the application endpoints.' },
    getApplicationEndpointDetails: { name: 'App endpoint details', userDescription: 'Show details for a specific endpoint.' },
    startTelemetry: { name: 'Start telemetry', userDescription: 'Start telemetry collection.' },
    stopTelemetry: { name: 'Stop telemetry', userDescription: 'Stop telemetry collection.' },
    resetTelemetry: { name: 'Reset telemetry', userDescription: 'Clear the stored telemetry data.' },
    getTelemetryStatus: { name: 'Telemetry status', userDescription: 'Check the current telemetry status.' },
    getCurrentDate: { name: 'Current date', userDescription: 'Get the current date and time.' },
};

export const getAiToolMetadata = (): AiToolInfo[] => tools.map((tool: any) => ({
    id: tool.name,
    ...(userToolMetadata[tool.name] || {
        name: tool.name,
        userDescription: tool.description,
    }),
    description: tool.description,
}));

const availableTools = {
    getTraces,
    getLogs,
    getMetricSummary,
    getMetricData,
    listApplicationEndpoints,
    getApplicationEndpointDetails,
    startTelemetry,
    stopTelemetry,
    resetTelemetry,
    getTelemetryStatus,
    getCurrentDate
};

export {
    tools,
    availableTools,
};
