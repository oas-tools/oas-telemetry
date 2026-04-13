import { BatchLogRecordProcessor as LogBatchLogRecordProcessor, LogRecordProcessor, SimpleLogRecordProcessor as LogSimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PushMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SpanProcessor, BatchSpanProcessor as TraceBatchSpanProcessor, SimpleSpanProcessor as TraceSimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OasTlmConfig } from '../config/config.types.js';
import logger from '../utils/logger.js';
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from './custom-implementations/wrappers.js';
import { inMemoryDbLogExporter, inMemoryDbMetricExporter, inMemoryDbSpanExporter, instrumentations, multiLogExporter, multiSpanExporter, oasTelemetryResource } from './telemetryRegistry.js';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { bootEnvVariables } from '../config/bootConfig.js';
import { pluginService } from '../tlm-plugin/pluginService.js';
import { DiskTraceExporter } from './custom-implementations/exporters/DiskTraceExporter.js';
import { DiskLogExporter } from './custom-implementations/exporters/DiskLogExporter.js';
import { DiskMetricExporter } from './custom-implementations/exporters/DiskMetricExporter.js';
import { MultiMetricExporter } from './custom-implementations/exporters/MultiMetricExporter.js';
import { DiskImporter } from './persistence/DiskImporter.js';
import { importTracesToMemory } from '../tlm-trace/traceService.js';
import { importLogsToMemory } from '../tlm-log/logService.js';
import { importMetricsToMemory } from '../tlm-metric/metricsService.js';

export function configureTelemetry(oasTlmConfig: OasTlmConfig) {
    
    logger.info("🚀 Configuring Telemetry...");
    configureStorage(oasTlmConfig);
     
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
    logger.info("✅ Node SDK started with telemetry configuration");

    if (oasTlmConfig.storage.path && oasTlmConfig.storage.loadFromStart) {
        scheduleStartupImports(oasTlmConfig.storage.path);
    } else if (oasTlmConfig.storage.path && !oasTlmConfig.storage.loadFromStart) {
        logger.info(`[DiskImporter] Startup import skipped by storage.loadFromStart=false. Path: ${oasTlmConfig.storage.path}`);
    }

    return true;
}

function configureStorage(oasTlmConfig: OasTlmConfig): void {
    const path = oasTlmConfig.storage.path;
    oasTlmConfig.storage.path = typeof path === 'string' && path.trim().length > 0
        ? path.trim()
        : null;
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
        logger.info('Not in production, using SimpleSpanProcessor for traces');
        mainProcessor = new TraceSimpleSpanProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbSpanExporter); // Main exporter have at least the in-memory exporter used by the traces controller

    if (oasTlmConfig.storage.path) {
        mainExporter.addExporters(new DiskTraceExporter({ directoryPath: oasTlmConfig.storage.path }));
        logger.info(`[TraceDiskExporter] Enabled at: ${oasTlmConfig.storage.path}`);
    }

    mainExporter.addExporters(oasTlmConfig.traces.extraExporters);
    return mainProcessor;
}

function configureMetrics(oasTlmConfig: OasTlmConfig) {
    // METRICS CONFIGURATION
    inMemoryDbMetricExporter.setEnabledValue(oasTlmConfig.metrics.memoryExporter.enabled);
    inMemoryDbMetricExporter.retentionTimeInSeconds = oasTlmConfig.metrics.memoryExporter.retentionTimeSeconds;
    const metricExporters: PushMetricExporter[] = [inMemoryDbMetricExporter];

    if (oasTlmConfig.storage.path) {
        metricExporters.push(new DiskMetricExporter({ directoryPath: oasTlmConfig.storage.path }));
        logger.info(`[MetricDiskExporter] Enabled at: ${oasTlmConfig.storage.path}`);
    }

    const mainReader = new PeriodicExportingMetricReader({
        exporter: new MultiMetricExporter(metricExporters),
        exportIntervalMillis: oasTlmConfig.metrics.mainMetricReaderOptions.exportIntervalMillis,
        metricProducers: oasTlmConfig.metrics.mainMetricReaderOptions.metricProducers
    });
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
        logger.info('Not in production, using SimpleLogRecordProcessor for logs');
        mainProcessor = new LogSimpleLogRecordProcessor(mainExporter);
    }
    mainExporter.addExporters(inMemoryDbLogExporter); // Main exporter have at least the in-memory exporter used by the logs controller

    if (oasTlmConfig.storage.path) {
        mainExporter.addExporters(new DiskLogExporter({ directoryPath: oasTlmConfig.storage.path }));
        logger.info(`[LogDiskExporter] Enabled at: ${oasTlmConfig.storage.path}`);
    }

    mainExporter.addExporters(oasTlmConfig.logs.extraExporters);
    return mainProcessor;
}

function scheduleStartupImports(storagePath: string): void {
    setTimeout(async () => {
        try {
            await runTimedImport(
                'TraceDiskImport',
                storagePath,
                new DiskImporter({ directoryPath: storagePath }),
                async (spans: any[]) => {
                await importTracesToMemory(spans);
                }
            );

            await runTimedImport(
                'LogDiskImport',
                storagePath,
                new DiskImporter({ directoryPath: storagePath, segmentPrefix: 'logs' }),
                async (logs: any[]) => {
                    await importLogsToMemory(logs);
                }
            );

            await runTimedImport(
                'MetricDiskImport',
                storagePath,
                new DiskImporter({ directoryPath: storagePath, segmentPrefix: 'metrics' }),
                async (scopeMetrics: any[]) => {
                    importMetricsToMemory(scopeMetrics, { format: 'otel' });
                }
            );
        } catch (error: any) {
            logger.error(`[DiskImporter] Startup import sequence failed: ${error?.message || error}`);
        }
    }, 0);
}

async function runTimedImport(
    label: string,
    storagePath: string,
    importer: DiskImporter,
    onBatch: (records: any[]) => Promise<void>
): Promise<void> {
    const startedAt = Date.now();
    logger.info(`[${label}] Startup import started. Path: ${storagePath}`);

    try {
        const result = await importer.import(onBatch);
        logger.info(`[${label}] Startup import completed. Files: ${result.segmentFilesRead}, imported records: ${result.importedRecords}, failed frames: ${result.failedFrames}`);
    } catch (error: any) {
        logger.error(`[${label}] Startup import failed: ${error?.message || error}`);
    } finally {
        const elapsedMs = Date.now() - startedAt;
        logger.info(`[${label}] Startup import finished in ${elapsedMs}ms`);
    }
}
