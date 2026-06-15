import { BatchLogRecordProcessor as LogBatchLogRecordProcessor, LogRecordProcessor, SimpleLogRecordProcessor as LogSimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PushMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SpanProcessor, BatchSpanProcessor as TraceBatchSpanProcessor, SimpleSpanProcessor as TraceSimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OasTlmConfig } from '../config/config.types.js';
import logger from '../utils/logger.js';
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from './custom-implementations/wrappers.js';
import { inMemoryDbLogExporter, inMemoryDbMetricExporter, inMemoryDbSpanExporter, instrumentations, multiLogExporter, multiSpanExporter, oasTelemetryResource, setMainMetricReader, setCustomFilterMetricExporter } from './telemetryRegistry.js';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { bootEnvVariables } from '../config/bootConfig.js';
import { pluginService } from '../tlm-plugin/pluginService.js';
import { MultiMetricExporter } from './custom-implementations/exporters/MultiMetricExporter.js';
import { DynamicPeriodicMetricReader } from './custom-implementations/metrics/DynamicPeriodicMetricReader.js';
import { FilterMetricExporter } from './custom-implementations/exporters/FilterMetricExporter.js';

export function configureTelemetry(oasTlmConfig: OasTlmConfig) {

    logger.info("[TelemetryConfigurator] Configuring telemetry...");

    inMemoryDbSpanExporter.initializeStorage();
    inMemoryDbLogExporter.initializeStorage();
    inMemoryDbMetricExporter.initializeStorage();

    if (oasTlmConfig.instrumentations) {
        instrumentations.push(...oasTlmConfig.instrumentations);
    }

    configurePlugins(oasTlmConfig);
    const mainTraceProcessor = configureTraces(oasTlmConfig);
    const mainMetricReader = configureMetrics(oasTlmConfig);
    const mainLogProcessor = configureLogs(oasTlmConfig);

    const sdk = new NodeSDK({
        instrumentations: instrumentations,
        resource: oasTelemetryResource,
        traceExporter: inMemoryDbSpanExporter,
        spanProcessors: [mainTraceProcessor, ...oasTlmConfig.traces.extraProcessors || []],
        metricReaders: [mainMetricReader, ...(oasTlmConfig.metrics.extraReaders || [])],
        logRecordProcessors: [mainLogProcessor, ...oasTlmConfig.logs.extraProcessors || []],
    });
    sdk.start();
    logger.info("[TelemetryConfigurator] Node SDK started with telemetry configuration");

    return true;
}

function configurePlugins(oasTlmConfig: OasTlmConfig): void {
    pluginService.enabled = oasTlmConfig.plugins.enabled;
}

function configureTraces(oasTlmConfig: OasTlmConfig) {
    // TRACES CONFIGURATION
    // [OT]Provider -> [OT]SpanProcessor(multiSpan) -> n Processors(eg mainProcessor, extra) -> 1 SpanExporter
    inMemoryDbSpanExporter.retentionTimeInSeconds = oasTlmConfig.traces.memoryExporter.retentionTimeSeconds;
    inMemoryDbSpanExporter.setEnabledValue(oasTlmConfig.traces.memoryExporter.enabled);
    const mainExporter: EnablerMultiSpanExporter = multiSpanExporter
    mainExporter.clearExporters();
    let mainProcessor: SpanProcessor = new TraceBatchSpanProcessor(mainExporter);
    if (bootEnvVariables.OASTLM_BOOT_ENV !== 'production') {
        logger.info('[TelemetryConfigurator] Not in production, using SimpleSpanProcessor for traces');
        mainProcessor = new TraceSimpleSpanProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbSpanExporter); // Main exporter have at least the in-memory exporter used by the traces controller

    mainExporter.addExporters(oasTlmConfig.traces.extraExporters);
    return mainProcessor;
}

function configureMetrics(oasTlmConfig: OasTlmConfig) {
    // METRICS CONFIGURATION
    inMemoryDbMetricExporter.setEnabledValue(oasTlmConfig.metrics.memoryExporter.enabled);
    inMemoryDbMetricExporter.retentionTimeInSeconds = oasTlmConfig.metrics.memoryExporter.retentionTimeSeconds;

    const userExporters = oasTlmConfig.metrics.extraExporters || [];
    const userExportersMultiExporter = new MultiMetricExporter(userExporters);
    const filterExporter = new FilterMetricExporter(userExportersMultiExporter);
    setCustomFilterMetricExporter(filterExporter);

    const mainExporter = new MultiMetricExporter([inMemoryDbMetricExporter, filterExporter]);

    const mainReader = new DynamicPeriodicMetricReader({
        exporter: mainExporter,
        exportIntervalMillis: oasTlmConfig.metrics.mainMetricReaderOptions.exportIntervalMillis,
        metricProducers: oasTlmConfig.metrics.mainMetricReaderOptions.metricProducers
    });
    setMainMetricReader(mainReader);
    return mainReader;
}

function configureLogs(oasTlmConfig: OasTlmConfig) {
    // LOGS CONFIGURATION
    // [OT]LoggerProvider -> [OT]LogRecordProcessor(multiLogProcessor) -> n Processors(eg mainProcessor, extra) -> 1 LogExporter

    inMemoryDbLogExporter.setEnabledValue(oasTlmConfig.logs.memoryExporter.enabled);
    inMemoryDbLogExporter.retentionTimeInSeconds = oasTlmConfig.logs.memoryExporter.retentionTimeSeconds;
    const mainExporter: EnablerMultiLogExporter = multiLogExporter
    mainExporter.clearExporters();
    let mainProcessor: LogRecordProcessor = new LogBatchLogRecordProcessor(mainExporter);
    if (bootEnvVariables.OASTLM_BOOT_ENV !== 'production') {
        logger.info('[TelemetryConfigurator] Not in production, using SimpleLogRecordProcessor for logs');
        mainProcessor = new LogSimpleLogRecordProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbLogExporter); // Main exporter have at least the in-memory exporter used by the logs controller

    mainExporter.addExporters(oasTlmConfig.logs.extraExporters);
    return mainProcessor;
}
