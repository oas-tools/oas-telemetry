import { Series } from './Series.js';
import { Chunk } from './Chunk.js';
import { ScopeMetricQuery, MetricMetadata, MetricQueryResult } from './types.js';
import { InstrumentationScope } from '@opentelemetry/core';
import { MetricDescriptor, ScopeMetrics } from '@opentelemetry/sdk-metrics';


/*
OTEL export = Resource (unchanged) + SCOPE METRICS
scopeMetrics: {
    scope: {name: library, version: 1.0.0},; //repeated for each metric
    metrics: [
        {
            //Metadata (Repeated for each dataPoint)
            descriptor: {name: metricName, unit, description, ...},
            aggregationTemporality,
            dataPointType,
            // Actual dataPoints are stored in Series
            dataPoints: []
        }
    ]
}
*/

// Import fs at top level for disk operations
import fs from 'fs';

export class SeriesRegistry {


    // Main storage
    private readonly series: Map<string, Series> = new Map(); // seriesId (scopeId:metricName:attributesId) -> Series
    // Cached repeated data
    private readonly scopes: Map<string, InstrumentationScope> = new Map(); // scopeId -> scope
    private readonly metricMetadataMap: Map<string, MetricMetadata> = new Map(); // "scopeId:metricName" -> MetricMetadata
    // Faster lookup index
    private readonly metricIdIndex: Map<string, Set<string>> = new Map(); // "scopeId:metricName" -> Set<seriesId>

    private readonly chunkSize: number;
    private readonly maxChunks: number;

    constructor(chunkSize: number = 120, maxChunks: number = 60) {
        this.chunkSize = chunkSize;
        this.maxChunks = maxChunks;
    }

    /**
     * Store entire ScopeMetrics array efficiently
     * Replaces addSample - processes all metrics in one batch
     */
    storeScopeMetrics(scopeMetrics: ScopeMetrics[]): void {
        for (const scopeMetric of scopeMetrics) {
            const scope = scopeMetric.scope;
            const scopeId = scopeToId(scope);
            this.scopes.set(scopeId, scope);

            for (const metricData of scopeMetric.metrics) {
                const metricName = metricData.descriptor.name;
                const metricId = makeMetricId(scopeId, metricName);
                if (!this.metricMetadataMap.has(metricId)) {
                    const { dataPoints: _dataPoints, ...metadata } = metricData;
                    this.metricMetadataMap.set(metricId, metadata as MetricMetadata);
                }
                for (const dp of metricData.dataPoints) {
                    const startTime = dp.startTime[0] * 1_000_000_000 + dp.startTime[1];
                    const endTime = dp.endTime[0] * 1_000_000_000 + dp.endTime[1];
                    const attributes = dp.attributes;
                    const attributesId = attributesToId(attributes);
                    const seriesId = makeSeriesId(metricId, attributesId);
                    if (!this.series.has(seriesId)) {
                        this.series.set(seriesId, new Series(
                            { hash: 0, labels: attributes, originalAttributes: attributes },
                            this.metricMetadataMap.get(metricId)!,
                            this.chunkSize,
                            this.maxChunks
                        ));
                        (this.metricIdIndex.get(metricId) ?? this.metricIdIndex.set(metricId, new Set()).get(metricId))!.add(seriesId);
                    }
                    this.series.get(seriesId)!.append(startTime, endTime, dp.value as any);
                }
            }
        }
    }

    query(
        scopeMetrics?: ScopeMetricQuery[],
        startTime?: number,
        endTime?: number
    ): MetricQueryResult[] {
        // If no queries provided, get all scopeMetrics
        if (!scopeMetrics || scopeMetrics.length === 0) {
            const queries: ScopeMetricQuery[] = Array.from(this.metricIdIndex.keys()).map(indexKey => {
                const [scopeId, metricName] = indexKey.split(':').slice(0, 2);
                const scope = this.scopes.get(scopeId)!;
                return {
                    scope,
                    descriptor: { name: metricName },
                    filters: undefined
                };
            });
            return queries
                .map(query => this._querySingle(query, startTime, endTime))
                .filter((result): result is MetricQueryResult => result !== null);
        }

        return scopeMetrics
            .map(query => this._querySingle(query, startTime, endTime))
            .filter((result): result is MetricQueryResult => result !== null);
    }

