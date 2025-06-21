import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import DynamicExporter from '../exporters/dynamicExporter';
import { InMemoryDBMetricsExporter } from '../exporters/InMemoryDBMetricsExporter';
import { InMemoryLogRecordExporter } from '../exporters/InMemoryLogRecordExporter';

export interface OasTlmExporter extends SpanExporter {
    plugins: PluginResource[];
    export: (readableSpans: ReadableSpan[], resultCallback: (result: { code: number }) => void) => void;
    shutdown: () => Promise<void>;
    forceFlush: () => Promise<void>;
    start: () => void;
    stop: () => void;
    isRunning: () => boolean;
    find: (search: any, callback: any) => any;
    reset: () => void;
    getFinishedSpans: () => any[];
};

export interface PluginResource {
    id: string;
    name: string;
    active: boolean;
    description?: string;
    version?: string;
    plugin: PluginImpl;
    [key: string]: any; // Allow additional properties
};

export interface PluginImpl {
    newTrace: (trace: any) => void;
    // Add other methods as needed
};
export interface OasTlmInputConfig {
    baseURL?: string;
    spec?: object | string;
    specFileName?: string;
    autoActivate?: boolean;
    authEnabled?: boolean;
    apiKeyMaxAge?: number;
    defaultApiKey?: string;
    exporter?: OasTlmExporter;
    [key: string]: any;
}

export interface GlobalOasTlmConfig {
    dynamicSpanExporter: DynamicExporter;
    metricsExporter: InMemoryDBMetricsExporter;
    logExporter: InMemoryLogRecordExporter; // Add log exporter
    metricsExporterInterval: number;
    baseURL: string;
    spec: any | null; // TODO
    specFileName: string;
    autoActivate: boolean;
    authEnabled: boolean;
    apiKeyMaxAge: number;
    password: string;
    jwtSecret: string;
    [key: string]: any;
}
