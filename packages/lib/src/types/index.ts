import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { SdkLogRecord } from '@opentelemetry/sdk-logs';
import { ChildProcess } from 'child_process';




export interface PluginResource {
    url?: string;
    code?: any; // This overrides url if both are provided
    moduleFormat?: "cjs" | "esm";
    install?: any; // object for dynamic installer
    config?: Record<string, any>; // Configuration object passed to plugin on load
    id: string;
    name: string;
    active: boolean;
    description?: string;
    version?: string;
    sourceCode?: string; // The original source code (code or fetched from url)
    process?: ChildProcess; // The process running the pluginImplementation
};

export interface PluginImpl {
    load(config: (config: any) => unknown): unknown;
    isConfigured(): boolean;
    unload?(): (Promise<boolean> | boolean);
    newTrace?: (span: ReadableSpan[]) => void;
    newMetric?: (metric: ResourceMetrics) => void;
    newLog?: (log: SdkLogRecord) => void;
};