    /**
     * Query single metric with attribute filters
     */
    private _querySingle(
        query: ScopeMetricQuery,
        startTime?: number,
        endTime?: number
    ): MetricQueryResult | null {
        const scopeId = scopeToId(query.scope);
        const indexKey = makeMetricId(scopeId, query.descriptor.name);
        const seriesKeysInMetric = this.metricIdIndex.get(indexKey);

        if (!seriesKeysInMetric || seriesKeysInMetric.size === 0) {
            return null;
        }

        const scope = this.scopes.get(scopeId);
        const metricData = this.metricMetadataMap.get(indexKey);

        if (!scope || !metricData) {
            return null;
        }

        // Filter by attributes if provided
        const filteredSeriesKeys = query.filters
            ? Array.from(seriesKeysInMetric).filter(key => {
                const series = this.series.get(key)!;
                return this._matchesAttributeFilters(series, query.filters);
            })
            : Array.from(seriesKeysInMetric);

        if (filteredSeriesKeys.length === 0) {
            return null;
        }

        const matchingSeries = filteredSeriesKeys
            .map(key => {
                const series = this.series.get(key)!;
                const { startTimes, endTimes, values } = series.querySlices({ startTime, endTime, includeStartTimes: true });
                return {
                    id: key,
                    attributes: series.getOriginalAttributes(),
                    startTimes: startTimes ? Array.from(startTimes) : undefined,
                    endTimes: Array.from(endTimes),
                    values: Array.isArray(values) ? values : Array.from(values)
                };
            })
            .filter(s => s.endTimes.length > 0);
        return {
            scope,
            descriptor: metricData.descriptor,
            series: matchingSeries
        };
    }


    /**
     * Match series attributes against filters
     * Supports exact match, negation (!), and regex (~)
     */
    private _matchesAttributeFilters(series: Series, filters?: Record<string, string>): boolean {
        if (!filters || Object.keys(filters).length === 0) {
            return true;
        }

        const attrs = series.getOriginalAttributes();

        for (const [key, filterValue] of Object.entries(filters)) {
            const attrValue = String(attrs[key] ?? '');

            // Regex match: status=~4.*
            if (filterValue.startsWith('~')) {
                const pattern = filterValue.slice(1);
                try {
                    const regex = new RegExp(pattern);
                    if (!regex.test(attrValue)) {
                        return false;
                    }
                } catch {
                    if (attrValue !== filterValue) {
                        return false;
                    }
                }
            }
            // Negation: status=!200
            else if (filterValue.startsWith('!')) {
                const negatedValue = filterValue.slice(1);
                if (attrValue === negatedValue) {
                    return false;
                }
            }
            // Exact match: method=GET
            else {
                if (attrValue !== filterValue) {
                    return false;
                }
            }
        }

        return true;
    }

    evictOldData(retentionTimeNs: number): { evictedChunks: number; evictedSeries: number } {
        const thresholdTime = Date.now() * 1_000_000 - retentionTimeNs;
        let evictedChunks = 0;
        let evictedSeries = 0;

        for (const [key, series] of this.series.entries()) {
            evictedChunks += series.evictOldChunks(thresholdTime);

            if (series.isEmpty()) {
                this.series.delete(key);
                evictedSeries++;
            }
        }

        return { evictedChunks, evictedSeries };
    }

    getStats() {
        const seriesStats = Array.from(this.series.values()).map(s => s.getStats());
        const totalSamples = seriesStats.reduce((sum, s) => sum + s.samples, 0);
        const totalMemory = seriesStats.reduce((sum, s) => sum + s.memoryBytes, 0);

        return {
            totalMetrics: this.metricMetadataMap.size,
            totalScopes: this.scopes.size,
            totalSeries: this.series.size,
            totalSamples,
            memoryUsageBytes: totalMemory
        };
    }

    reset(): void {
        this.series.clear();
        this.scopes.clear();
        this.metricMetadataMap.clear();
        this.metricIdIndex.clear();
    }

    size(): number {
        return this.series.size;
    }

    /**
     * Serialize registry to NDJSON format (newline-delimited JSON)
     * Each line is a complete record: metadata, scope, metric, or data point
     * Format:
     *   {"type":"header","version":1,"timestamp":"...","stats":{...}}
     *   {"type":"scope","id":"...","data":{...}}
     *   {"type":"metric","id":"...","data":{...}}
     *   {"type":"series","id":"...","labelSet":{...},"chunks":[...]}
     */
    serializeToNDJSON(): string {
        const lines: string[] = [];
        
        // Header
        lines.push(JSON.stringify({
            type: 'header',
            version: 1,
            timestamp: new Date().toISOString(),
            stats: this.getStats()
        }));

        // Scopes
        for (const [scopeId, scope] of this.scopes.entries()) {
            lines.push(JSON.stringify({
                type: 'scope',
                id: scopeId,
                data: scope
            }));
        }

        // Metric metadata
        for (const [metricId, metadata] of this.metricMetadataMap.entries()) {
            lines.push(JSON.stringify({
                type: 'metric',
                id: metricId,
                data: metadata
            }));
        }

        // Series headers + chunks (one chunk per line for streaming efficiency)
        const serializedSeriesHeaders = new Set<string>();
        for (const [seriesId, series] of this.series.entries()) {
            const seriesPrivate = series as any;
            
            // Emit series header once per series
            if (!serializedSeriesHeaders.has(seriesId)) {
                lines.push(JSON.stringify({
                    type: 'series',
                    seriesId: seriesId,
                    labelSet: seriesPrivate.labelSet,
                    metadata: seriesPrivate.metadata
                }));
                serializedSeriesHeaders.add(seriesId);
            }
            
            (seriesPrivate.chunks || []).forEach((chunk: any, chunkIndex: number) => {
                const slicedStartTimes = chunk.startTimes.slice(0, chunk.cursor);
                const slicedEndTimes = chunk.endTimes.slice(0, chunk.cursor);
                const slicedValues = chunk.values.slice(0, chunk.cursor);
                const slicedHistograms = chunk.histograms.slice(0, chunk.cursor);
                
                lines.push(JSON.stringify({
                    type: 'chunk',
                    seriesId: seriesId,
                    chunkIndex: chunkIndex,
                    startTimes: Array.from(slicedStartTimes),
                    endTimes: Array.from(slicedEndTimes),
                    values: Array.from(slicedValues),
                    histograms: Array.from(slicedHistograms),
                    cursor: chunk.cursor,
                    minEndTime: chunk.minEndTime,
                    maxEndTime: chunk.maxEndTime,
                    isHistogram: chunk.isHistogram
                }));
            });
        }

        // Metric ID index for fast lookup
        for (const [metricId, seriesIdSet] of this.metricIdIndex.entries()) {
            lines.push(JSON.stringify({
                type: 'index',
                id: metricId,
                seriesIds: Array.from(seriesIdSet)
            }));
        }

        return lines.join('\n');
    }

