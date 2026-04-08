import { ExportResultCode } from '@opentelemetry/core';
import { PushMetricExporter, ResourceMetrics, ScopeMetrics } from '@opentelemetry/sdk-metrics';
import { Enabler } from '../wrappers.js';
import logger from '../../../utils/logger.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';
import { Resource } from '@opentelemetry/resources';
import { rawToOtel } from '../metrics/tsdb/utils.js';
import { SeriesRegistry } from '../metrics/tsdb/SeriesRegistry.js';
import { FindMetricsRequest } from '../metrics/tsdb/types.js';
import { getStoragePath } from '../utils/storagePath.js';
import fs from 'fs';

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
    private _storageFilePath: string | null = null;
    private _autoSaveInterval: NodeJS.Timeout | null = null;
    private _storageLogged = false;  // Track if we've logged storage info

    public get rawDataDB(): any[] {
        // For debug/inspection only - metrics are stored in registry chunks
        const stats = this.registry.getStats();
        return stats.totalSamples > 0 ? [`[${stats.totalSamples} samples in registry]`] : [];
    }

    constructor(config?: Partial<ExporterConfig>) {
        super();
        this.config = { ...InMemoryDbMetricExporter.DEFAULT_CONFIG, ...config };
        this.registry = new SeriesRegistry(this.config.chunkSize!, this.config.maxChunks!);
        
        // Load persisted metrics if disk storage is enabled
        this._storageFilePath = getStoragePath('metrics');
        if (this._storageFilePath) {
            this._loadMetricsFromDisk();
            this._startAutoSave();
        }
        
        this._startCleanupJob();
    }

    private _loadMetricsFromDisk(): void {
        if (!this._storageFilePath) return;
        
        try {
            if (fs.existsSync(this._storageFilePath)) {
                const ndjsonData = fs.readFileSync(this._storageFilePath, 'utf-8');
                this.registry.deserializeFromNDJSON(ndjsonData);
            }
        } catch {
            // Silently fail during boot
        }
    }

    private _startAutoSave(): void {
        if (!this._storageFilePath) return;
        
        // Save every 30 seconds
        this._autoSaveInterval = setInterval(() => {
            this._saveMetricsToDisk();
        }, 30000);
    }

    private _saveMetricsToDisk(): void {
        if (!this._storageFilePath) return;
        
        try {
            const ndjsonData = this.registry.serializeToNDJSON();
            fs.writeFileSync(this._storageFilePath, ndjsonData);
        } catch {
            // Silently fail to avoid logging issues
        }
    }

    export(resourceMetrics: ResourceMetrics, resultCallback: any) {
        // Log storage info on first export (when logger is ready)
        if (!this._storageLogged) {
            this._storageLogged = true;
            if (this._storageFilePath) {
                logger.info(`[MetricExporter] Disk storage enabled at: ${this._storageFilePath} (auto-save every 30s)`);
            } else {
                logger.info(`[MetricExporter] Using in-memory storage`);
            }
        }

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
        
        // Stop auto-save and save one final time
        if (this._autoSaveInterval) {
            clearInterval(this._autoSaveInterval);
            this._autoSaveInterval = null;
        }
        if (this._storageFilePath) {
            this._saveMetricsToDisk();
            logger.info(`[MetricExporter] Metrics saved to disk at shutdown`);
        }
        
        this.registry.reset();
        return this.forceFlush();
    }

    reset() {
        // Clear metrics but save empty state to disk
        this.registry.reset();
        
        if (this._storageFilePath) {
            this._saveMetricsToDisk();
            logger.info(`[MetricExporter] Reset - all metrics cleared and saved to disk`);
        } else {
            logger.info(`[MetricExporter] Reset - all metrics cleared`);
        }
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
     * Export all metrics to NDJSON format (one chunk per line)
     */
    exportToNDJSON(): string {
        return this.registry.serializeToNDJSON();
    }

    /**
     * Import metrics from NDJSON format
     */
    importFromNDJSON(ndjsonData: string): void {
        this.registry.deserializeFromNDJSON(ndjsonData);
    }

    /**
 * Insert metrics in OpenTelemetry (OTEL) format directly into the registry
 * @param scopeMetrics Array of ScopeMetrics (OTEL format)
 */
    insertOtel(scopeMetrics: ScopeMetrics[]): void {
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

