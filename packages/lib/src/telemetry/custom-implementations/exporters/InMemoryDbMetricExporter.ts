import { ExportResultCode } from '@opentelemetry/core';
import { PushMetricExporter, ResourceMetrics, ScopeMetrics } from '@opentelemetry/sdk-metrics';
import { Enabler } from '../wrappers.js';
import logger from '../../../utils/logger.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';
import { Resource } from '@opentelemetry/resources';
import { rawToOtel } from '../metrics/tsdb/utils.js';
import { SeriesRegistry } from '../metrics/tsdb/SeriesRegistry.js';
import { FindMetricsRequest } from '../metrics/tsdb/types.js';

export interface ExporterConfig {
    retentionTimeInSeconds?: number;
    chunkSize?: number;
    maxChunks?: number;
}

/**
 * In-Memory TSDB Metric Exporter
 * Series identified by: scope + metricName + attributes
 */
export class InMemoryDbMetricExporter extends Enabler implements PushMetricExporter {

    private static readonly DEFAULT_CONFIG: ExporterConfig = {
        retentionTimeInSeconds: 3600,
        chunkSize: 120,
        maxChunks: 60
    };

    private readonly registry: SeriesRegistry;
    private readonly config: ExporterConfig;
    private cachedResource: Resource | null = null;
    private _initialized = false;

    private _ensureInitialized(): void {
        if (this._initialized) return;
        this._initialized = true;
        logger.info(`[MetricExporter] In-memory storage created`);
    }

    public get rawDataDB(): any[] {
        // For debug/inspection only - metrics are stored in registry chunks
        const stats = this.registry.getStats();
        return stats.totalSamples > 0 ? [`[${stats.totalSamples} samples in registry]`] : [];
    }

    constructor(config?: Partial<ExporterConfig>) {
        super();
        this.config = { ...InMemoryDbMetricExporter.DEFAULT_CONFIG, ...config };
        this.registry = new SeriesRegistry(this.config.chunkSize!, this.config.maxChunks!);

        this._startCleanupJob();
    }

    export(resourceMetrics: ResourceMetrics, resultCallback: any) {
        this._ensureInitialized();
        try {
            // Cache resource (unique per exporter instance)
            if (!this.cachedResource) {
                this.cachedResource = resourceMetrics.resource;
            }

            const scopeMetrics = resourceMetrics.scopeMetrics;

            // Broadcast to plugins
            scopeMetrics?.forEach((metric: any) => {
                pluginService.broadcastMetric(metric);
            });

            // Store if enabled - use new storeScopeMetrics method
            if (this.isEnabled() && scopeMetrics) {
                this.registry.storeScopeMetrics(scopeMetrics);
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

    reset() {
        this._ensureInitialized();
        this.registry.reset();
        logger.info(`[MetricExporter] Reset - all metrics cleared`);
    }

    forceFlush() {
        return Promise.resolve();
    }

    getCachedResource(): Resource | null {
        return this.cachedResource;
    }

    public set retentionTimeInSeconds(value: number) {
        this.config.retentionTimeInSeconds = value;
        logger.info(`Retention time set to ${value} seconds`);
    }

    public get retentionTimeInSeconds(): number {
        return this.config.retentionTimeInSeconds!;
    }

    getStats() {
        this._ensureInitialized();
        return this.registry.getStats();
    }

    private _startCleanupJob() {
        setInterval(() => {
            const retentionTimeNs = this.config.retentionTimeInSeconds! * 1_000_000_000;
            const result = this.registry.evictOldData(retentionTimeNs);

            if (result.evictedChunks > 0 || result.evictedSeries > 0) {
                logger.debug(`Cleanup: evicted ${result.evictedChunks} chunks, ${result.evictedSeries} series`);
            }
        }, 5000);
    }

    /**
     * Find metrics by scope+metric queries with filters
     * Supports both raw and otel formats
     */
    find(request: FindMetricsRequest): { results: any[] } {
        this._ensureInitialized();
        const format = request.format || 'raw';

        // Get raw results from registry using new unified query method
        const rawResults = this.registry.query(
            request.scopeMetrics,
            request.from,
            request.to
        );

        // Convert format if needed
        if (format === 'otel') {
            return { results: rawToOtel(rawResults) };
        }

        return { results: rawResults };
    }

    /**
     * Export all metrics as line-delimited JSON (one chunk per line)
     */
    exportToLineDelimitedJson(): string {
        return this.registry.serializeToLineDelimitedJson();
    }

    /**
     * Import metrics from line-delimited JSON format
     */
    importFromLineDelimitedJson(lineDelimitedJsonData: string): void {
        this.registry.deserializeFromLineDelimitedJson(lineDelimitedJsonData);
    }

    /**
 * Insert metrics in OpenTelemetry (OTEL) format directly into the registry
 * @param scopeMetrics Array of ScopeMetrics (OTEL format)
 */
    insertOtel(scopeMetrics: ScopeMetrics[]): void {
        this._ensureInitialized();
        // Store only in registry (chunks) - no duplication
        if (this.isEnabled()) {
            this.registry.storeScopeMetrics(scopeMetrics);
        }
    }

    /**
     * Insert metrics in raw format (MetricQueryResult[]), converts to OTEL and delegates to insertOtel
     * @param rawScopeMetrics Array of MetricQueryResult (raw format)
     */
    insertRaw(rawScopeMetrics: any[]): void {
        const otelScopeMetrics = rawToOtel(rawScopeMetrics);
        this.insertOtel(otelScopeMetrics);
    }
}

