import merge from 'lodash.merge';
import { OasTlmConfig, DeepPartial, UserConfig } from './config.types.js';
import { BufferConfig, SpanExporter, SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { IMetricReader, MetricProducer } from '@opentelemetry/sdk-metrics';
import { LogRecordExporter, LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { type PluginResource } from '../types/index.js';
import { type ViewOptions } from '@opentelemetry/sdk-metrics/build/src/view/View.js';

// Environment-level config (highest priority)
// If NOT defined, it should return UNDEFINED so it dose not override the userConfig or defaultConfig.
// Thats why we use getParsedEnvVar with no default value.
const loadEnv = (): DeepPartial<OasTlmConfig> => {

    return {
        general: {
            specFileName: getParsedEnvVar("OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME"),
            // spec Not settable via env
        },
        storage: {
            path: getParsedEnvVar("OASTLM_CONFIG_STORAGE_PATH"),
            loadFromStart: getParsedEnvVar("OASTLM_CONFIG_STORAGE_LOAD_FROM_START", (v) => v === "true"),
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
                // filters NOT settable via env
            }
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
            }
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
    storage: {
        path: null as string | null, // Optional disk persistence directory.
        loadFromStart: true, // If true, import persisted telemetry into memory at startup.
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