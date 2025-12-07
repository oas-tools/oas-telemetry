import type { Metric, MetricsStats } from "@/pages/metrics/metrics-types"
import { DataPointType, AggregationTemporality } from "@/pages/metrics/metrics-types"

class MockMetricsService {
  private metrics: Map<string, Metric> = new Map()
  private intervalId: number | null = null
  private startTime: number = Date.now()
  private isGenerating = false

  constructor() {
    this.initializeMetrics()
  }

  private initializeMetrics() {
    // CPU Usage
    this.metrics.set("system:cpu.usage", {
      metricKey: "system:cpu.usage",
      metadata: {
        metricKey: "system:cpu.usage",
        scope: { name: "system", version: "1.0.0" },
        descriptor: {
          name: "cpu.usage",
          type: "Gauge",
          description: "CPU usage percentage",
          unit: "%",
        },
        aggregationTemporality: AggregationTemporality.Delta,
        dataPointType: DataPointType.Gauge,
      },
      series: [
        {
          labels: { core: "0" },
          samples: [],
        },
        {
          labels: { core: "1" },
          samples: [],
        },
      ],
    })

    // Memory Usage
    this.metrics.set("system:memory.usage", {
      metricKey: "system:memory.usage",
      metadata: {
        metricKey: "system:memory.usage",
        scope: { name: "system", version: "1.0.0" },
        descriptor: {
          name: "memory.usage",
          type: "Gauge",
          description: "Memory usage in bytes",
          unit: "bytes",
        },
        aggregationTemporality: AggregationTemporality.Delta,
        dataPointType: DataPointType.Gauge,
      },
      series: [
        {
          labels: { type: "used" },
          samples: [],
        },
      ],
    })

    // Network Throughput
    this.metrics.set("system:network.throughput", {
      metricKey: "system:network.throughput",
      metadata: {
        metricKey: "system:network.throughput",
        scope: { name: "system", version: "1.0.0" },
        descriptor: {
          name: "network.throughput",
          type: "Sum",
          description: "Network throughput",
          unit: "bytes",
        },
        aggregationTemporality: AggregationTemporality.Cumulative,
        dataPointType: DataPointType.Sum,
        isMonotonic: true,
      },
      series: [
        {
          labels: { direction: "tx" },
          samples: [],
        },
        {
          labels: { direction: "rx" },
          samples: [],
        },
      ],
    })

    // Initialize with some historical data
    const now = Date.now() * 1_000_000
    const historyMinutes = 2
    for (let i = -historyMinutes * 60; i < 0; i++) {
      const timestamp = now + i * 1_000_000_000
      this.generateSamplesAtTime(timestamp)
    }
  }

  private generateSamplesAtTime(timestamp: number) {
    // CPU Usage - simulate smooth wave pattern
    const cpuMetric = this.metrics.get("system:cpu.usage")!
    const time = timestamp / 1_000_000_000
    cpuMetric.series[0].samples.push({
      timestamp,
      value: 30 + 20 * Math.sin(time / 10) + Math.random() * 5,
    })
    cpuMetric.series[1].samples.push({
      timestamp,
      value: 40 + 15 * Math.cos(time / 8) + Math.random() * 5,
    })

    // Memory Usage - slowly increasing
    const memMetric = this.metrics.get("system:memory.usage")!
    const baseMemory = 2_000_000_000 + (time * 1_000_000)
    memMetric.series[0].samples.push({
      timestamp,
      value: baseMemory + Math.random() * 100_000_000,
    })

    // Network Throughput - cumulative with bursts
    const netMetric = this.metrics.get("system:network.throughput")!
    const burst = Math.random() > 0.8 ? Math.random() * 1_000_000 : Math.random() * 100_000
    const txSamples = netMetric.series[0].samples
    const rxSamples = netMetric.series[1].samples
    
    const lastTx = txSamples.length > 0 ? (txSamples[txSamples.length - 1].value as number) : 0
    const lastRx = rxSamples.length > 0 ? (rxSamples[rxSamples.length - 1].value as number) : 0
    
    netMetric.series[0].samples.push({
      timestamp,
      value: lastTx + burst,
    })
    netMetric.series[1].samples.push({
      timestamp,
      value: lastRx + burst * 1.5,
    })

    // Keep only last 300 samples per series (5 minutes at 1s interval)
    for (const metric of this.metrics.values()) {
      for (const series of metric.series) {
        if (series.samples.length > 300) {
          series.samples = series.samples.slice(-300)
        }
      }
    }
  }

  startGenerating() {
    if (this.isGenerating) return
    this.isGenerating = true

    this.intervalId = window.setInterval(() => {
      const now = Date.now() * 1_000_000
      this.generateSamplesAtTime(now)
    }, 1000) // Generate new samples every second
  }

  stopGenerating() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isGenerating = false
  }

  async findMetrics(params: {
    format?: string
    instrumentation?: string
    metricKeys?: string[]
    startTimeNs?: number
    endTimeNs?: number
  }) {
    const now = Date.now() * 1_000_000
    const metrics: Metric[] = []

    for (const [key, metric] of this.metrics.entries()) {
      if (params.metricKeys && !params.metricKeys.includes(key)) continue
      if (params.instrumentation && !key.startsWith(params.instrumentation)) continue

      // Filter samples by time range
      const filteredMetric = {
        ...metric,
        series: metric.series.map(s => ({
          ...s,
          samples: s.samples.filter(sample => {
            if (params.startTimeNs && sample.timestamp < params.startTimeNs) return false
            if (params.endTimeNs && sample.timestamp > params.endTimeNs) return false
            return true
          }),
        })),
      }

      metrics.push(filteredMetric)
    }

    return {
      metricsCount: metrics.length,
      metrics,
    }
  }

  async findNewerMetrics(
    params: {
      format?: string
      metricKeys?: string[]
      instrumentation?: string
      startTimeNs?: number
      endTimeNs?: number
    },
    lastTimestamp: number
  ) {
    const metrics: Metric[] = []

    for (const [key, metric] of this.metrics.entries()) {
      if (params.metricKeys && !params.metricKeys.includes(key)) continue

      const filteredMetric = {
        ...metric,
        series: metric.series.map(s => ({
          ...s,
          samples: s.samples.filter(sample => 
            sample.timestamp > lastTimestamp && 
            (!params.endTimeNs || sample.timestamp <= params.endTimeNs)
          ),
        })),
      }

      if (filteredMetric.series.some(s => s.samples.length > 0)) {
        metrics.push(filteredMetric)
      }
    }

    return {
      metricsCount: metrics.length,
      metrics,
    }
  }

  async getStats(): Promise<MetricsStats> {
    let totalSeries = 0
    let totalSamples = 0

    for (const metric of this.metrics.values()) {
      totalSeries += metric.series.length
      for (const series of metric.series) {
        totalSamples += series.samples.length
      }
    }

    return {
      totalMetrics: this.metrics.size,
      totalSeries,
      totalSamples,
      memoryUsageBytes: totalSamples * 100, // Rough estimate
    }
  }
}

export const mockMetricsService = new MockMetricsService()
