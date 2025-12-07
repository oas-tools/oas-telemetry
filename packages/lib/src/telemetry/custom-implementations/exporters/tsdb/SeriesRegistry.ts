/**
 * SeriesRegistry: Main storage for all time-series
 * Maps (metricKey + labelHash) -> Series
 */

import { Series } from './Series.js';
import { MetricMetadata, LabelSet, QueryOptions, ReconstructedMetric } from './types.js';
import { hashLabels } from './compression.js';

export class SeriesRegistry {
    private readonly series: Map<string, Series> = new Map();
    private readonly metricMetadata: Map<string, MetricMetadata> = new Map();
    private readonly chunkSize: number;
    private readonly maxChunks: number;

    constructor(chunkSize: number = 120, maxChunks: number = 60) {
        this.chunkSize = chunkSize;
        this.maxChunks = maxChunks;
    }

    /**
     * Get or create a series for the given metric and labels
     */
    getOrCreateSeries(
        metricKey: string,
        labels: Record<string, any>,
        metadata: MetricMetadata
    ): Series {
        const labelHash = hashLabels(labels);
        const seriesKey = `${metricKey}:${labelHash}`;

        let series = this.series.get(seriesKey);
        if (!series) {
            const labelSet: LabelSet = { hash: labelHash, labels };
            series = new Series(labelSet, metadata, this.chunkSize, this.maxChunks);
            this.series.set(seriesKey, series);
            
            // Store metadata
            if (!this.metricMetadata.has(metricKey)) {
                this.metricMetadata.set(metricKey, metadata);
            }
        }

        return series;
    }

    /**
     * Query series matching the given options
     */
    query(options: QueryOptions = {}): Series[] {
        const results: Series[] = [];

        for (const series of this.series.values()) {
            const metadata = series.getMetadata();
            
            // Filter by metric key (single)
            if (options.metricKey && metadata.metricKey !== options.metricKey) {
                continue;
            }

            // Filter by metric keys (multiple - OR logic)
            if (options.metricKeys && options.metricKeys.length > 0) {
                if (!options.metricKeys.includes(metadata.metricKey)) {
                    continue;
                }
            }

            // Filter by instrumentation (prefix before ':')
            if (options.instrumentation) {
                const parts = metadata.metricKey.split(':');
                if (parts.length < 2 || parts[0] !== options.instrumentation) {
                    continue;
                }
            }

            // Filter by labels
            if (options.labels) {
                const seriesLabels = series.getLabels();
                let matches = true;
                for (const [key, value] of Object.entries(options.labels)) {
                    if (seriesLabels[key] !== value) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) continue;
            }

            results.push(series);
        }

        return results;
    }

    /**
     * Get raw TSDB format
     */
    reconstructRaw(options: QueryOptions = {}): any[] {
        const matchingSeries = this.query(options);
        const metricMap = new Map<string, any>();

        for (const series of matchingSeries) {
            const metadata = series.getMetadata();
            const metricKey = metadata.metricKey;

            if (!metricMap.has(metricKey)) {
                metricMap.set(metricKey, {
                    metricKey,
                    metadata,
                    series: []
                });
            }

            const samples = series.querySamples(options.startTime, options.endTime);
            
            if (samples.length > 0) {
                metricMap.get(metricKey)!.series.push({
                    labels: series.getLabels(),
                    samples
                });
            }
        }

        return Array.from(metricMap.values());
    }

