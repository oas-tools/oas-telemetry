
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { TimeRange, ViewMode } from "./metrics-types"
import { TimeSeriesChart } from "@/components/charts/time-series-chart"
import { ChartPanel } from "@/components/charts"
import { useUPlotStyles } from "@/hooks/use-uplot-styles"

// Time range utility (mimics useTimeRange from page.tsx)
function useSimpleTimeRange(defaultMinutes = 30) {
  const [range, setRange] = useState<TimeRange>(() => {
    const now = Date.now()
    return {
      label: `Last ${defaultMinutes}m`,
      startTimeNs: (now - defaultMinutes * 60 * 1000) * 1_000_000,
      endTimeNs: now * 1_000_000,
      isRelative: true,
      relativeMinutes: defaultMinutes,
    }
  })

  const setRelative = (minutes: number) => {
    const now = Date.now()
    setRange({
      label: `Last ${minutes}m`,
      startTimeNs: (now - minutes * 60 * 1000) * 1_000_000,
      endTimeNs: now * 1_000_000,
      isRelative: true,
      relativeMinutes: minutes,
    })
  }

  const setAbsolute = (from: number, to: number) => {
    setRange({
      label: "Custom",
      startTimeNs: from * 1_000_000,
      endTimeNs: to * 1_000_000,
      isRelative: false,
      relativeMinutes: 0,
    })
  }

  return { timeRange: range, setRelative, setAbsolute }
}

const REFRESH_INTERVALS: Record<string, number> = {
  off: 0,
  "500ms": 500,
  "1s":  1000 * 1,
  "5s": 1000 * 5,
  "10s": 1000 * 10,
  "30s": 1000 * 30,
  "1m": 1000 * 60 * 1,
  "5m": 1000 * 60 * 5,
  "15m": 1000 * 60 * 15,
  "30m": 1000 * 60 * 30,
  "1h": 1000 * 60 * 60 * 1,
  "2h": 1000 * 60 * 60 * 2,
  "1d": 1000 * 60 * 60 * 24 * 1,
  "1w": 1000 * 60 * 60 * 24 * 7 * 1,
}

export default function MetricsPage() {
      useUPlotStyles();

    const data: any = [[1,2,3],[2,2,2],[1,2,3],[1.5,null,2]]
    const seriesConfig = [
        {id: "metric1", label: 'metric1', color: 'blue', defaultInterval: 500, generateValue: (x: number) => 1},
        {id: "metric2", label: 'metric2', color: 'red', defaultInterval: 500, generateValue: (x: number) => 2},
        {id: "metric3", label: 'metric3', color: 'red', defaultInterval: 500, generateValue: (x: number) => 2},
    ]
    const config = {title: 'Sample Chart'}
    const onRangeSelect = (from: number, to: number) => {
        console.log("Selected range:", from, to)
    }
    const timeRange  = { from: Date.now()-30000, to: Date.now() }
    
    return (
            <ChartPanel title={config.title}>
      <TimeSeriesChart
        data={data}
        seriesConfig={seriesConfig}
        timeRange={timeRange}
        onRangeSelect={onRangeSelect}
      />
    </ChartPanel>
    )
}
