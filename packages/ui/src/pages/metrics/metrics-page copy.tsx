
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import MetricsToolbar from "./metrics-toolbar"
import MetricPanel from "./metric-panel"
import { Activity } from "lucide-react"
import { metricsService } from "@/services/metricsService"
// import { parseMetricKey } from "./metrics-helpers"
import type { MetricsStats } from "./metrics-types"

import type { TimeRange, ViewMode } from "./metrics-types"

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
  "1s": 1000,
  "5s": 5000,
  "10s": 10000,
  "30s": 30000,
  "1m": 60000,
  "5m": 300000,
}

export default function MetricsPage() {
  // State
  const [metrics, setMetrics] = useState<any[]>([])
  const [stats, setStats] = useState<MetricsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState("10s")
  const [selectedInstrumentation, setSelectedInstrumentation] = useState("")
  const [selectedMetricNames, setSelectedMetricNames] = useState<string[]>([])
  const [expandedPanels, setExpandedPanels] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("both")

  // Time range
  const { timeRange, setRelative, setAbsolute } = useSimpleTimeRange(30)

  // Fetch metrics for the current range and filters
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true)
    try {
      const [metricsResponse, statsResponse] = await Promise.all([
        metricsService.findMetrics({
          format: "raw",
          from: timeRange.startTimeNs,
          to: timeRange.endTimeNs,
          // Filtering by instrumentation/metric names if needed
          scopeMetrics: selectedInstrumentation
            ? [{ metricId: { scope: { name: selectedInstrumentation }, metricName: "" } }]
            : undefined,
        }),
        metricsService.getStats(),
      ])
      setMetrics(metricsResponse.scopeMetrics || [])
      setStats(statsResponse)
    } catch {
      toast.error("Failed to load metrics")
      setMetrics([])
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, selectedInstrumentation])

  // Initial and refresh effect
  useEffect(() => {
    fetchMetrics()
    // eslint-disable-next-line
  }, [timeRange, selectedInstrumentation])

  // Auto-refresh effect
  useEffect(() => {
    const intervalMs = REFRESH_INTERVALS[autoRefreshInterval]
    if (!intervalMs) return
    const interval = setInterval(() => {
      fetchMetrics()
    }, intervalMs)
    return () => clearInterval(interval)
  }, [autoRefreshInterval, fetchMetrics])

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await fetchMetrics()
    setTimeout(() => setIsRefreshing(false), 200)
  }, [fetchMetrics])

  const handleReset = useCallback(async () => {
    setSelectedInstrumentation("")
    setSelectedMetricNames([])
    // setExpandedPanels([])
    setRelative(30)
    await fetchMetrics()
  }, [fetchMetrics, setRelative])

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    if (range.isRelative) {
      setRelative(range.relativeMinutes ?? 30)
    } else {
      // Convert ns to ms for setAbsolute
      setAbsolute(range.startTimeNs / 1_000_000, range.endTimeNs / 1_000_000)
    }
  }, [setRelative, setAbsolute])

  const handlePanelToggle = useCallback((metricKey: string, shouldExpand: boolean) => {
    setExpandedPanels((prev) => {
      if (shouldExpand) {
        const filtered = prev.filter(k => k !== metricKey)
        return [...filtered, metricKey].slice(-5)
      }
      return prev.filter(k => k !== metricKey)
    })
  }, [])

  // Instrumentations and metric names
  const instrumentations = useMemo(() => {
    const set = new Set<string>()
    metrics.forEach((m) => {
      set.add(m.scope.name)
    })
    return Array.from(set).sort()
  }, [metrics])

  const metricNames = useMemo(() => {
    return metrics
      .filter((m) => {
        if (!selectedInstrumentation) return true
        return m.scope.name === selectedInstrumentation
      })
      .map((m) => m.descriptor.name)
      .sort()
  }, [metrics, selectedInstrumentation])

  // Filtered metrics
  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      if (selectedInstrumentation && m.scope.name !== selectedInstrumentation) return false
      if (selectedMetricNames.length > 0 && !selectedMetricNames.includes(m.descriptor.name)) return false
      return true
    })
  }, [metrics, selectedInstrumentation, selectedMetricNames])

  // Auto-expand first 5 panels
  useEffect(() => {
    if (filteredMetrics.length > 0 && expandedPanels.length === 0) {
      setExpandedPanels(filteredMetrics.slice(0, 5).map(m => m.descriptor.name))
    }
  }, [filteredMetrics, expandedPanels.length])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetricsToolbar
        timeRange={timeRange}
        selectedInstrumentation={selectedInstrumentation}
        selectedMetricNames={selectedMetricNames}
        viewMode={viewMode}
        instrumentations={instrumentations}
        metricNames={metricNames}
        stats={stats}
        collectionStatus={"collecting"}
        autoRefreshInterval={autoRefreshInterval}
        isRefreshing={isRefreshing}
        onTimeRangeChange={handleTimeRangeChange}
        onInstrumentationChange={setSelectedInstrumentation}
        onMetricNamesChange={setSelectedMetricNames}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        onReset={handleReset}
        onAutoRefreshChange={setAutoRefreshInterval}
        onToggleCollection={() => {}}
      />

      <main className="flex-1 p-4 space-y-4 max-w-[1800px] mx-auto w-full overflow-auto relative" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {isLoading && metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50 animate-pulse" />
            <p className="text-lg font-medium">Loading metrics...</p>
          </div>
        ) : filteredMetrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No metrics found</p>
            <p className="text-sm">Try adjusting your filters or wait for new data</p>
          </div>
        ) : (
          filteredMetrics.map((metric) => (
            <MetricPanel
              key={metric.descriptor.name}
              metric={metric}
              viewMode={viewMode}
              timeRange={timeRange}
              onTimeRangeSelect={handleTimeRangeChange}
              isExpanded={expandedPanels.includes(metric.descriptor.name)}
              onToggleExpand={(shouldExpand) => handlePanelToggle(metric.descriptor.name, shouldExpand)}
            />
          ))
        )}
      </main>
    </div>
  )
}
