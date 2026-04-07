import { ChatCompletionTool } from 'openai/resources/index.js';
import logger from '../utils/logger.js';
import { inMemoryDbLogExporter, inMemoryDbMetricExporter, inMemoryDbSpanExporter } from '../telemetry/telemetryRegistry.js';

const getTraces = async (searchInput: string) => {
    logger.debug("getTraces called with searchInput:", searchInput);
    try {
        const search = searchInput ? JSON.parse(searchInput) : {};
        const traces: any[] = await inMemoryDbSpanExporter.find({
            query: search,
            limit: 1000
        });
        const simplifiedTraces = getSimplifiedTraces(traces);
        logger.debug(`Searching for traces with searchInput: ${JSON.stringify(search)}`);
        logger.debug(`Traces found: ${JSON.stringify(simplifiedTraces.length)}`);
        return { traces: simplifiedTraces };
    } catch (error) {
        logger.error('Error fetching traces:', error);
        throw error;
    }
};

const getLogs = async (startDate: string | undefined, endDate: string | undefined) => {
    logger.debug("getLogs called with startDate:", startDate, "endDate:", endDate);
    try {
        // Timestamps are stored in microseconds in the DB (must multiply by 1000)
        const startEpoch = startDate ? new Date(startDate).getTime() * 1000 : 0;
        const endEpoch = endDate ? new Date(endDate).getTime() * 1000 : Date.now() * 1000;
        logger.debug(`Fetching logs from ${startEpoch} to ${endEpoch}`);
        const nedbQuery = {
            timestamp: {
                $gte: startEpoch,
                $lte: endEpoch
            }
        };
        const logs: any[] = (await inMemoryDbLogExporter.find({
            query: nedbQuery,
            messageSearch: null,
            limit: 1000 // or any appropriate limit
        })) || [];
        logger.debug(`Found ${logs.length} logs in the specified range.`);
        const simplifiedLogs = getSimplifiedLogs(logs);
        return { logs: simplifiedLogs };
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
}

const stopTelemetry = () => {
    logger.debug("Stopping telemetry...");
    inMemoryDbSpanExporter.disable();
    inMemoryDbLogExporter.disable();
    inMemoryDbMetricExporter.disable();
}

const resetTelemetry = () => {
    logger.debug("Resetting telemetry...");
    inMemoryDbSpanExporter.reset();
    inMemoryDbLogExporter.reset();
    inMemoryDbMetricExporter.reset();
}

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

const tools: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "getTraces",
            description: `Fetches trace data for the microservice. 
        Traces provide detailed information about requests and their lifecycle, including HTTP attributes (e.g., URL, method, status code), 
        network details (e.g., peer IP, port), and timing information. 
        The 'searchInput' parameter is an object used to filter traces based on specific criteria. 
        This is a NeDB query using MongoDB-like syntax (neDB). If 'searchInput' is null, all traces will be fetched.
        Providing specific filters improves performance.

        Available properties for filtering:
        {
          "name": "GET", // Name of the span
          "kind": 1, // 1 for incoming requests, 2 for outgoing requests
          "attributes": {
            "http": {
              "url": "http://localhost:3002/api/v1/greet",
              "host": "localhost:3002",
              "method": "GET",
              "scheme": "http",
              "target": "/api/v1/greet",
              "user_agent": "PostmanRuntime/7.44.0",
              "request_content_length_uncompressed": 39,
              "flavor": "1.1",
              "status_code": 200,
              "status_text": "OK"
            },
            "net": {
              "host": {
                "name": "localhost",
                "ip": "::1",
                "port": 3002
              },
              "transport": "ip_tcp",
              "peer": {
                "ip": "::1",
                "port": 50361
              }
            }
          },
          "traceId": "5f7df252eb00e873bbd6441f86b71dac",
          "spanId": "fbd8ea558dd6ac32",
          "service": "oas-telemetry-service",
          "startTime": { "0": 1747666254, "1": 333000000 },
          "endTime": { "0": 1747666254, "1": 335071700 },
          "_duration": { "0": 0, "1": 2071700 }
        }


        you can use $or, or $gte or operators like that if needed never > or similar.
        Take into account that startTime.0 and endTime.0 are in epoch SECONDS format not milliseconds.
        For time search ALWAYS use "endTime.0": { "$gte": number } or similar with other operators and startTime.0.
        Common filters include HTTP attributes (e.g., method, status code, URL), timestamps (e.g., 'endTime.0'), or duration ('_duration').
        
        Example 'query':
        {
          "attributes.http.method": "GET",
          "attributes.http.status_code": 200, //when asked for ANY error you can use $gte : 400 operator
          "attributes.http.url": "http://localhost:3002/api/v1/greet",
          "_duration": { "$lte": 5000000 },
          "endTime.0": { "$gte": 1747666254 },
        }
        you must give a {searchInput: query} object to the function
        
        `,
            parameters: {
                type: "object",
                properties: {
                    searchInput: {
                        type: "object",
                        description: `Optional search criteria for filtering traces. 
              This is a NeDB query using MongoDB-like (neDB) syntax. 
              For example, you can filter by HTTP attributes, timestamps, or duration. 
              If null, all traces will be returned.`,
                        additionalProperties: true
                    }
                },
                required: ["searchInput"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getLogs",
            description: `Fetches log data for the microservice. 
        Logs provide information about system events, including timestamps, log levels (e.g., info, error), and messages. 
        The 'startDate' and 'endDate' parameters define the time range for fetching logs. 
        If you need a date, you MUST first call the "getCurrentDate" tool to obtain the current date in ISO format, and then use it as a parameter.
        If you don't provide a range, all logs will be fetched. Providing a specific range improves performance.
        Example 'startDate' and 'endDate':
        {
          "startDate": "2023-10-01T00:00:00Z",
          "endDate": "2023-10-02T00:00:00Z"
        }
        Common filters include timestamps or log levels.`,
            parameters: {
                type: "object",
                properties: {
                    startDate: {
                        type: "string"
                    },
                    endDate: {
                        type: "string"
                    }
                },
            }
        }
    },
    {
        type: "function",
        function: {
            name: "startTelemetry",
            description: `Starts the telemetry data collection process. 
        This function initializes the telemetry system and begins capturing trace, log, and metric data.`,
            parameters: {}
        }
    },
    {
        type: "function",
        function: {
            name: "stopTelemetry",
            description: `Stops the telemetry data collection process. 
        This function halts the telemetry system and stops capturing trace, log, and metric data.`,
            parameters: {}
        }
    },
    {
        type: "function",
        function: {
            name: "resetTelemetry",
            description: `Resets the telemetry data collection process. 
        This function clears any existing telemetry data and prepares the system for a fresh start.`,
            parameters: {}
        }
    },
    {
        type: "function",
        function: {
            name: "getTelemetryStatus",
            description: `Retrieves the current status of the telemetry system. 
        This function checks whether the telemetry system is currently active or inactive.`,
            parameters: {}
        }
    },
    {
        type: "function",
        function: {
            name: "getCurrentDate",
            description: `Returns the current date in ISO 8601 format (e.g., "2024-06-07T12:34:56.789Z"). 
        Use this tool to obtain the current date when you need to specify a date for other tools, such as "getLogs".`,
            parameters: {}
        }
    }
];

const availableTools = {
    getTraces,
    getLogs,
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

function getSimplifiedTraces(spans: any[]) {
    return spans.map((span: any) => {
        return {
            name: span.name,
            kind: span.kind,
            attributes: span.attributes,
            resource: span.resource,
            _spanContext: span._spanContext,
            startTime: span.startTime,
            endTime: span.endTime,
            _duration: span._duration
        };
    });
}


function getSimplifiedLogs(logs: any[]) {
    return logs.map((log: any) => ({
        service: log.resource?.attributes?.service?.name || undefined,
        timestamp: new Date(log.timestamp / 1000).toISOString(), // converting microseconds to milliseconds
        severityText: log.severityText,
        message: log.body,
        traceId: log.traceId,
        source: log.attributes?.source || undefined,
    }));
}