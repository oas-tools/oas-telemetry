import { OasTlmConfig } from '../config/config.types.js';
import { SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { dynamicMultiLogProcessor, dynamicMultiSpanProcessor, inMemoryDbLogExporter, inMemoryDbMetricExporter, inMemoryDbSpanExporter, instrumentations, multiLogExporter, multiSpanExporter, oasTelemetryResource, setGetMeter, setGetTracer, setGetLogger } from './telemetryRegistry.js';
import logger from '../utils/logger.js';
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from './custom-implementations/wrappers.js';
import { LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeTracerProvider, BatchSpanProcessor as TraceBatchSpanProcessor, SimpleSpanProcessor as TraceSimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { LoggerProvider, BatchLogRecordProcessor as LogBatchLogRecordProcessor, SimpleLogRecordProcessor as LogSimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';

import { bootEnvVariables } from '../config/bootConfig.js';
import { pluginService } from '../tlm-plugin/pluginService.js';


export function configureTelemetry(oasTlmConfig: OasTlmConfig) {
    logger.info("🚀 Configuring Telemetry...");
    configurePlugins(oasTlmConfig);

    const tracerProvider = configureTraces(oasTlmConfig);
    const meterProvider = configureMetrics(oasTlmConfig);
    const loggerProvider = configureLogs(oasTlmConfig);

    setGetMeter((name: string, version?: string, options?: any) => meterProvider.getMeter(name, version, options));
    setGetTracer((name: string, version?: string, options?: any) => tracerProvider.getTracer(name, version, options) as any);
    setGetLogger((name: string, version?: string, options?: any) => loggerProvider.getLogger(name, version, options));

    // Add user already registered instrumentations
    if (oasTlmConfig.instrumentations?.alreadyRegistered) {
        oasTlmConfig.instrumentations.alreadyRegistered.forEach((inst) => {
            instrumentations.push(inst);
        });
    }
    // --- Assign providers to instrumentations ---
    instrumentations.forEach((inst) => {
        if (typeof (inst as any).setMeterProvider === 'function') {
            (inst as any).setMeterProvider(meterProvider);
        }
        if (typeof (inst as any).setTracerProvider === 'function') {
            (inst as any).setTracerProvider(tracerProvider);
        }
        if (typeof (inst as any).setLoggerProvider === 'function') {
            (inst as any).setLoggerProvider(loggerProvider);
        }
    });


    logger.info("✅ Telemetry configured successfully. All exporters are ready");

    // Los helpers ahora están en telemetryRegistry
    return {};
}

function configurePlugins(oasTlmConfig: OasTlmConfig): void {
    pluginService.enabled = oasTlmConfig.plugins.enabled;
}

function configureTraces(oasTlmConfig: OasTlmConfig): NodeTracerProvider {
    // TRACES CONFIGURATION
    // [OT]Provider -> [OT]SpanProcessor(multiSpan) -> n Processors(eg mainProcessor, extra) -> 1 SpanExporter
    inMemoryDbSpanExporter.baseUrl = oasTlmConfig.general.baseUrl; // TODO this will be done with filters
    inMemoryDbSpanExporter.retentionTimeInSeconds = oasTlmConfig.traces.memoryExporter.retentionTimeSeconds;
    inMemoryDbSpanExporter.setEnabledValue(oasTlmConfig.traces.memoryExporter.enabled);
    const mainExporter: EnablerMultiSpanExporter = multiSpanExporter
    let mainProcessor: SpanProcessor = new TraceBatchSpanProcessor(mainExporter);
    if (bootEnvVariables.OASTLM_BOOT_ENV !== 'production') {
        logger.info('Not in production, using SimpleSpanProcessor for traces');
        mainProcessor = new TraceSimpleSpanProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbSpanExporter); // Main exporter have at least the in-memory exporter used by the traces controller
    mainExporter.addExporters(oasTlmConfig.traces.extraExporters);
    dynamicMultiSpanProcessor.addProcessors(mainProcessor);
    dynamicMultiSpanProcessor.addProcessors(oasTlmConfig.traces.extraProcessors);

        const tracerProvider = new NodeTracerProvider({
        resource: oasTelemetryResource,
        spanProcessors: [dynamicMultiSpanProcessor]
    });
    return tracerProvider;

}

function configureMetrics(oasTlmConfig: OasTlmConfig): MeterProvider {
    // METRICS CONFIGURATION
    inMemoryDbMetricExporter.setEnabledValue(oasTlmConfig.metrics.memoryExporter.enabled);
    inMemoryDbMetricExporter.retentionTimeInSeconds = oasTlmConfig.metrics.memoryExporter.retentionTimeSeconds;
    const mainReader = new PeriodicExportingMetricReader({
        exporter: inMemoryDbMetricExporter,
        exportIntervalMillis: oasTlmConfig.metrics.mainMetricReaderOptions.exportIntervalMillis,
        metricProducers: oasTlmConfig.metrics.mainMetricReaderOptions.metricProducers
    });
    const meterProvider = new MeterProvider({
        resource: oasTelemetryResource,
        readers: [mainReader, ...(oasTlmConfig.metrics.extraReaders || [])],
        views: oasTlmConfig.metrics.extraViews || []
    });
    return meterProvider;
}


function configureLogs(oasTlmConfig: OasTlmConfig): LoggerProvider {
    // LOGS CONFIGURATION
    // [OT]LoggerProvider -> [OT]LogRecordProcessor(multiLogProcessor) -> n Processors(eg mainProcessor, extra) -> 1 LogExporter
    
    inMemoryDbLogExporter.setEnabledValue(oasTlmConfig.logs.memoryExporter.enabled);
    inMemoryDbLogExporter.retentionTimeInSeconds = oasTlmConfig.logs.memoryExporter.retentionTimeSeconds;
    const mainExporter: EnablerMultiLogExporter = multiLogExporter
    let mainProcessor: LogRecordProcessor = new LogBatchLogRecordProcessor(mainExporter);
    if (bootEnvVariables.OASTLM_BOOT_ENV !== 'production') {
        logger.info('Not in production, using SimpleLogRecordProcessor for logs');
        mainProcessor = new LogSimpleLogRecordProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbLogExporter); // Main exporter have at least the in-memory exporter used by the logs controller
    mainExporter.addExporters(oasTlmConfig.logs.extraExporters);
    dynamicMultiLogProcessor.addProcessors(mainProcessor);
    dynamicMultiLogProcessor.addProcessors(oasTlmConfig.logs.extraProcessors);

        const loggerProvider = new LoggerProvider({
        resource: oasTelemetryResource,
        processors: [dynamicMultiLogProcessor]
    });
    return loggerProvider;
}
