import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { LogRecord } from '@opentelemetry/sdk-logs';


// TODO plugin system should be moved to a separate exporter


export interface PluginResource {
    id: string;
    name: string;
    active: boolean;
    description?: string;
    version?: string;
    pluginImplementation: PluginImpl;
    [key: string]: any; // Allow additional properties
};

export interface PluginImpl {
    newTrace: (span: ReadableSpan[]) => void;
    newMetric: (metric: ResourceMetrics) => void;
    newLog: (log: LogRecord) => void;
};