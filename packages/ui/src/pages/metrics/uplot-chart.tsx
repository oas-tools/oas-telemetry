"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import uPlot from "uplot"
import "uplot/dist/uPlot.min.css"
import type { Series, TimeRange, SeriesVisibility } from "./metrics-types"
import { DataPointType } from "./metrics-types"
import {
  formatTimestampSmart,
  formatValue,
  getSimpleSeriesLabel,
  getSeriesColor,
  extractHistogramPercentiles,
  getChartTitle,
} from "./metrics-helpers"
import { optimizeSamples } from "./data-optimizer"
import SimpleBrushSelector from "./simple-brush-selector"
import { Button } from "@/components/ui/button"
import { ZoomOut } from "lucide-react"

interface UplotChartProps {
  series: Series[]
  dataPointType: DataPointType
  unit?: string
  height?: number
  timeRange: TimeRange
  onTimeRangeSelect?: (range: TimeRange) => void
  metricKey?: string
}

function UplotChart({
  series,
  dataPointType,
  unit,
  height = 200,
  timeRange,
  onTimeRangeSelect,
  metricKey,
}: UplotChartProps) {
  const [seriesVisibility, setSeriesVisibility] = useState<SeriesVisibility>({})

  if (series.length === 0) return null

  // Preparar datos para histogramas
  if (dataPointType === DataPointType.Histogram || dataPointType === DataPointType.ExponentialHistogram) {
    const chartData = extractHistogramPercentiles(series, [50, 95, 99])
    const legendItems = series.flatMap((s, i) => [
      { key: `s${i}_p50`, label: "p50", color: getSeriesColor(i * 3) },
      { key: `s${i}_p95`, label: "p95", color: getSeriesColor(i * 3 + 1) },
      { key: `s${i}_p99`, label: "p99", color: getSeriesColor(i * 3 + 2) },
    ])
    
    return (
      <ChartRenderer 
        chartData={chartData}
        legendItems={legendItems}
        timeRange={timeRange}
        unit={unit}
        height={height}
        seriesVisibility={seriesVisibility}
        setSeriesVisibility={setSeriesVisibility}
        onTimeRangeSelect={onTimeRangeSelect}
        metricKey={metricKey}
      />
    )
  }

  // Preparar datos para métricas normales
  const dataMap = new Map<number, Record<string, number>>()
  series.forEach((s, seriesIndex) => {
    const samples = optimizeSamples(s.samples)
    samples.forEach((sample) => {
      const value = typeof sample.value === "number" ? sample.value : 0
      if (!dataMap.has(sample.timestamp)) {
        dataMap.set(sample.timestamp, { timestamp: sample.timestamp })
      }
      dataMap.get(sample.timestamp)![`s${seriesIndex}`] = value
    })
  })
  
  const chartData = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  const legendItems = series.map((s, i) => ({
    key: `s${i}`,
    label: getSimpleSeriesLabel(s.labels),
    color: getSeriesColor(i),
  }))
  
  return (
    <ChartRenderer 
      chartData={chartData}
      legendItems={legendItems}
      timeRange={timeRange}
      unit={unit}
      height={height}
      seriesVisibility={seriesVisibility}
      setSeriesVisibility={setSeriesVisibility}
      onTimeRangeSelect={onTimeRangeSelect}
      metricKey={metricKey}
    />
  )
}

