// Types for the metrics dashboard

export interface Sample {
  timestamp: number // nanoseconds
  value: number | HistogramValue
}

export interface HistogramValue {
  count: number
  sum: number
  min?: number
  max?: number
  buckets?: {
    boundaries: number[]
    counts: number[]
  }
}

export interface LabelSet {
  [key: string]: string | number | boolean | LabelSet
}

export interface Series {
  labels: LabelSet
  samples: Sample[]
}

export interface MetricDescriptor {
  name: string
  description?: string
  unit?: string
}

export interface MetricMetadata {
  dataPointType: DataPointType
  aggregationTemporality?: AggregationTemporality
  descriptor?: MetricDescriptor
}

export interface Metric {
  metricKey: string
  metadata: MetricMetadata
  series: Series[]
}

export interface MetricsStats {
  totalMetrics: number
  totalSeries: number
  totalSamples: number
  memoryUsageBytes: number
}

export interface TimeRange {
  label: string
  startTimeNs: number
  endTimeNs: number
  isRelative: boolean
  relativeMinutes?: number
  isLive?: boolean
}

export type ViewMode = "history" | "latest" | "both"
export type CollectionStatus = "collecting" | "paused" | "error"

export enum DataPointType {
  Gauge = 1,
  Sum = 2,
  Histogram = 3,
  ExponentialHistogram = 4,
}

export enum AggregationTemporality {
  Delta = 1,
  Cumulative = 2,
}
