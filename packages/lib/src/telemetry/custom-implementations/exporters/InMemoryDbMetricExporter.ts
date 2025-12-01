import { ExportResultCode } from '@opentelemetry/core';
import dataStore from '@seald-io/nedb';
import { applyNesting } from '../utils/circular.js';
import { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { Enabler } from '../wrappers.js';
import logger from '../../../utils/logger.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';

/**
 * Optimized time-series structure:
 * - Metadata stored once per unique metric (by metricKey)
 * - Only datapoints grow over time (90% memory reduction)
 */
interface MetricMetadata {
    metricKey: string;
    descriptor: any;
    scope: any;
    aggregationTemporality?: number;
    dataPointType?: number;
    isMonotonic?: boolean;
}

interface CompactDataPoint {
    metricKey: string; // reference to metadata
    timestamp: number; // createdAt for TTL
    attributes: any;
    startTime: [number, number];
    endTime: [number, number];
    value: number | any;
    [key: string]: any; // for additional metric-specific fields
}

export class InMemoryDbMetricExporter extends Enabler implements PushMetricExporter {

    private _metadataStore: dataStore<MetricMetadata>; // Metadata (one per unique metric)
    private _metrics: dataStore<CompactDataPoint>; // Time-series datapoints only
    private _retentionTimeInSeconds: number;

    constructor(retentionTimeInSeconds: number = 3600) {
        super();
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        this._metadataStore = new dataStore();
        this._metadataStore.ensureIndex({ fieldName: 'metricKey', unique: true });
        this._metrics = new dataStore({ timestampData: true });
        this._metrics.ensureIndex({ fieldName: 'timestamp' }); // createdAt -> timestamp
        this._metrics.ensureIndex({ fieldName: 'metricKey' });
        this._startCleanupJob();
    }

    export(metrics: ResourceMetrics, resultCallback: any) {
        try {
            const scopeMetrics = metrics?.scopeMetrics;
            const cleanMetrics = applyNesting(scopeMetrics);
            cleanMetrics.forEach((metric: any) => {
                pluginService.broadcastMetric(metric);
            });
            
            // Insert only if exporter is enabled
            if (this.isEnabled()) {
                this._storeOptimized(cleanMetrics);
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
        this._metadataStore = new dataStore();
        this._metrics = new dataStore({ timestampData: true });
        return this.forceFlush();
    }

    forceFlush() {
        return Promise.resolve();
    }

    find(search: any, callback: any) {
        // Reconstruct full format from optimized storage
        this._reconstructMetrics(search, callback);
    }

    reset() {
        this._metadataStore = new dataStore();
        this._metrics = new dataStore({ timestampData: true });
    }

    getFinishedMetrics() {
        // Synchronous reconstruction for backward compatibility
        const allMetadata = this._metadataStore.getAllData();
        const allDataPoints = this._metrics.getAllData();
        return this._reconstructFromParts(allMetadata, allDataPoints);
    }

    /**
     * Inserts metrics into the in-memory database.
     * @param metrics - The metrics to insert.
     * @param callback - The callback to execute after insertion.
     */
    insert(metrics: any[], callback: (err: any, newDocs: any[]) => void): void {
        try {
            this._storeOptimized(metrics);
            setTimeout(() => callback(null, metrics), 0);
        } catch (err) {
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
     * Stores metrics in optimized format: metadata once + datapoints only
     */
    private _storeOptimized(scopeMetrics: any[]): void {
        const timestamp = Date.now();
        
        scopeMetrics.forEach((scopeMetric: any) => {
            const scope = scopeMetric.scope || {};
            const metrics = scopeMetric.metrics || [];

            metrics.forEach((metric: any) => {
                const descriptor = metric.descriptor || {};
                const metricKey = `${scope.name || 'unknown'}:${descriptor.name || 'unknown'}`;

                // Store or update metadata (upsert)
                const metadata: MetricMetadata = {
                    metricKey,
                    descriptor,
                    scope,
                    aggregationTemporality: metric.aggregationTemporality,
                    dataPointType: metric.dataPointType,
                    isMonotonic: metric.isMonotonic,
                };

                this._metadataStore.update(
                    { metricKey },
                    metadata,
                    { upsert: true },
                    (err) => {
                        if (err) logger.error('Metadata upsert error:', err);
                    }
                );

                // Store only datapoints (compact)
                const dataPoints = metric.dataPoints || [];
                const compactPoints: CompactDataPoint[] = dataPoints.map((dp: any) => ({
                    metricKey,
                    timestamp,
                    attributes: dp.attributes,
                    startTime: dp.startTime,
                    endTime: dp.endTime,
                    value: dp.value,
                    // Include any extra fields (for histograms, summaries, etc.)
                    ...(dp.bucketCounts && { bucketCounts: dp.bucketCounts }),
                    ...(dp.explicitBounds && { explicitBounds: dp.explicitBounds }),
                    ...(dp.sum && { sum: dp.sum }),
                    ...(dp.count && { count: dp.count }),
                    ...(dp.min && { min: dp.min }),
                    ...(dp.max && { max: dp.max }),
                }));

                if (compactPoints.length > 0) {
                    this._metrics.insert(compactPoints, (err) => {
                        if (err) logger.error('DataPoint insertion error:', err);
                    });
                }
            });
        });
    }

    /**
     * Reconstructs full metric format from optimized storage for queries
     */
    private _reconstructMetrics(query: any, callback: (err: any, docs: any[]) => void): void {
        // First, find matching datapoints
        const dataPointQuery = this._translateQuery(query);
        
        this._metrics.find(dataPointQuery, (err: any, dataPoints: CompactDataPoint[]) => {
            if (err) {
                return callback(err, []);
            }

            // Get unique metricKeys from results
            const metricKeys = [...new Set(dataPoints.map(dp => dp.metricKey))];
            
            if (metricKeys.length === 0) {
                return callback(null, []);
            }

            // Fetch metadata for these metrics
            this._metadataStore.find({ metricKey: { $in: metricKeys } }, (metaErr: any, metadataList: MetricMetadata[]) => {
                if (metaErr) {
                    return callback(metaErr, []);
                }

                const result = this._reconstructFromParts(metadataList, dataPoints);
                callback(null, result);
            });
        });
    }

    /**
     * Reconstructs full format from metadata + datapoints
     */
    private _reconstructFromParts(metadataList: MetricMetadata[], dataPoints: CompactDataPoint[]): any[] {
        // Group datapoints by metricKey
        const dpByMetric = new Map<string, CompactDataPoint[]>();
        dataPoints.forEach(dp => {
            if (!dpByMetric.has(dp.metricKey)) {
                dpByMetric.set(dp.metricKey, []);
            }
            dpByMetric.get(dp.metricKey)!.push(dp);
        });

        // Group by scope for output format
        const scopeMap = new Map<string, any>();

        metadataList.forEach(meta => {
            const scopeKey = meta.scope?.name || 'unknown';
            
            if (!scopeMap.has(scopeKey)) {
                scopeMap.set(scopeKey, {
                    scope: meta.scope,
                    metrics: [],
                });
            }

            const points = dpByMetric.get(meta.metricKey) || [];
            const fullDataPoints = points.map(dp => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { metricKey, timestamp, ...rest } = dp;
                return {
                    ...rest,
                    // Add createdAt for compatibility
                    createdAt: new Date(timestamp).toISOString(),
                };
            });

            if (fullDataPoints.length > 0) {
                scopeMap.get(scopeKey)!.metrics.push({
                    descriptor: meta.descriptor,
                    aggregationTemporality: meta.aggregationTemporality,
                    dataPointType: meta.dataPointType,
                    isMonotonic: meta.isMonotonic,
                    dataPoints: fullDataPoints,
                });
            }
        });

        // Convert to array and add timestamps
        return Array.from(scopeMap.values()).map(scopeMetric => ({
            ...scopeMetric,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));
    }

    /**
     * Translates query from full format to compact format (best effort)
     */
    private _translateQuery(query: any): any {
        if (!query || Object.keys(query).length === 0) {
            return {};
        }

        // Handle common query patterns
        const translated: any = {};

        // Copy timestamp queries directly
        if (query.createdAt) {
            translated.timestamp = query.createdAt;
        }
        if (query.timestamp) {
            translated.timestamp = query.timestamp;
        }

        // For nested queries like "scope.name", we need to query metadata first
        // For now, pass through other queries as-is (may need expansion)
        Object.keys(query).forEach(key => {
            if (!['createdAt', 'updatedAt'].includes(key)) {
                translated[key] = query[key];
            }
        });

        return translated;
    }

    private _startCleanupJob() {
        const interval = 1000;

        setInterval(() => {
            const expirationTimestamp = Date.now() - this._retentionTimeInSeconds * 1000;

            // Clean up old datapoints
            this._metrics.remove(
                { timestamp: { $lt: expirationTimestamp } },
                { multi: true },
                (err, numRemoved) => {
                    if (err) {
                        logger.error('Error in TTL cleanup:', err);
                    } else if (numRemoved > 0) {
                        logger.debug(`TTL cleanup: removed ${numRemoved} expired metric datapoints`);
                    }
                }
            );

            // Clean up metadata that has no datapoints (optional, keeps it tidy)
            this._metadataStore.find({}, (err: any, allMeta: MetricMetadata[]) => {
                if (err) return;
                
                allMeta.forEach(meta => {
                    this._metrics.count({ metricKey: meta.metricKey }, (countErr: any, count: number) => {
                        if (!countErr && count === 0) {
                            this._metadataStore.remove({ metricKey: meta.metricKey }, {}, (removeErr) => {
                                if (removeErr) logger.error('Error removing orphaned metadata:', removeErr);
                            });
                        }
                    });
                });
            });
        }, interval);
    }
}