function ChartRenderer({
  chartData,
  legendItems,
  timeRange,
  unit,
  height,
  seriesVisibility,
  setSeriesVisibility,
  onTimeRangeSelect,
  metricKey,
}: {
  chartData: Array<Record<string, number>>
  legendItems: Array<{ key: string; label: string; color: string }>
  timeRange: TimeRange
  unit?: string
  height: number
  seriesVisibility: SeriesVisibility
  setSeriesVisibility: (v: SeriesVisibility | ((prev: SeriesVisibility) => SeriesVisibility)) => void
  onTimeRangeSelect?: (range: TimeRange) => void
  metricKey?: string
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const uplotInstance = useRef<uPlot | null>(null)
  
  const rangeDurationMs = (timeRange.endTimeNs - timeRange.startTimeNs) / 1_000_000
  const hasData = chartData.length > 0

  // Convertir chartData a formato uPlot: [timestamps[], ...values[][]]
  const uplotData = useMemo(() => {
    if (chartData.length === 0) {
      return [[], ...legendItems.map(() => [])]
    }

    const timestamps = chartData.map(d => d.timestamp / 1_000_000_000) // uPlot usa segundos
    const seriesData = legendItems.map(item => 
      chartData.map(d => d[item.key] ?? null)
    )

    return [timestamps, ...seriesData]
  }, [chartData, legendItems])

  // Crear opciones de uPlot
  const opts = useMemo((): uPlot.Options => {
    const visibleSeries = legendItems.map((item) => 
      seriesVisibility[item.key] !== false
    )

    return {
      width: chartRef.current?.clientWidth || 800,
      height: height,
      padding: [8, 16, 0, 0],
      cursor: {
        drag: {
          x: false,
          y: false,
        },
        points: {
          size: 5,
          width: 1.5,
        },
      },
      legend: {
        show: true,
        live: true,
      },
      series: [
        {
          label: "Time",
        },
        ...legendItems.map((item, idx) => ({
          label: item.label,
          stroke: item.color,
          width: 1.5,
          show: visibleSeries[idx],
          spanGaps: true,
          value: (_u: uPlot, v: number | null) => v == null ? "-" : formatValue(v, unit),
        })),
      ],
      scales: {
        x: {
          time: true,
          range: [timeRange.startTimeNs / 1_000_000_000, timeRange.endTimeNs / 1_000_000_000],
        },
      },
      axes: [
        {
          stroke: "hsl(var(--muted-foreground))",
          grid: {
            stroke: "#374151",
            width: 1 / devicePixelRatio,
          },
          ticks: {
            stroke: "hsl(var(--border))",
          },
          font: "9px system-ui",
          values: (u, vals) => vals.map(v => formatTimestampSmart(v * 1_000_000_000, rangeDurationMs)),
        },
        {
          stroke: "hsl(var(--muted-foreground))",
          grid: {
            stroke: "#374151",
            width: 1 / devicePixelRatio,
          },
          ticks: {
            stroke: "hsl(var(--border))",
          },
          font: "10px system-ui",
          values: (u, vals) => vals.map(v => formatValue(v, unit)),
          size: 50,
        },
      ],
    }
  }, [legendItems, seriesVisibility, timeRange, unit, height, rangeDurationMs])

  // Crear el gráfico una vez
  useEffect(() => {
    if (!chartRef.current) return

    if (!uplotInstance.current) {
      uplotInstance.current = new uPlot(opts, uplotData as uPlot.AlignedData, chartRef.current)

      // Manejar clics en la leyenda para toggle de series
      const legend = chartRef.current.querySelector('.u-legend')
      if (legend) {
        legend.addEventListener('click', (e) => {
          const target = e.target as HTMLElement
          const seriesEl = target.closest('.u-series')
          if (seriesEl) {
            const seriesIdx = Array.from(legend.querySelectorAll('.u-series')).indexOf(seriesEl)
            if (seriesIdx > 0) { // Skip time series (index 0)
              const item = legendItems[seriesIdx - 1]
              if (item) {
                setSeriesVisibility(prev => ({
                  ...prev,
                  [item.key]: prev[item.key] === undefined ? false : !prev[item.key],
                }))
              }
            }
          }
        })
      }
    }

    return () => {
      if (uplotInstance.current) {
        uplotInstance.current.destroy()
        uplotInstance.current = null
      }
    }
  }, []) // Solo crear una vez

  // Actualizar datos suavemente cuando cambien
  useEffect(() => {
    if (uplotInstance.current && uplotData[0].length > 0) {
      uplotInstance.current.setData(uplotData as uPlot.AlignedData)
    }
  }, [uplotData])

  // Actualizar opciones cuando cambien (visibilidad de series, timeRange, etc)
  useEffect(() => {
    if (uplotInstance.current) {
      // Actualizar visibilidad de series
      legendItems.forEach((item, idx) => {
        const shouldShow = seriesVisibility[item.key] !== false
        if (uplotInstance.current!.series[idx + 1].show !== shouldShow) {
          uplotInstance.current!.setSeries(idx + 1, { show: shouldShow })
        }
      })

      // Actualizar rango del eje X si cambió el timeRange
      const currentRange = uplotInstance.current.scales.x.range as [number, number] | undefined
      const newRange: [number, number] = [
        timeRange.startTimeNs / 1_000_000_000, 
        timeRange.endTimeNs / 1_000_000_000
      ]
      
      if (!currentRange || currentRange[0] !== newRange[0] || currentRange[1] !== newRange[1]) {
        uplotInstance.current.setScale('x', { min: newRange[0], max: newRange[1] })
      }
    }
  }, [seriesVisibility, legendItems, timeRange])

  // Manejar resize
  useEffect(() => {
    if (!uplotInstance.current || !chartRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      if (uplotInstance.current && chartRef.current) {
        uplotInstance.current.setSize({
          width: chartRef.current.clientWidth,
          height: height,
        })
      }
    })

    resizeObserver.observe(chartRef.current)
    return () => resizeObserver.disconnect()
  }, [height])

  const handleZoomOut = () => {
    if (!onTimeRangeSelect) return
    const currentDuration = timeRange.endTimeNs - timeRange.startTimeNs
    const expansion = currentDuration
    const newStart = timeRange.startTimeNs - expansion / 2
    const newEnd = timeRange.endTimeNs + expansion / 2
    
    onTimeRangeSelect({
      label: `Zoomed out 100%`,
      startTimeNs: newStart,
      endTimeNs: newEnd,
      isRelative: false,
    })
  }

  const chartTitle = metricKey && chartData.length > 0 ? getChartTitle({}, metricKey) : undefined

  return (
    <div className="space-y-2 select-none">
      {chartTitle && (
        <h4 className="text-sm font-medium text-foreground px-2">{chartTitle}</h4>
      )}
      <div className="relative">
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10 pointer-events-none" style={{ height }}>
            No data available
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
        <div ref={chartRef} style={{ width: "100%", height }} />
      </div>

      {onTimeRangeSelect && (
        <div className="relative" style={{ marginLeft: '-8px', marginRight: '-8px', marginTop: '8px' }}>
          <div style={{ paddingLeft: '58px', paddingRight: '24px' }}>
            <SimpleBrushSelector
              timeRange={timeRange}
              onTimeRangeChange={onTimeRangeSelect}
              height={25}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default UplotChart
