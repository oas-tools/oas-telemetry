"use client"

import { useMemo, memo } from "react"
import type { Metric, HistogramValue } from "./metrics-types"
import { DataPointType } from "./metrics-types"
import {
  getLatestSample,
  getSeriesLabel,
  formatValue,
  formatTimestamp,
  getSeriesColor,
  calculatePercentile,
} from "./metrics-helpers"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface LatestValueWidgetsProps {
  metric: Metric
}

function LatestValueWidgets({ metric }: LatestValueWidgetsProps) {
  const { metadata, series } = metric
  const dataPointType = metadata.dataPointType
  const unit = metadata.descriptor?.unit

  const latestData = useMemo(() => {
    return series.map((s, idx) => {
      const latestSample = getLatestSample(s)
      const prevSample = s.samples[s.samples.length - 2]

      let currentValue = 0
      let previousValue = 0
      let histogramStats: { p50: number; p95: number; p99: number; count: number } | null = null

      if (latestSample) {
        if (typeof latestSample.value === "number") {
          currentValue = latestSample.value
        } else {
          const hist = latestSample.value as HistogramValue
          currentValue = hist.count
          histogramStats = {
            p50: calculatePercentile(hist, 50),
            p95: calculatePercentile(hist, 95),
            p99: calculatePercentile(hist, 99),
            count: hist.count,
          }
        }
      }

      if (prevSample) {
        if (typeof prevSample.value === "number") {
          previousValue = prevSample.value
        } else {
          previousValue = (prevSample.value as HistogramValue).count
        }
      }

      const change = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

      return {
        label: getSeriesLabel(s.labels),
        value: currentValue,
        previousValue,
        change,
        timestamp: latestSample?.timestamp,
        histogramStats,
        color: getSeriesColor(idx),
      }
    })
  }, [series])

  if (dataPointType === DataPointType.Histogram || dataPointType === DataPointType.ExponentialHistogram) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {latestData.map((data, idx) => (
          <div key={idx} className="bg-muted/30 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
              <span className="text-xs text-muted-foreground truncate">{data.label}</span>
            </div>
            {data.histogramStats && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">p50</span>
                  <span className="font-mono font-medium">{formatValue(data.histogramStats.p50, unit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">p95</span>
                  <span className="font-mono font-medium">{formatValue(data.histogramStats.p95, unit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">p99</span>
                  <span className="font-mono font-medium">{formatValue(data.histogramStats.p99, unit)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>count</span>
                  <span>{data.histogramStats.count}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
      {latestData.map((data, idx) => (
        <div key={idx} className="bg-muted/30 rounded-lg p-3 border">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="text-xs text-muted-foreground truncate flex-1">{data.label}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono">{formatValue(data.value, unit)}</span>
            <div
              className={cn(
                "flex items-center gap-0.5 text-xs",
                data.change > 0 && "text-emerald-600",
                data.change < 0 && "text-red-600",
                data.change === 0 && "text-muted-foreground",
              )}
            >
              {data.change > 0 && <TrendingUp className="h-3 w-3" />}
              {data.change < 0 && <TrendingDown className="h-3 w-3" />}
              {data.change === 0 && <Minus className="h-3 w-3" />}
              <span>{Math.abs(data.change).toFixed(1)}%</span>
            </div>
          </div>
          {data.timestamp && (
            <div className="text-[10px] text-muted-foreground mt-1">{formatTimestamp(data.timestamp)}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default memo(LatestValueWidgets, (prev, next) => {
  if (prev.metric.series.length !== next.metric.series.length) return false
  for (let i = 0; i < prev.metric.series.length; i++) {
    const prevSeries = prev.metric.series[i]
    const nextSeries = next.metric.series[i]
    if (prevSeries.samples.length !== nextSeries.samples.length) return false
    if (prevSeries.samples.length > 0) {
      const prevLast = prevSeries.samples[prevSeries.samples.length - 1]
      const nextLast = nextSeries.samples[nextSeries.samples.length - 1]
      if (prevLast.timestamp !== nextLast.timestamp) return false
    }
  }
  return true
})
