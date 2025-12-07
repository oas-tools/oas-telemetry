import backend from "./Backend";

// Raw format types (from TSDB)
export interface Sample {
  timestamp: number; // nanoseconds
  value: number | HistogramValue;
}

export interface HistogramValue {
  count: number;
  sum: number;
  buckets?: { boundary: number; count: number }[];
}

export interface LabelSet {
  [key: string]: string | number | boolean;
}

export interface MetricMetadata {
  dataPointType: number; // 0=Histogram, 1=ExponentialHistogram, 2=Gauge, 3=Sum
  aggregationTemporality?: number; // 0=Delta, 1=Cumulative
  isMonotonic?: boolean;
  unit?: string;
}

export interface Series {
  labels: LabelSet;
  samples: Sample[];
}

export interface RawMetric {
  metricKey: string;
  metadata: MetricMetadata;
  series: Series[];
}

export interface MetricsResponse {
  format: string;
  metrics: RawMetric[];
}

export interface MetricsStats {
  totalMetrics: number;
  totalSeries: number;
  totalSamples: number;
  memoryUsageBytes: number;
}

export interface SearchCriteria {
  metricKeys?: string[]; // Support multiple metric keys (unique identifiers)
  instrumentation?: string;
  labels?: Record<string, any>;
  startTimeNs?: number;
  endTimeNs?: number;
  format?: "raw" | "otel";
}

class MetricsService {
  /**
   * Fetch all metrics with optional filters
   */
  async findMetrics(criteria: SearchCriteria = {}): Promise<MetricsResponse> {
    const { format = "raw", metricKeys, labels, instrumentation, startTimeNs, endTimeNs } = criteria;
    const params = new URLSearchParams();
    params.set("format", format);
    
    if (metricKeys && metricKeys.length > 0) {
      params.set("metricKeys", metricKeys.join(","));
    }
    
    if (instrumentation) {
      params.set("instrumentation", instrumentation);
    }
    
    if (labels) {
      params.set("labels", JSON.stringify(labels));
    }

    if (startTimeNs) {
      params.set("startTimeNs", startTimeNs.toString());
    }

    if (endTimeNs) {
      params.set("endTimeNs", endTimeNs.toString());
    }

    const res = await backend.get(`/metrics?${params.toString()}`);
    return res.data;
  }

  /**
   * Fetch metrics that have changed since a given timestamp (for polling)
   */
  async findNewerMetrics(
    criteria: SearchCriteria,
    sinceTimestamp: number
  ): Promise<MetricsResponse> {
    const { format = "raw", metricKeys, labels, instrumentation, startTimeNs, endTimeNs } = criteria;
    const params = new URLSearchParams();
    params.set("format", format);
    params.set("startTimeNs", sinceTimestamp.toString());
    
    if (metricKeys && metricKeys.length > 0) {
      params.set("metricKeys", metricKeys.join(","));
    }

    if (instrumentation) {
      params.set("instrumentation", instrumentation);
    }
    
    if (labels) {
      params.set("labels", JSON.stringify(labels));
    }

    if (endTimeNs) {
      params.set("endTimeNs", endTimeNs.toString());
    }

    const res = await backend.get(`/metrics?${params.toString()}`);
    return res.data;
  }

  /**
   * Get statistics about the metrics storage
   */
  async getStats(): Promise<MetricsStats> {
    const res = await backend.get("/metrics/stats");
    return res.data;
  }

  /**
   * Get list of unique metric names (optimized endpoint)
   * Optional instrumentation filter
   */
  async getMetricNames(instrumentation?: string): Promise<string[]> {
    const params = new URLSearchParams();
    if (instrumentation) {
      params.set("instrumentation", instrumentation);
    }
    const res = await backend.get(`/metrics/names?${params.toString()}`);
    return res.data.names || [];
  }

  /**
   * Get list of unique instrumentations (optimized endpoint)
   */
  async getInstrumentations(): Promise<string[]> {
    const res = await backend.get("/metrics/instrumentations");
    return res.data.instrumentations || [];
  }

  /**
   * Get unique label keys across all metrics (optimized endpoint)
   */
  async getLabelKeys(): Promise<string[]> {
    const res = await backend.get("/metrics/label-keys");
    return res.data.labelKeys || [];
  }

  /**
   * Control metrics collection
   */
  async startCollection(): Promise<void> {
    await backend.post("/metrics/start");
  }

  async stopCollection(): Promise<void> {
    await backend.post("/metrics/stop");
  }

  async getStatus(): Promise<{ active: boolean }> {
    const res = await backend.get("/metrics/status");
    return { active: !!res.data.active };
  }

  async resetMetrics(): Promise<void> {
    await backend.post("/metrics/reset");
  }

  async setRetentionTime(retentionTimeInSeconds: number): Promise<{ message: string }> {
    const res = await backend.post("/metrics/retention-time", { retentionTimeInSeconds });
    return { message: res.data.message };
  }

  async getRetentionTime(): Promise<number> {
    const res = await backend.get("/metrics/retention-time");
    return res.data.retentionTimeInSeconds || 0;
  }
}

export const metricsService = new MetricsService();
