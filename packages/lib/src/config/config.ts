import merge from 'lodash.merge';
import { OasTlmConfig, DeepPartial, UserConfig } from './config.types.js';
import { BufferConfig, SpanExporter, SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { IMetricReader, MetricProducer } from '@opentelemetry/sdk-metrics';
import { LogRecordExporter, LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { type PluginResource } from '../types/index.js';
import { type ViewOptions } from '@opentelemetry/sdk-metrics/build/src/view/View.js';

export type CaptureBodyMode = 'off' | 'onError' | 'onMismatch' | 'onMismatchOrError' | 'always';
const CAPTURE_BODY_MODES: CaptureBodyMode[] = ['off', 'onError', 'onMismatch', 'onMismatchOrError', 'always'];

// Environment-level config (highest priority)
// If NOT defined, it should return UNDEFINED so it dose not override the userConfig or defaultConfig.
// Thats why we use getParsedEnvVar with no default value.
const loadEnv = (): DeepPartial<OasTlmConfig> => {

    return {
        general: {
            specFileName: getParsedEnvVar("OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME"),
            // spec Not settable via env
        },
        auth: {
            enabled: getParsedEnvVar("OASTLM_CONFIG_AUTH_ENABLED", (v) => v === "true"),
            password: getParsedEnvVar("OASTLM_CONFIG_AUTH_PASSWORD"),
            jwtSecret: getParsedEnvVar("OASTLM_CONFIG_AUTH_JWT_SECRET"),
            accessTokenMaxAge: getParsedEnvVar("OASTLM_CONFIG_AUTH_ACCESS_TOKEN_MAX_AGE", (v) => parseInt(v, 10)),
            refreshTokenMaxAge: getParsedEnvVar("OASTLM_CONFIG_AUTH_REFRESH_TOKEN_MAX_AGE", (v) => parseInt(v, 10)),
        },
        traces: {
            memoryExporter: {
                enabled: getParsedEnvVar("OASTLM_CONFIG_TRACES_MEMORY_EXPORTER_ENABLED", (v) => v === "true"),
                retentionTimeSeconds: getParsedEnvVar("OASTLM_CONFIG_TRACES_MEMORY_EXPORTER_RETENTION_TIME_SECONDS", (v) => parseInt(v, 10)),
                httpOnly: getParsedEnvVar("OASTLM_CONFIG_TRACES_MEMORY_EXPORTER_HTTP_ONLY", (v) => v === "true"),
                // filters NOT settable via env
            },
            captureBody: {
                mode: getParsedEnvVar("OASTLM_CONFIG_TRACES_CAPTURE_BODY_MODE", (v) => CAPTURE_BODY_MODES.includes(v as CaptureBodyMode) ? v as CaptureBodyMode : undefined),
                maxSizeBytes: getParsedEnvVar("OASTLM_CONFIG_TRACES_CAPTURE_BODY_MAX_SIZE_BYTES", (v) => parseInt(v, 10)),
            },
        },
        metrics: {
            mainMetricReaderOptions: {
                exportIntervalMillis: getParsedEnvVar("OASTLM_CONFIG_METRICS_MAIN_READER_EXPORT_INTERVAL", (v) => parseInt(v, 10)),
                // metricProducers NOT settable via env
            },
            memoryExporter: {
                enabled: getParsedEnvVar("OASTLM_CONFIG_METRICS_MEMORY_EXPORTER_ENABLED", (v) => v === "true"),
                retentionTimeSeconds: getParsedEnvVar("OASTLM_CONFIG_METRICS_MEMORY_EXPORTER_RETENTION_TIME_SECONDS", (v) => parseInt(v, 10)),
                // filters NOT settable via env
            },
            recordSchemaCompliance: getParsedEnvVar("OASTLM_CONFIG_METRICS_RECORD_SCHEMA_COMPLIANCE", (v) => v === "true"),
        },
        logs: {
            memoryExporter: {
                enabled: getParsedEnvVar("OASTLM_CONFIG_LOGS_MEMORY_EXPORTER_ENABLED", (v) => v === "true"),
                retentionTimeSeconds: getParsedEnvVar("OASTLM_CONFIG_LOGS_MEMORY_EXPORTER_RETENTION_TIME_SECONDS", (v) => parseInt(v, 10)),
                // filters NOT settable via env
            },
        },
        ai: {
            openAIKey: getParsedEnvVar("OASTLM_CONFIG_AI_OPENAI_KEY"),
            openAIModel: getParsedEnvVar("OASTLM_CONFIG_AI_OPENAI_MODEL", (v) => v || "gpt-3.5-turbo"),
            extraContextPrompts: getParsedEnvVar("OASTLM_CONFIG_AI_EXTRA_CONTEXT_PROMPTS", (v) => v ? v.split(',') : []),
        },
        plugins: {
            enabled: getParsedEnvVar("OASTLM_CONFIG_PLUGINS_ENABLED", (v) => v === "true"),
        },
    }
};


// This defines de OasTlmConfig type, which is used throughout the library.
// Please ensure that all possible types are included here, not only the defaults.
// e.g. .ai.openAIKey: null as string | null, default is null, but can be set to a string.
// NOTE: Some BOOT environment variables (e.g., OASTLM_BOOT_MODULE_DISABLED) are accessed before this config is loaded.
// This means certain settings may affect application startup behavior outside of this configuration system.
export const defaultConfig = {
    general: {
        specFileName: null as string | null, // e.g. "oas.json" or null if not provided
        spec: null as string | null, // e.g. JSON.stringify(oasSpec) or null if not provided,
        uiPath: "/oas-telemetry-ui", // path to the UI, e.g. "/oas-telemetry-ui" WARN: This must match the UI package's App.tsx "oas-telemetry-ui" path
    },
    auth: {
        enabled: false,
        password: "oas-telemetry-password",
        jwtSecret: "oas-telemetry-secret",
        accessTokenMaxAge: 1000 * 60 * 5, // 5 minutes
        refreshTokenMaxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
    ai: {
        openAIKey: null as string | null,
        openAIModel: "gpt-3.5-turbo",
        extraContextPrompts: [] as string[], // e.g. ["Provide detailed explanations", "Use simple language"]
    },
    traces: {
        extraExporters: [] as SpanExporter[], // e.g. [new ConsoleSpanExporter()]
        extraProcessors: [] as SpanProcessor[], // e.g. [new SimpleSpanProcessor(new ConsoleSpanExporter())]
        mainProcessorOptions: {
            config: undefined as BufferConfig | undefined
        },
        memoryExporter: {
            enabled: true, // auto start exporting.
            retentionTimeSeconds: 60 * 60, // 1 hour
            // Only store spans created by @opentelemetry/instrumentation-http (real HTTP request/response spans).
            // Other instrumentations (e.g. express) generate many internal spans per request that are still
            // exported normally to extraExporters/OTLP, just not kept in this in-memory store, to bound its memory use.
            httpOnly: true,
        },
        // Attaches the request/response body as attributes on the active span, for debugging.
        // Off by default: bodies can contain PII. "onError"/"onMismatch"/"onMismatchOrError" only
        // capture when there's something worth looking at (a 4xx/5xx response, or a route that
        // isn't in the OpenAPI spec); "always" captures on every request regardless.
        captureBody: {
            mode: 'off' as CaptureBodyMode,
            maxSizeBytes: 8 * 1024, // truncate bodies larger than this
        },
        filters: [] as any[], // future feature, currently not used
    },
    metrics: {
        mainMetricReaderOptions: {
            exportIntervalMillis: 1000 * 60, // 60 seconds
            metricProducers: [] as MetricProducer[], // experimental by OpenTelemetry, not used by OAS-TLM yet
        },
        extraReaders: [] as IMetricReader[], // e.g. [new PrometheusExporter()]
        extraViews: [] as ViewOptions[], // e.g. [new MetricView({ name: 'my_metric', labels: ['env'] })]
        memoryExporter: {
            enabled: true,
            retentionTimeSeconds: 60 * 60, // 1 hour
        },
        filters: [] as any[], // future feature, currently not used
        // Records a lightweight counter of requests matching/not matching a documented OpenAPI
        // operation (oas.schema.compliance). This is the one metric OTel's own auto-instrumentations
        // can't produce, since it requires knowledge of the loaded OpenAPI spec.
        recordSchemaCompliance: true,
    },
    logs: {
        extraExporters: [] as LogRecordExporter[], // e.g. [new ConsoleLogRecordExporter()]
        extraProcessors: [] as LogRecordProcessor[], // e.g. [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())]
        memoryExporter: {
            enabled: true,
            retentionTimeSeconds: 60 * 60, // 1 hour
        },
        filters: [] as any[], // future feature, currently not used
    },
    plugins: {
        enabled: true, // future feature
        extraPlugins: [] as PluginResource[],// future feature
    },
    instrumentations: [] as any[],
}

// Helper to get an environment variable with optional transform
const getParsedEnvVar = (envKey: string, transform?: (rawValue: string) => any) => {
    const rawValue = process.env[envKey];
    // Treat undefined and "" in env as undefined (skip)
    if (rawValue === undefined || rawValue === "") return undefined;
    if (typeof transform === 'function') {
        return transform(rawValue);
    }
    return rawValue;
};

export const getConfig = (userConfig?: UserConfig, fallbackConfig: OasTlmConfig = defaultConfig, envConfig: DeepPartial<OasTlmConfig> = loadEnv()) => {
    // environment variables OVERRIDE userConfig OVERRIDE fallbackConfig
    return merge({}, fallbackConfig, userConfig, envConfig);
};