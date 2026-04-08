import { Series } from './Series.js';
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
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { dataPoints, ...metadata } = metricData;
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
        console.log(`Querying metric: scope=${scopeId}, metric=${query.descriptor.name}, filters=${JSON.stringify(query.filters)}, timeRange=[${startTime}, ${endTime}]`);
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