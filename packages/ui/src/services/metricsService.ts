import backend from "./Backend";

export interface ScopeMetricQuery {
  metricId: {
    scope: {
      name: string;
      version?: string;
    };
    metricName: string;
  };
  filters?: Record<string, string>;
}

export interface HistogramValue {
  count: number;
  sum: number;
  buckets?: { boundary: number; count: number }[];
}

export interface MetricQueryResult {
  scope: {
    name: string;
    version?: string;
  };
  descriptor: {
    name: string;
    unit?: string;
    description?: string;
    // ...other descriptor fields
  };
  series: Array<{
    attributes: Record<string, any>;
    startTimes: number[];
    endTimes: number[];
    values: number[];
  }>;
}

export interface MetricsFindResponse {
  format: string;
  scopeMetricsCount: number;
  scopeMetrics: MetricQueryResult[];
}

export interface FindMetricsCriteria {
  scopeMetrics?: ScopeMetricQuery[];
  from?: number;
  to?: number;
  format?: "raw" | "otel";
}
export type InstrumentationScope = {
  name: string;
  version?: string;
};

export type MetricDescriptor = {
  name: string;
  unit?: string;
  description?: string;
  [key: string]: any;
};

export type MetricInfo = {
  scope: InstrumentationScope;
  metrics: Array<{
    descriptor: MetricDescriptor;
    series: string[];
  }>;
};

class MetricsService {

  async findMetrics(criteria: FindMetricsCriteria = {}): Promise<MetricsFindResponse> {
    const body = {
      scopeMetrics: criteria.scopeMetrics,
      from: criteria.from,
      to: criteria.to,
      format: criteria.format || "raw"
    };
    const res = await backend.post("/metrics/find", body);
    return res.data;
  }

  async getStats(): Promise<any> {
    const res = await backend.get("/metrics/stats");
    return res.data;
  }

  async getScopeMetricsInfo(): Promise<MetricInfo[]> {
    const res = await backend.get("/metrics/scope-metrics-info");
    return res.data.scopeMetrics || [];
  }

  async startCollection(): Promise<void> {
    await backend.post("/metrics/start");
  }

  async stopCollection(): Promise<void> {
    await backend.post("/metrics/stop");
  }

  async getStatus() {
    const res = await backend.get("/metrics/status");
    return { active: !!res.data.active };
  }

  async resetMetrics(): Promise<void> {
    await backend.post("/metrics/reset");
  }

  async setRetentionTime(retentionTimeInSeconds: number) {
    const res = await backend.post("/metrics/retention-time", { retentionTimeInSeconds });
    return { message: res.data.message };
  }

  async getRetentionTime(): Promise<number> {
    const res = await backend.get("/metrics/retention-time");
    return res.data.retentionTimeInSeconds || 0;
  }

  download(): void {
    const baseUrl = backend.defaults.baseURL;
    const downloadUrl = `${baseUrl}/metrics/export`;
    window.open(downloadUrl, '_blank');
  }

  async import(file: File, options: { reset: boolean; format?: string }): Promise<void> {
    const text = await file.text();
    const baseUrl = backend.defaults.baseURL;
    const format = options.format || 'raw';
    const importUrl = `${baseUrl}/metrics/import?reset=${options.reset}&format=${format}`;
    const response = await fetch(importUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body: text,
    });
    if (!response.ok) throw new Error(`Import failed: ${response.statusText}`);
  }
}

export const metricsService = new MetricsService();
