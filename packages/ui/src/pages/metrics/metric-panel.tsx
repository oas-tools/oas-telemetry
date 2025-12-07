"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, BarChart2, Activity, Gauge, Hash } from "lucide-react"
import type { Metric, ViewMode, TimeRange } from "./metrics-types"
import { DataPointType } from "./metrics-types"
import { getDataPointTypeLabel, getTemporalityLabel, parseMetricKey } from "./metrics-helpers"
import GrafanaChart from "./grafana-chart"
import LatestValueWidgets from "./latest-value-widgets"

interface MetricPanelProps {
  metric: Metric
  viewMode: ViewMode
  timeRange: TimeRange
  onTimeRangeSelect?: (range: TimeRange) => void
  isExpanded: boolean
  onToggleExpand: (shouldExpand: boolean) => void
}

function MetricPanel({ metric, viewMode, timeRange, onTimeRangeSelect, isExpanded, onToggleExpand }: MetricPanelProps) {
  const { metadata, series } = metric
  const { instrumentation, name } = parseMetricKey(metric.metricKey)
  const dataPointType = metadata.dataPointType
  let unit = metadata.descriptor?.unit
  if (unit === "1") {
    unit = "" // Omit unit if it's just a dimensionless "1"
  }
  const isHistogram = dataPointType === DataPointType.Histogram || dataPointType === DataPointType.ExponentialHistogram

  const getTypeIcon = () => {
    switch (dataPointType) {
      case DataPointType.Histogram:
      case DataPointType.ExponentialHistogram:
        return <BarChart2 className="h-3.5 w-3.5" />
      case DataPointType.Gauge:
        return <Gauge className="h-3.5 w-3.5" />
      case DataPointType.Sum:
        return <Hash className="h-3.5 w-3.5" />
      default:
        return <Activity className="h-3.5 w-3.5" />
    }
  }

  return (
    <Card className="overflow-hidden shadow-sm select-none">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CardHeader className="py-2.5 px-4 bg-muted/20 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">{name}</h3>
                  <Badge variant="outline" className="text-[10px] h-5 font-normal">
                    {instrumentation}
                  </Badge>
                </div>
                {metadata.descriptor?.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{metadata.descriptor.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1 text-[10px] h-5 font-normal">
                {getTypeIcon()}
                {getDataPointTypeLabel(dataPointType)}
              </Badge>

              {metadata.aggregationTemporality !== undefined && (
                <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                  {getTemporalityLabel(metadata.aggregationTemporality)}
                </Badge>
              )}

              {unit && (
                <Badge variant="outline" className="text-[10px] h-5 font-normal">
                  {"Unit: "+unit}
                </Badge>
              )}

              <Badge variant="outline" className="text-[10px] h-5 font-normal truncate max-w-[200px]">
                {timeRange.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0">
            {isExpanded && (viewMode === "history" || viewMode === "both") && (
              <>
                <div className="p-4 border-b space-y-4">
                  {series.length === 0 || series.every(s => s.samples.length === 0) ? (
                    <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                      <div className="text-center">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                        <p className="text-sm">Loading data...</p>
                      </div>
                    </div>
                  ) : isHistogram ? (
                    // One chart per label with p50, p95, p99 lines
                    series.map((s, idx) => (
                      <GrafanaChart
                        key={`${metric.metricKey}-percentiles-${idx}`}
                        series={[s]}
                        dataPointType={dataPointType}
                        unit={unit}
                        height={220}
                        timeRange={timeRange}
                        onTimeRangeSelect={onTimeRangeSelect}
                        metricKey={metric.metricKey}
                      />
                    ))
                ) : (
                    <GrafanaChart
                      series={series}
                      dataPointType={dataPointType}
                      unit={unit}
                      height={220}
                      timeRange={timeRange}
                      onTimeRangeSelect={onTimeRangeSelect}
                      metricKey={metric.metricKey}
                    />
                  )}
                </div>
              </>
            )}

            {isExpanded && (viewMode === "latest" || viewMode === "both") && <LatestValueWidgets metric={metric} />}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default memo(MetricPanel, (prev, next) => {
  if (prev.isExpanded !== next.isExpanded) return false
  if (prev.viewMode !== next.viewMode) return false
  if (prev.timeRange.startTimeNs !== next.timeRange.startTimeNs) return false
  if (prev.timeRange.endTimeNs !== next.timeRange.endTimeNs) return false
  if (!prev.isExpanded) return true
  if (prev.metric.series.length !== next.metric.series.length) return false
  for (let i = 0; i < prev.metric.series.length; i++) {
    if (prev.metric.series[i].samples.length !== next.metric.series[i].samples.length) return false
  }
  return true
})
