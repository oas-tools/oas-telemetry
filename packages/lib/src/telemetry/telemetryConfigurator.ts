import { OasTlmConfig } from '../config/config.types.js';
import { BatchSpanProcessor, SimpleSpanProcessor, SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { dynamicMultiLogProcessor, dynamicMultiSpanProcessor, inMemoryDbLogExporter, inMemoryDbMetricExporter, inMemoryDbSpanExporter, multiLogExporter, multiSpanExporter, oasTelemetryResource, pluginSpanExporter } from './telemetryRegistry.js';
import logger from '../utils/logger.js';
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from './custom-implementations/wrappers.js';
import { BatchLogRecordProcessor, LogRecordProcessor, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { bootEnvVariables } from '../config/bootConfig.js';


export const configureTelemetry: (oasTlmConfig: OasTlmConfig) => void = (oasTlmConfig) => {
    configureTraces(oasTlmConfig);
    configureMetrics(oasTlmConfig);
    configureLogs(oasTlmConfig);
    logger.info("✅ Telemetry configured successfully. All exporters are ready");
}

function configureTraces(oasTlmConfig: OasTlmConfig): void {
    // TRACES CONFIGURATION
    // [OT]Provider -> [OT]SpanProcessor(multiSpan) -> n Processors(eg mainProcessor, extra) -> 1 SpanExporter
    inMemoryDbSpanExporter.baseUrl = oasTlmConfig.general.baseUrl; // TODO this will be done with filters
    inMemoryDbSpanExporter.retentionTimeInSeconds = oasTlmConfig.traces.memoryExporter.retentionTimeSeconds;
    inMemoryDbSpanExporter.setEnabledValue(oasTlmConfig.traces.memoryExporter.enabled);
    pluginSpanExporter.setEnabledValue(oasTlmConfig.plugins.enabled);
    const mainExporter: EnablerMultiSpanExporter = multiSpanExporter
    let mainProcessor: SpanProcessor = new BatchSpanProcessor(mainExporter);
    if (bootEnvVariables.OASTLM_BOOT_ENV !== 'production') {
        logger.info('Not in production, using SimpleSpanProcessor for traces');
        mainProcessor = new SimpleSpanProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbSpanExporter); // Main exporter have at least the in-memory exporter used by the traces controller
    mainExporter.addExporters(pluginSpanExporter)
    mainExporter.addExporters(oasTlmConfig.traces.extraExporters);
    dynamicMultiSpanProcessor.addProcessors(mainProcessor);
    dynamicMultiSpanProcessor.addProcessors(oasTlmConfig.traces.extraProcessors);

}



function configureLogs(oasTlmConfig: OasTlmConfig): void {
    // LOGS CONFIGURATION
    // [OT]LoggerProvider -> [OT]LogRecordProcessor(multiLogProcessor) -> n Processors(eg mainProcessor, extra) -> 1 LogExporter
    
    inMemoryDbLogExporter.setEnabledValue(oasTlmConfig.logs.memoryExporter.enabled);
    inMemoryDbLogExporter.retentionTimeInSeconds = oasTlmConfig.logs.memoryExporter.retentionTimeSeconds;
    const mainExporter: EnablerMultiLogExporter = multiLogExporter
    let mainProcessor: LogRecordProcessor = new BatchLogRecordProcessor(mainExporter);
    if (bootEnvVariables.OASTLM_BOOT_ENV !== 'production') {
        logger.info('Not in production, using SimpleLogRecordProcessor for logs');
        mainProcessor = new SimpleLogRecordProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbLogExporter); // Main exporter have at least the in-memory exporter used by the logs controller
    mainExporter.addExporters(oasTlmConfig.logs.extraExporters);
    dynamicMultiLogProcessor.addProcessors(mainProcessor);
    dynamicMultiLogProcessor.addProcessors(oasTlmConfig.logs.extraProcessors);
}

function configureMetrics(oasTlmConfig: OasTlmConfig): void {
    // METRICS CONFIGURATION
    // [CUSTOM]MeterProvider -> n [OTel]MetricReader -> (0-1) MetricExporter (only if push-based reader)
    inMemoryDbMetricExporter.setEnabledValue(oasTlmConfig.metrics.memoryExporter.enabled);
    inMemoryDbMetricExporter.retentionTimeInSeconds = oasTlmConfig.metrics.memoryExporter.retentionTimeSeconds;
    const mainReader = new PeriodicExportingMetricReader({
        exporter: inMemoryDbMetricExporter,
        exportIntervalMillis: oasTlmConfig.metrics.mainMetricReaderOptions.exportIntervalMillis,
        metricProducers: oasTlmConfig.metrics.mainMetricReaderOptions.metricProducers
    });
    const meterProvider = new MeterProvider({
        resource: oasTelemetryResource,
        readers: [mainReader, ...oasTlmConfig.metrics.extraReaders],
    });
    const hostMetrics = new HostMetrics({ meterProvider: meterProvider });

    // AFTER adding all readers, start the instrumentations
    hostMetrics.start();

}