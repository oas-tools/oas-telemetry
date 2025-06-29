import axios from 'axios';
import { ChatCompletionTool } from 'openai/resources/index.js';
import logger from '../utils/logger.js';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { getKnownMicroservices } from './knownMicroservices.js';
import { inMemoryDbLogExporter, inMemoryDbMetricExporter, inMemoryDbSpanExporter } from '../telemetry/telemetryRegistry.js';

const getTraces = async (searchInput: string) => {
    logger.debug("getTraces called with searchInput:", searchInput);
    try {
        const search = searchInput || {};
        const traces: any[] = await new Promise((resolve, reject) => {
            inMemoryDbSpanExporter.find(search, (err: any, docs: any) => {
                if (err) reject(err);
                else resolve(docs);
            });
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

const getLogs = async (startDate: Date, endDate: Date) => {
    logger.debug("getLogs called with startDate:", startDate, "endDate:", endDate);
    try {

        let nedbQuery = {};
        if (!startDate && !endDate) {
            logger.debug("No date range provided, fetching all logs.");
        } else {
            logger.debug(`Fetching logs from ${startDate} to ${endDate}`);
            nedbQuery = {
                timestamp: {
                    $gte: startDate ? new Date(startDate).getTime() : 0, // Epoch ms
                    $lte: endDate ? new Date(endDate).getTime() : Date.now() // Epoch ms
                }
            };
        }
        const logs: any[] = [];
        await new Promise<void>((resolve, reject) => {
            inMemoryDbLogExporter.find(nedbQuery, null, (err: any, docs: any) => {
                if (err) {
                    reject(err);
                } else {
                    logs.push(...docs);
                    logger.debug(`Found ${logs.length} logs in the specified range.`);
                    resolve();
                }
            });
        });
        const simplifiedLogs = getSimplifiedLogs(logs);
        return { logs: simplifiedLogs };
    } catch (error) {
        logger.error('Error fetching logs:', error);
        throw error;
    }
};

const getMetrics = async (searchInput: Record<string, any>) => {
    logger.debug("getMetrics called with searchInput:", searchInput);
    try {
        const search = searchInput || {};
        const metrics: ResourceMetrics[] = await new Promise((resolve, reject) => {
            inMemoryDbMetricExporter.find(search, (err: any, docs: ResourceMetrics[]) => {
                if (err) reject(err);
                else resolve(docs || []);
            });
        });
        const simplifiedMetrics = getSimplifiedMetrics(metrics);
        logger.debug(`Searching for metrics with searchInput: ${JSON.stringify(search)}`);
        logger.debug(`Metrics found: ${JSON.stringify(simplifiedMetrics.length)}`);
        return { metrics: simplifiedMetrics };
    } catch (error) {
        logger.error('Error fetching metrics:', error);
        throw error;
    }
};

const getCurrentTimestampInEpoch = () => {
    logger.debug("Getting the current timestamp in epoch format...");
    const now = new Date();
    return { currentTimestampInEpoch: now.getTime(), currentTimestampInEpochSeconds: Math.floor(now.getTime() / 1000) };
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


const talkToExternalMicroserviceAgent = async (message: string, microserviceId: string) => {
    logger.debug("talkToExternalMicroserviceAgent called with question:", message, "microservice:", microserviceId);
    const knownMicroservices = getKnownMicroservices();
    const identifiedMicroservice = knownMicroservices.find(m => m.id === microserviceId);
    if (!identifiedMicroservice) {
        logger.error(`Agent tried to call an unknown microservice: ${microserviceId}, available microservices: ${knownMicroservices.map(m => m.id).join(', ')}`);
        return {
            microservice: microserviceId,
            response: `I cannot help with that. The microservice ${microserviceId} is not recognized. Available microservices are: ${knownMicroservices.map(m => m.id).join(', ')}`
        }
    }
    const microserviceResponse = await axios.post(identifiedMicroservice.url, {
        question: message
    });
    return {
        microservice: microserviceId,
        response: microserviceResponse.data
    };
};

const getMicroserviceAgents = () => {
    logger.debug("Getting microservice agents...");
    return getKnownMicroservices();
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
        If don't provide a range, all logs will be fetched. Providing a specific range improves performance.
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
            name: "getMetrics",
            description: `Fetches metrics data for the microservice. 
        Metrics provide performance-related data, such as CPU usage, memory usage, and process-specific metrics. 
        The 'searchInput' parameter is an object used to filter metrics based on specific criteria. 
        This is a NeDB query using MongoDB-like (NeDB) syntax. If 'searchInput' is null, all metrics will be fetched. Providing specific filters improves performance.
        
        Example 'searchInput':
        {
          "timestamp": { "$gte": 1747651105757, "$lte": 1747651200935 }
        }
        
        Common filters include timestamps.`,
            parameters: {
                type: "object",
                properties: {
                    searchInput: {
                        type: "object",
                        description: `Optional search criteria for filtering metrics. 
              This is a NeDB query using MongoDB-like (NeDB) syntax. 
              For example, you can filter by timestamps. 
              If null, all metrics will be returned.`,
                        properties: {
                            "timestamp": { type: "object", properties: { "$gte": { type: "integer" }, "$lte": { type: "integer" } } },
                            "cpuUsageData.cpuNumber": { type: "string" },
                            "memoryData.used": { type: "integer" }
                        }
                    }
                },
                required: ["searchInput"]
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
            name: "getCurrentTimestampInEpoch",
            description: `Retrieves the current timestamp in epoch format (miliseconds or seconds). 
        This function calculates the timestamp for the current moment in milliseconds since the Unix epoch.in .currentTimestampInEpoch. Also returns the current timestamp in seconds in .currentTimestampInEpochSeconds.`,
            parameters: {}
        }
    },
    {
        type: "function",
        function: {
            name: "talkToExternalMicroserviceAgent",
            description: `Use this function to communicate with external microservice agent.
        if you want to talk to a microservice agent, you must provide the message and the microservice you want to talk to.  
        When you call this function, it will send the message to the specified microservice and return the response.

        Example 'message':
        {
          "message": "What is the status of the service?",
          "microservice": "Reporter"
        }

        Microservices Availables (by ID):
        ${getKnownMicroservices().map(m => m.id).join(", ")}
        `,
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: `The message to be sent to the external microservice agent.`
                    },
                    microservice: {
                        type: "string"
                    }
                },
                required: ["message", "microservice"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getMicroserviceAgents",
            description: `Retrieves the list of available microservice agents. 
        This function provides information about the microservices that can be communicated with.`,
            parameters: {}
        }
    }
];

const availableTools = {
    getTraces,
    getLogs,
    getMetrics,
    startTelemetry,
    stopTelemetry,
    resetTelemetry,
    getTelemetryStatus,
    getCurrentTimestampInEpoch,
    talkToExternalMicroserviceAgent,
    getMicroserviceAgents
};

export {
    tools,
    availableTools,
};



function getSimplifiedMetrics(metrics: any[]): any[] {
    return metrics.map(resourceMetric => {
        const serviceName = resourceMetric.resource?._memoizedAttributes?.service?.name || 'unknown-service';

        const cpuUtilization = {};
        let cpuCount = 0;
        const memoryUsageMB = { used: 0, free: 0 };
        const memoryUtilizationPercent = { used: 0, free: 0 };
        const networkIO = { transmit: 0, receive: 0 };
        const processCPU = {};
        let processMemoryUsage = 0;

        for (const scopeMetric of resourceMetric.scopeMetrics) {
            for (const metric of scopeMetric.metrics) {
                const name = metric.descriptor.name;

                if (name === 'system.cpu.utilization') {
                    const stateSums = {};
                    const stateCounts = {};
                    for (const dp of metric.dataPoints) {
                        const state = dp.attributes?.system?.cpu?.state;
                        if (!state) continue;
                        // @ts-expect-error index signature
                        stateSums[state] = (stateSums[state] || 0) + dp.value;
                        // @ts-expect-error index signature
                        stateCounts[state] = (stateCounts[state] || 0) + 1;
                    }

                    for (const state in stateSums) {
                        // @ts-expect-error index signature
                        cpuUtilization[state] = stateSums[state] / stateCounts[state];
                    }

                    cpuCount = Math.max(...metric.dataPoints.map((dp: any) => parseInt(dp.attributes?.system?.cpu?.logical_number || 0, 10))) + 1;
                }

                if (name === 'system.memory.usage') {
                    for (const dp of metric.dataPoints) {
                        const state = dp.attributes?.system?.memory?.state;
                        //  @ts-expect-error index signature
                        if (state) memoryUsageMB[state] = dp.value;
                    }
                }

                if (name === 'system.memory.utilization') {
                    for (const dp of metric.dataPoints) {
                        const state = dp.attributes?.system?.memory?.state;
                        //  @ts-expect-error index signature
                        if (state) memoryUtilizationPercent[state] = dp.value;
                    }
                }

                if (name === 'system.network.io') {
                    for (const dp of metric.dataPoints) {
                        const direction = dp.attributes?.network?.io?.direction;
                        //  @ts-expect-error index signature
                        if (direction) networkIO[direction] += dp.value;
                    }
                }

                if (name === 'process.cpu.time') {
                    for (const dp of metric.dataPoints) {
                        const state = dp.attributes?.process?.cpu?.state;
                        //  @ts-expect-error index signature
                        if (state) processCPU[state] = dp.value;
                    }
                }

                if (name === 'process.memory.usage') {
                    processMemoryUsage = metric.dataPoints[0]?.value || 0;
                }
            }
        }

        return {
            service: serviceName,
            cpu: {
                avgUtilization: cpuUtilization,
                cores: cpuCount,
            },
            memory: {
                usedGB: (memoryUsageMB.used || 0) / (1024 ** 3),
                freeGB: (memoryUsageMB.free || 0) / (1024 ** 3),
                usedPercent: (memoryUtilizationPercent.used || 0) * 100,
                freePercent: (1 - (memoryUtilizationPercent.used || 0)) * 100,
            },
            network: {
                transmittedMB: networkIO.transmit / (1024 ** 2),
                receivedMB: networkIO.receive / (1024 ** 2),
            },
            process: {
                cpuTimeSec: processCPU,
                memoryUsageMB: processMemoryUsage / (1024 ** 2),
            }
        };
    });
}



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
        timestamp: log.timestamp,
        message: log.body,
        traceId: log.traceId,
        spanId: log.spanId,
        source: log.attributes?.source?.source || undefined,
    }));
}