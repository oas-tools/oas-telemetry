"use client"

import { useMemo, useState, useCallback, memo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { Series, TimeRange, SeriesVisibility } from "./metrics-types"
import {
  formatTimestampSmart,
  formatFullTimestamp,
  formatValue,
  getSimpleSeriesLabel,
  getSeriesColor,
  extractHistogramPercentiles,
  getChartTitle,
} from "./metrics-helpers"
import { optimizeSamples } from "./data-optimizer"
import { cn } from "@/lib/utils"
import { DataPointType } from "./metrics-types"

import SimpleBrushSelector from "./simple-brush-selector"
import { Button } from "@/components/ui/button"
import { ZoomOut } from "lucide-react"

interface GrafanaChartProps {
  series: Series[]
  dataPointType: DataPointType
  unit?: string
  height?: number
  timeRange: TimeRange
  onTimeRangeSelect?: (range: TimeRange) => void
  metricKey?: string
}

function GrafanaChart({
  series,
  dataPointType,
  unit,
  height = 200,
  timeRange,
  onTimeRangeSelect,
  metricKey,
}: GrafanaChartProps) {
  const [seriesVisibility, setSeriesVisibility] = useState<SeriesVisibility>({})

  const effectiveRange = timeRange
  const legendItems = useMemo(() => {
    if (series.length === 0) {
      return []
    }
    if (dataPointType === DataPointType.Histogram || dataPointType === DataPointType.ExponentialHistogram) {
      return series.flatMap((s, i) => [
        { key: `s${i}_p50`, label: "p50", color: getSeriesColor(i * 3), seriesIdx: i },
        { key: `s${i}_p95`, label: "p95", color: getSeriesColor(i * 3 + 1), seriesIdx: i },
        { key: `s${i}_p99`, label: "p99", color: getSeriesColor(i * 3 + 2), seriesIdx: i },
      ])
    }
    return series.map((s, i) => ({
      key: `s${i}`,
      label: getSimpleSeriesLabel(s.labels),
      color: getSeriesColor(i),
      seriesIdx: i,
    }))
  }, [series, dataPointType])

  const chartData = useMemo(() => {
    if (series.length === 0) return []

    if (dataPointType === DataPointType.Histogram || dataPointType === DataPointType.ExponentialHistogram) {
      return extractHistogramPercentiles(series, [50, 95, 99])
    }

    // Simple y directo: procesar todos los samples con downsampling
    const dataMap = new Map<number, Record<string, number>>()
    
    series.forEach((s, seriesIndex) => {
      const optimized = optimizeSamples(s.samples)
      optimized.forEach((sample) => {
        const value = typeof sample.value === "number" ? sample.value : 0
        if (!dataMap.has(sample.timestamp)) {
          dataMap.set(sample.timestamp, { timestamp: sample.timestamp })
        }
        dataMap.get(sample.timestamp)![`s${seriesIndex}`] = value
      })
    })
    
    return Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [series, dataPointType])

  const filteredChartData = useMemo(() => {
    return chartData.filter((d) => d.timestamp >= effectiveRange.startTimeNs && d.timestamp <= effectiveRange.endTimeNs)
  }, [chartData, effectiveRange.startTimeNs, effectiveRange.endTimeNs])

  const xDomain = useMemo(() => {
    return [effectiveRange.startTimeNs, effectiveRange.endTimeNs]
  }, [effectiveRange.startTimeNs, effectiveRange.endTimeNs])

  const rangeDurationMs = (effectiveRange.endTimeNs - effectiveRange.startTimeNs) / 1_000_000

  const toggleSeries = useCallback((key: string) => {
    setSeriesVisibility((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }))
  }, [])

  const isSeriesVisible = useCallback((key: string) => seriesVisibility[key] !== false, [seriesVisibility])

  const handleZoomOut = useCallback(() => {
    if (!onTimeRangeSelect) return
    const currentDuration = effectiveRange.endTimeNs - effectiveRange.startTimeNs
    const expansion = currentDuration // 100% expansion (doble el rango)
    const newStart = effectiveRange.startTimeNs - expansion / 2
    const newEnd = effectiveRange.endTimeNs + expansion / 2
    
    onTimeRangeSelect({
      label: `Zoomed out 100%`,
      startTimeNs: newStart,
      endTimeNs: newEnd,
      isRelative: false,
    })
  }, [effectiveRange, onTimeRangeSelect])
  
  const CustomTooltip = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null

      return (
        <div className="bg-popover border border-border rounded-md shadow-lg p-2 text-xs select-none">
          <div className="font-medium text-muted-foreground mb-1.5 border-b pb-1">{formatFullTimestamp(label)}</div>
          <div className="space-y-0.5">
            {payload
              .filter((p: any) => isSeriesVisible(p.dataKey))
              .map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke || p.fill }} />
                    <span className="text-muted-foreground">{p.name}</span>
                  </div>
                  <span className="font-mono font-medium">{formatValue(p.value, unit)}</span>
                </div>
              ))}
          </div>
        </div>
      )
    },
    [unit, isSeriesVisible],
  )

  const hasData = filteredChartData.length > 0

  const chartTitle = useMemo(() => {
    if (metricKey && series.length > 0) {
      return getChartTitle(series[0].labels, metricKey)
    }
    return undefined
  }, [metricKey, series])

  return (
    <div className="space-y-2 select-none">
      {chartTitle && (
        <h4 className="text-sm font-medium text-foreground px-2">{chartTitle}</h4>
      )}
      {/* Chart */}
      <div style={{ height, width: "100%" }} className="relative">
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10 pointer-events-none">
            No data in selected range
          </div>
        )}
        {onTimeRangeSelect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="absolute top-2 right-2 h-7 w-7 p-0 z-20 bg-background/80 hover:bg-background border border-border/50"
            title="Zoom out 100%"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        )}
        <ResponsiveContainer width="100%" height="100%" minHeight={height}>
          <LineChart data={filteredChartData} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} vertical={true} horizontal={true} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => formatTimestampSmart(v, rangeDurationMs)}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              angle={-45}
              textAnchor="end"
              minTickGap={20}
              domain={xDomain}
              type="number"
              tickCount={12}
              height={60}
            />
            <YAxis
              tickFormatter={(v) => formatValue(v)}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />

            {legendItems.map(
              (item) =>
                isSeriesVisible(item.key) && (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    stroke={item.color}
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: item.color, strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: item.color, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    name={item.label}
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                ),
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Integrated brush selector */}
      {onTimeRangeSelect && (
        <div className="relative -mt-8" style={{ marginLeft: '-8px', marginRight: '-8px' }}>
          <div style={{ paddingLeft: '58px', paddingRight: '24px' }}>
            <SimpleBrushSelector
              timeRange={timeRange}
              onTimeRangeChange={onTimeRangeSelect}
              height={25}
            />
          </div>
        </div>
      )}

      {/* Legend with toggle */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2">
        {legendItems.map((item) => (
          <button
            key={`${metricKey}-legend-${item.key}`}
            onClick={() => toggleSeries(item.key)}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-opacity",
              !isSeriesVisible(item.key) && "opacity-40",
            )}
          >
            <span className="w-3 h-[3px] rounded-full" style={{ backgroundColor: item.color }} />
            <span className={cn("text-muted-foreground", !isSeriesVisible(item.key) && "line-through")}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default memo(GrafanaChart, (prev, next) => {
  // Solo re-renderizar si cambia el timeRange o el número de samples
  if (prev.timeRange.startTimeNs !== next.timeRange.startTimeNs) return false
  if (prev.timeRange.endTimeNs !== next.timeRange.endTimeNs) return false
  if (prev.series.length !== next.series.length) return false
  
  // Verificar si cambió la cantidad de samples en alguna serie
  for (let i = 0; i < prev.series.length; i++) {
    if (prev.series[i].samples.length !== next.series[i].samples.length) return false
  }
  
  return true
})