    /**
     * Reconstruct OpenTelemetry format from series
     * Groups by scope -> metric -> dataPoints (with different labels)
     */
    reconstruct(options: QueryOptions = {}): ReconstructedMetric[] {
        const matchingSeries = this.query(options);
        const scopeMap = new Map<string, any>();
        
        let totalDataPoints = 0;
        let seriesWithNoSamples = 0;

        for (const series of matchingSeries) {
            const metadata = series.getMetadata();
            const scopeKey = metadata.scope.name || 'unknown';
            const metricKey = metadata.metricKey;

            // Initialize scope if not exists
            if (!scopeMap.has(scopeKey)) {
                scopeMap.set(scopeKey, {
                    scope: metadata.scope,
                    metrics: new Map<string, any>()
                });
            }

            const scope = scopeMap.get(scopeKey)!;

            // Initialize metric if not exists
            if (!scope.metrics.has(metricKey)) {
                scope.metrics.set(metricKey, {
                    descriptor: metadata.descriptor,
                    aggregationTemporality: metadata.aggregationTemporality,
                    dataPointType: metadata.dataPointType,
                    isMonotonic: metadata.isMonotonic,
                    dataPoints: []
                });
            }

            const metric = scope.metrics.get(metricKey)!;

            // Add all samples from this series as dataPoints
            const samples = series.querySamples(options.startTime, options.endTime);
            
            for (const sample of samples) {
                const timeNs = sample.timestamp;
                const startSec = Math.floor(timeNs / 1_000_000_000);
                const startNano = timeNs % 1_000_000_000;

                metric.dataPoints.push({
                    attributes: series.getLabels(),
                    startTime: [startSec, startNano],
                    endTime: [startSec, startNano],
                    value: sample.value
                });
            }
        }

        // Convert maps to arrays
        return Array.from(scopeMap.values()).map(scope => ({
            scope: scope.scope,
            metrics: Array.from(scope.metrics.values())
        }));
    }

    /**
     * Evict old data based on retention time
     */
    evictOldData(retentionTimeNs: number): { evictedChunks: number; evictedSeries: number } {
        const thresholdTime = Date.now() * 1_000_000 - retentionTimeNs;
        let evictedChunks = 0;
        let evictedSeries = 0;

        const keysToDelete: string[] = [];

        for (const [key, series] of this.series.entries()) {
            evictedChunks += series.evictOldChunks(thresholdTime);

            // Remove empty series
            if (series.isEmpty()) {
                keysToDelete.push(key);
            }
        }

        // Clean up empty series
        for (const key of keysToDelete) {
            this.series.delete(key);
            evictedSeries++;
        }

        return { evictedChunks, evictedSeries };
    }

    /**
     * Get all metadata
     */
    getAllMetadata(): MetricMetadata[] {
        return Array.from(this.metricMetadata.values());
    }

    /**
     * Get unique metric names, optionally filtered by instrumentation
     */
    getUniqueMetricNames(instrumentation?: string): string[] {
        const allNames = Array.from(this.metricMetadata.keys());
        
        if (!instrumentation) {
            return allNames;
        }
        
        // Filter by instrumentation prefix
        return allNames.filter(name => name.startsWith(instrumentation + ':'));
    }

    /**
     * Get unique instrumentation names (part before ':' in metricKey)
     */
    getUniqueInstrumentations(): string[] {
        const instrumentations = new Set<string>();
        for (const metricKey of this.metricMetadata.keys()) {
            const parts = metricKey.split(':');
            if (parts.length > 1) {
                instrumentations.add(parts[0]);
            }
        }
        return Array.from(instrumentations);
    }

    /**
     * Get all unique label keys across all series
     */
    getUniqueLabelKeys(): string[] {
        const labelKeys = new Set<string>();
        for (const series of this.series.values()) {
            const labels = series.getLabels();
            Object.keys(labels).forEach(key => labelKeys.add(key));
        }
        return Array.from(labelKeys);
    }

    /**
     * Get statistics about the registry
     */
    getStats() {
        const seriesStats = Array.from(this.series.values()).map(s => s.getStats());
        const totalSamples = seriesStats.reduce((sum, s) => sum + s.samples, 0);
        const totalMemory = seriesStats.reduce((sum, s) => sum + s.memoryBytes, 0);
        const totalChunks = seriesStats.reduce((sum, s) => sum + s.chunks, 0);

        // Count unique metrics
        const uniqueMetrics = new Set(seriesStats.map(s => s.metricKey));

        return {
            totalMetrics: uniqueMetrics.size,
            totalSeries: this.series.size,
            totalSamples,
            memoryUsageBytes: totalMemory
        };
    }

    /**
     * Reset all data
     */
    reset(): void {
        this.series.clear();
        this.metricMetadata.clear();
    }

    /**
     * Get series count
     */
    size(): number {
        return this.series.size;
    }

    /**
     * Check if registry is empty
     */
    isEmpty(): boolean {
        return this.series.size === 0;
    }
}
