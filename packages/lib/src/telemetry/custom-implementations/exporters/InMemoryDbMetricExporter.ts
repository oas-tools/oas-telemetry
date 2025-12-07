import { ExportResultCode } from '@opentelemetry/core';
import { applyNesting } from '../utils/circular.js';
import { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { Enabler } from '../wrappers.js';
import logger from '../../../utils/logger.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';
import { SeriesRegistry, MetricMetadata, QueryOptions } from './tsdb/index.js';

/**
 * Prometheus-style In-Memory TSDB Metric Exporter
 * Efficient storage using TypedArrays and chunk-based compression
 */
export class InMemoryDbMetricExporter extends Enabler implements PushMetricExporter {

    private readonly registry: SeriesRegistry;
    private _retentionTimeInSeconds: number;
    private readonly cleanupIntervalMs: number = 5000; // 5 seconds
    private _rawDataDB: any[] = [];
    public get rawDataDB(): any[] {
        return this._rawDataDB;
    }

    constructor(retentionTimeInSeconds: number = 3600, chunkSize: number = 120, maxChunks: number = 60) {
        super();
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        this.registry = new SeriesRegistry(chunkSize, maxChunks);
        this._startCleanupJob();
    }

    export(metrics: ResourceMetrics, resultCallback: any) {
        try {
            const scopeMetrics = metrics?.scopeMetrics;
            const cleanMetrics = applyNesting(scopeMetrics);
            
            // Broadcast to plugins (always happens, regardless of enabled state)
            cleanMetrics.forEach((metric: any) => {
                pluginService.broadcastMetric(metric);
                this._rawDataDB.push(metric);
            });
            
            // Store only if exporter is enabled
            if (this.isEnabled()) {
                this._storeSamples(cleanMetrics);
            }
            
            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            logger.error('Error exporting metrics\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting metrics\n' + error.message + '\n' + error.stack),
            });
        }
    }

    shutdown() {
        this._enabled = false;
        this.registry.reset();
        return this.forceFlush();
    }

    forceFlush() {
        return Promise.resolve();
    }

    /**
     * Find metrics with time range and metric name filters
     * @param query - { metricName?, metricKeys?, instrumentation?, labels?, startTimeNs?, endTimeNs?, format?: 'otel' | 'raw' }
     */
    find(query: any, callback: (err: any, docs: any[]) => void) {
        try {
            const options: QueryOptions = {};
            
            if (query && typeof query === 'object') {
                // Support metricName filter (single - legacy)
                if (query.metricName) {
                    options.metricKey = query.metricName;
                }
                // Support metricKeys filter (multiple - new)
                if (query.metricKeys && Array.isArray(query.metricKeys)) {
                    options.metricKeys = query.metricKeys;
                }
                // Support instrumentation filter
                if (query.instrumentation) {
                    options.instrumentation = query.instrumentation;
                }
                // Support labels filter
                if (query.labels) {
                    options.labels = query.labels;
                }
                // Time range in nanoseconds
                if (query.startTimeNs) {
                    options.startTime = query.startTimeNs;
                }
                if (query.endTimeNs) {
                    options.endTime = query.endTimeNs;
                }
                // Format: 'otel' (default) or 'raw' (efficient)
                if (query.format) {
                    options.format = query.format;
                }
            }

            // Use raw format if requested, otherwise OpenTelemetry format
            const result = options.format === 'raw' 
                ? this.registry.reconstructRaw(options)
                : this.registry.reconstruct(options);
                
            setTimeout(() => callback(null, result), 0);
        } catch (error: any) {
            logger.error('Error finding metrics:', error);
            setTimeout(() => callback(error, []), 0);
        }
    }

    reset() {
        this.registry.reset();
    }

    /**
     * Get all metrics
     * @param format - 'otel' (default) or 'raw' (efficient)
     */
    getFinishedMetrics(format: 'otel' | 'raw' = 'otel') {
        const result = format === 'raw' 
            ? this.registry.reconstructRaw()
            : this.registry.reconstruct();
        return { result, format };
    }

    /**
     * Manually insert metrics (used by REST API)
     */
    insert(metrics: any[], callback: (err: any, newDocs: any[]) => void): void {
        try {
            this._storeSamples(metrics);
            setTimeout(() => callback(null, metrics), 0);
        } catch (err) {
            logger.error('Error inserting metrics:', err);
            setTimeout(() => callback(err, []), 0);
        }
    }

    public set retentionTimeInSeconds(retentionTimeInSeconds: number) {
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        logger.info(`InMemoryDbMetricExporter retention time set to ${this._retentionTimeInSeconds} seconds`);
    }

    public get retentionTimeInSeconds(): number {
        return this._retentionTimeInSeconds;
    }

    /**
     * Get TSDB statistics
     */
    getStats() {
        return this.registry.getStats();
    }

    /**
     * Get unique metric names, optionally filtered by instrumentation
     */
    getMetricNames(instrumentation?: string): string[] {
        return this.registry.getUniqueMetricNames(instrumentation);
    }

    /**
     * Get unique instrumentations
     */
    getInstrumentations(): string[] {
        return this.registry.getUniqueInstrumentations();
    }

    /**
     * Get unique label keys
     */
    getLabelKeys(): string[] {
        return this.registry.getUniqueLabelKeys();
    }

    /**
     * Store samples in the TSDB
     */
    private _storeSamples(scopeMetrics: any[]): void {
        let totalStored = 0;
        
        scopeMetrics.forEach((scopeMetric: any) => {
            const scope = scopeMetric.scope || {};
            const metrics = scopeMetric.metrics || [];

            metrics.forEach((metric: any) => {
                const descriptor = metric.descriptor || {};
                const metricKey = `${scope.name || 'unknown'}:${descriptor.name || 'unknown'}`;

                const metadata: MetricMetadata = {
                    metricKey,
                    scope: { name: scope.name, version: scope.version },
                    descriptor,
                    aggregationTemporality: metric.aggregationTemporality,
                    dataPointType: metric.dataPointType,
                    isMonotonic: metric.isMonotonic,
                };

                const dataPoints = metric.dataPoints || [];
                
                dataPoints.forEach((dp: any) => {
                    const timestamp = dp.endTime[0] * 1_000_000_000 + dp.endTime[1];
                    const labels = dp.attributes || {};
                    
                    // Get or create series for this metric+labels combination
                    const series = this.registry.getOrCreateSeries(metricKey, labels, metadata);
                    
                    // Append sample to series
                    series.append(timestamp, dp.value);
                    totalStored++;
                });
            });
        });
        
        if (totalStored > 0) {
            logger.debug(`Stored ${totalStored} datapoints, total series: ${this.registry.size()}`);
        }
    }

    /**
     * Start periodic cleanup of old data
     */
    private _startCleanupJob() {
        setInterval(() => {
            const retentionTimeNs = this._retentionTimeInSeconds * 1_000_000_000;
            const result = this.registry.evictOldData(retentionTimeNs);

            if (result.evictedChunks > 0 || result.evictedSeries > 0) {
                logger.debug(
                    `TTL cleanup: evicted ${result.evictedChunks} chunks, ${result.evictedSeries} series`
                );
            }
        }, this.cleanupIntervalMs);
    }
}

