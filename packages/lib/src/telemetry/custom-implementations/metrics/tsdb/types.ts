import { InstrumentationScope } from "@opentelemetry/core";
import { MetricData, Histogram, MetricDescriptor } from "@opentelemetry/sdk-metrics";
import { Attributes } from "@opentelemetry/api";

export type MetricMetadata = Omit<MetricData, "dataPoints">
export type HistogramValue = Histogram;

/**
 * Label set for series identification
 */
export interface LabelSet {
    hash: number;
    labels: Attributes;
    originalAttributes: Attributes;
}

/**
 * Series identifier: scope + metricName + attributes
 */
export interface SeriesKey {
    scopeId: string;
    metricName: string;
    attributesId: number;
}

/**
 * Sample with startTime, endTime and value (matching OTEL format)
 */
export interface Sample {
    startTime: number;  // nanoseconds
    endTime: number;    // nanoseconds
    value: number | Histogram;
}

/**
 * Raw TSDB format
 */
export interface RawScopeMetric {
    scope: InstrumentationScope;
    metadata: MetricData;
    series: Array<{
        attributes: Attributes;
        startTimes: number[];
        endTimes: number[];
        values: number[];
    }>;
}

export interface ScopeMetricQuery {
    scope: InstrumentationScope;
    descriptor: {
        name: string;
    }
    filters?: Record<string, string>;  // Attribute filters (exact match or regex with ~)
}

export interface FindMetricsRequest {
    scopeMetrics?: ScopeMetricQuery[];  // Optional - if not provided, returns all
    from?: number;  // Unix timestamp (ms or ns)
    to?: number;    // Unix timestamp (ms or ns)
    format?: 'otel' | 'raw';  // Output format
}

/**
 * Query result for metrics
 */
export interface MetricQueryResult {
    scope: InstrumentationScope
    descriptor: MetricDescriptor
    series: Array<{
        attributes: Attributes;
        startTimes?: number[];
        endTimes: number[];
        values: number[] | (Histogram | null)[];
    }>;
}