    /**
     * Deserialize from NDJSON format - restore from chunk lines
     */
    deserializeFromNDJSON(ndjsonData: string): void {
        try {
            const lines = ndjsonData.trim().split('\n');
            
            for (const line of lines) {
                if (!line.trim()) continue;
                
                const record = JSON.parse(line);
                
                switch (record.type) {
                    case 'header':
                        // Just metadata
                        break;
                        
                    case 'scope':
                        this.scopes.set(record.id, record.data as InstrumentationScope);
                        break;
                        
                    case 'metric':
                        this.metricMetadataMap.set(record.id, record.data as MetricMetadata);
                        break;
                        
                    case 'index':
                        this.metricIdIndex.set(record.id, new Set(record.seriesIds as string[]));
                        break;
                        
                    case 'series': {
                        // Create series stub - will be populated by subsequent chunk lines
                        const metadata = this.metricMetadataMap.get(
                            record.seriesId.substring(0, record.seriesId.lastIndexOf('$'))
                        ) || record.metadata;
                        if (metadata) {
                            const series = new Series(
                                record.labelSet,
                                metadata,
                                this.chunkSize,
                                this.maxChunks
                            );
                            this.series.set(record.seriesId, series);
                        }
                        break;
                    }
                        
                    case 'chunk': {
                        // Restore chunk to series
                        const series = this.series.get(record.seriesId);
                        if (series) {
                            const chunk = new Chunk(record.cursor || record.startTimes.length, record.isHistogram);
                            const chunkPrivate = chunk as any;
                            chunkPrivate.startTimes = new Float64Array(record.startTimes);
                            chunkPrivate.endTimes = new Float64Array(record.endTimes);
                            chunkPrivate.values = new Float64Array(record.values);
                            chunkPrivate.histograms = record.histograms;
                            chunkPrivate.cursor = record.cursor;
                            chunkPrivate.minEndTime = record.minEndTime;
                            chunkPrivate.maxEndTime = record.maxEndTime;
                            chunkPrivate.isHistogram = record.isHistogram;
                            
                            const seriesPrivate = series as any;
                            seriesPrivate.chunks.push(chunk);
                        }
                        break;
                    }
                }
            }
        } catch {
            // Silently fail if any parsing fails
        }
    }

    /**
     * Save registry to disk as NDJSON (one chunk per line)
     */
    saveToDisk(filePath: string): void {
        try {
            const ndjsonData = this.serializeToNDJSON();
            fs.writeFileSync(filePath, ndjsonData);
        } catch {
            // Silently fail - don't interrupt operations
        }
    }

    /**
     * Load registry from disk (NDJSON format)
     */
    loadFromDisk(filePath: string): void {
        try {
            if (!fs.existsSync(filePath)) {
                return;
            }
            const ndjsonData = fs.readFileSync(filePath, 'utf-8');
            this.deserializeFromNDJSON(ndjsonData);
        } catch {
            // Silently fail during boot
        }
    }
}

// Utility: Create deterministic ID from attributes
function attributesToId(attributes: Record<string, any>): string {
    return Object.keys(attributes).sort().map(key => `${key}=${attributes[key]}`).join(',') || 'no_attrs';
}
function scopeToId(scope: InstrumentationScope): string {
    return `${scope.name}@${scope.version ?? 'no_version'}`;
}
function makeMetricId(scopeId: string, metricName: string): string {
    return `${scopeId}:${metricName}`;
}
function makeSeriesId(metricId: string, attributesId: string): string {
    return `${metricId}$${attributesId}`;
}


export type MetricInfo = {
    scope: InstrumentationScope
    metrics: Array<{
        descriptor: MetricDescriptor
        series: string[];
    }>;
};