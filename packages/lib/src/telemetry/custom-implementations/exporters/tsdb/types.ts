/**
 * Prometheus-style TSDB types for ultra-efficient in-memory storage
 */

/**
 * Label set with hash for fast lookups
 */
export interface LabelSet {
    hash: number;
    labels: Record<string, any>;
}

/**
 * Metric metadata (stored once per unique metric)
 */
export interface MetricMetadata {
    metricKey: string;
    scope: { name: string; version?: string };
    descriptor: {
        name: string;
        type?: string;
        description?: string;
        unit?: string;
        valueType?: number;
    };
    aggregationTemporality?: number;
    dataPointType?: number;
    isMonotonic?: boolean;
}

/**
 * Sample with timestamp and value
 */
export interface Sample {
    timestamp: number;  // nanoseconds
    value: number | HistogramValue;
}

/**
 * Histogram value structure
 */
export interface HistogramValue {
    min?: number;
    max?: number;
    sum: number;
    count: number;
    buckets?: {
        boundaries: number[];
        counts: number[];
    };
}

/**
 * Query options for time-range queries
 */
export interface QueryOptions {
    metricKey?: string;         // Single metric key filter
    metricKeys?: string[];      // Multiple metric keys filter (OR logic)
    instrumentation?: string;   // Filter by instrumentation (prefix before ':')
    labels?: Record<string, any>;
    startTime?: number;         // nanoseconds
    endTime?: number;           // nanoseconds
    limit?: number;
    format?: 'otel' | 'raw';    // Output format: OpenTelemetry or raw TSDB
}

/**
 * Reconstructed metric in OpenTelemetry format
 */
export interface ReconstructedMetric {
    scope: { name: string; version?: string };
    metrics: any[];
}

/**
 * Raw TSDB format (ultra-efficient)
 */
export interface RawMetric {
    metricKey: string;
    metadata: MetricMetadata;
    series: Array<{
        labels: Record<string, any>;
        samples: Sample[];
    }>;
}
