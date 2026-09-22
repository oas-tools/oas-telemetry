import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { SpanExporter } from '@opentelemetry/sdk-trace-node';
import { PushMetricExporter } from '@opentelemetry/sdk-metrics';
import { LogRecordExporter } from '@opentelemetry/sdk-logs';
import logger from '../../utils/logger.js';

// Auto-registers OTLP/HTTP exporters when a collector endpoint is configured via the standard
// OTel env vars, so users don't have to import/wire the OTLP exporters themselves .
//
// The exporter classes already read OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_<SIGNAL>_ENDPOINT
// (plus _HEADERS, _PROTOCOL, _TIMEOUT, _COMPRESSION, both generic and per-signal) themselves; we only
// decide here WHETHER to create one. Without this check, an exporter with no endpoint configured
// would default to http://localhost:4318 and fail every export interval.
const hasOtlpEndpoint = (signalEndpointVar: string): boolean => {
    return !!(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env[signalEndpointVar]);
};

export function getAutoOtlpTraceExporter(): SpanExporter | undefined {
    if (!hasOtlpEndpoint('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT')) return undefined;
    logger.info('[TelemetryConfigurator] OTLP endpoint detected, adding OTLP trace exporter');
    return new OTLPTraceExporter();
}

export function getAutoOtlpMetricExporter(): PushMetricExporter | undefined {
    if (!hasOtlpEndpoint('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT')) return undefined;
    logger.info('[TelemetryConfigurator] OTLP endpoint detected, adding OTLP metric exporter');
    return new OTLPMetricExporter();
}

export function getAutoOtlpLogExporter(): LogRecordExporter | undefined {
    if (!hasOtlpEndpoint('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT')) return undefined;
    logger.info('[TelemetryConfigurator] OTLP endpoint detected, adding OTLP log exporter');
    return new OTLPLogExporter();
}
