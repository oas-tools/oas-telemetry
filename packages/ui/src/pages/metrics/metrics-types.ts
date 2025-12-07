// Datapoint types
export enum DataPointType {
  Histogram = 0,
  ExponentialHistogram = 1,
  Gauge = 2,
  Sum = 3,
}

// Aggregation temporality
export enum AggregationTemporality {
  Delta = 0,
  Cumulative = 1,
}

export interface HistogramBuckets {
  boundaries: number[]
  counts: number[]
}

export interface HistogramValue {
  min?: number
  max?: number
  sum: number
  count: number
  buckets?: HistogramBuckets
}

export interface ExponentialHistogramValue {
  scale: number
  offset: number
  sum: number
  count: number
  zeroCount?: number
  positive?: { offset: number; bucketCounts: number[] }
  negative?: { offset: number; bucketCounts: number[] }
}

export interface Sample {
  timestamp: number // nanoseconds
  value: number | HistogramValue | ExponentialHistogramValue
}

export interface LabelSet {
  [key: string]: any
}

export interface MetricDescriptor {
  name: string
  type: string
  description: string
  unit: string
  valueType?: number
  advice?: any
}

export interface MetricScope {
  name: string
  version?: string
}

export interface MetricMetadata {
  metricKey: string
  scope: MetricScope
  descriptor: MetricDescriptor
  aggregationTemporality: AggregationTemporality
  dataPointType: DataPointType
  isMonotonic?: boolean
}

export interface Series {
  labels: LabelSet
  samples: Sample[]
}

export interface Metric {
  metricKey: string
  metadata: MetricMetadata
  series: Series[]
}

export interface MetricsResponse {
  metricsCount: number
  metrics: Metric[]
}

export interface TimeRange {
  label: string
  startTimeNs: number
  endTimeNs: number
  isRelative?: boolean
  // For relative ranges, store the preset minutes to recalculate on refresh
  relativeMinutes?: number
}

export interface GlobalTimeWindow {
  // The absolute bounds of the entire available time domain
  absoluteStartNs: number
  absoluteEndNs: number
}

export interface MetricsStats {
  totalMetrics: number
  totalSeries: number
  totalSamples: number
  memoryUsageBytes: number
}

export type ViewMode = "history" | "latest" | "both"

export type CollectionStatus = "collecting" | "paused" | "error"

export type SeriesVisibility = Record<string, boolean>
