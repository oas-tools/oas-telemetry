"use client"

import { useState, useEffect, useCallback, useMemo, useRef, startTransition, useTransition } from "react"
import { toast } from "sonner"
import MetricsToolbar from "./metrics-toolbar"
import MetricPanel from "./metric-panel"

import { Activity } from "lucide-react"
import type { CollectionStatus, Metric, MetricsStats, TimeRange, ViewMode } from "./metrics-types"
import { parseMetricKey } from "./metrics-helpers"
import { metricsService } from "@/services/metricsService"

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
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [stats, setStats] = useState<MetricsStats | null>(null)
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>("collecting")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)
  const [isPending] = useTransition()

  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const now = Date.now()
    return {
      label: "Last 30m",
      startTimeNs: (now - 30 * 60 * 1000) * 1_000_000,
      endTimeNs: now * 1_000_000,
      isRelative: true,
      relativeMinutes: 30,
    }
  })

  // Filter state
  const [selectedInstrumentation, setSelectedInstrumentation] = useState("")
  const [selectedMetricNames, setSelectedMetricNames] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("both")
  const [autoRefreshInterval, setAutoRefreshInterval] = useState("10s")
  
  // Panel expansion state (FIFO - max 5 open)
  const [expandedPanels, setExpandedPanels] = useState<string[]>([])

  const loadInitialMetrics = useCallback(async () => {
    setIsLoading(true)
    try {
      const [metricsResponse, statsResponse] = await Promise.all([
        metricsService.findMetrics({
          format: "raw",
          instrumentation: selectedInstrumentation || undefined,
          startTimeNs: timeRange.startTimeNs,
          endTimeNs: timeRange.endTimeNs,
        }),
        metricsService.getStats(),
      ])

      const allMetrics = metricsResponse.metrics as Metric[]
      setMetrics(allMetrics)
      setStats(statsResponse)

      let newest = timeRange.startTimeNs
      allMetrics.forEach((metric) => {
        metric.series.forEach((series) => {
          series.samples.forEach((sample) => {
            if (sample.timestamp > newest && sample.timestamp <= timeRange.endTimeNs) {
              newest = sample.timestamp
            }
          })
        })
      })

      setLastTimestamp(newest)
    } catch (error) {
      console.error("Failed to load metrics:", error)
      toast.error("Failed to load metrics")
      setCollectionStatus("error")
    } finally {
      setIsLoading(false)
    }
  }, [selectedInstrumentation, timeRange.startTimeNs, timeRange.endTimeNs])

  useEffect(() => {
    loadInitialMetrics()
  }, [loadInitialMetrics])

  const isPollingRef = useRef(false)

  const pollNewMetrics = useCallback(async () => {
    if (!lastTimestamp || expandedPanels.length === 0 || isPollingRef.current) return
    
    isPollingRef.current = true
    const now = Date.now() * 1_000_000

    try {
      metricsService.getStats().then(setStats).catch(console.error)

      const metricsResponse = await metricsService.findNewerMetrics(
        {
          format: "raw",
          metricKeys: expandedPanels,
          instrumentation: selectedInstrumentation || undefined,
          startTimeNs: lastTimestamp,
          endTimeNs: now,
        },
        lastTimestamp
      )

      if (metricsResponse.metrics.length === 0) {
        isPollingRef.current = false
        return
      }

      let newest = lastTimestamp
      metricsResponse.metrics.forEach((metric) => {
        metric.series.forEach((series) => {
          series.samples.forEach((sample) => {
            if (sample.timestamp > newest) newest = sample.timestamp
          })
        })
      })

      // Usar startTransition para no bloquear interacciones del usuario
      startTransition(() => {
        setMetrics((prevMetrics) => {
          const metricsMap = new Map(prevMetrics.map(m => [m.metricKey, m]))
          
          metricsResponse.metrics.forEach((newMetric) => {
            const existing = metricsMap.get(newMetric.metricKey)

            if (existing) {
              const updatedSeries = existing.series.map((existingSeries, idx) => {
                const newSeries = newMetric.series[idx]
                if (!newSeries || newSeries.samples.length === 0) return existingSeries
                
                // Optimización: solo buscar duplicados en los últimos N samples
                const recentSamplesCount = Math.min(50, existingSeries.samples.length)
                const recentTimestamps = new Set(
                  existingSeries.samples.slice(-recentSamplesCount).map((s) => s.timestamp)
                )
                
                const newSamples = newSeries.samples.filter((s) => !recentTimestamps.has(s.timestamp))
                
                if (newSamples.length > 0) {
                  const allSamples = [...existingSeries.samples, ...(newSamples as any)]
                  return {
                    ...existingSeries,
                    samples: allSamples.slice(-1000)
                  }
                }
                return existingSeries
              })
              
              metricsMap.set(newMetric.metricKey, { ...existing, series: updatedSeries })
            } else {
              metricsMap.set(newMetric.metricKey, newMetric as any)
            }
          })

          return Array.from(metricsMap.values())
        })
        
        setLastTimestamp(newest)
      })
    } catch (error) {
      console.error("Failed to poll metrics:", error)
    } finally {
      isPollingRef.current = false
    }
  }, [lastTimestamp, selectedInstrumentation, expandedPanels])

  // Auto-refresh effect
  useEffect(() => {
    const intervalMs = REFRESH_INTERVALS[autoRefreshInterval]
    if (intervalMs === 0 || collectionStatus !== "collecting" || isLoading || !lastTimestamp) return

    const interval = setInterval(() => {
      pollNewMetrics()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [autoRefreshInterval, collectionStatus, isLoading, lastTimestamp, pollNewMetrics])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await pollNewMetrics()
    setTimeout(() => setIsRefreshing(false), 200)
  }, [pollNewMetrics])

  // Reset metrics
  const handleReset = useCallback(async () => {
    setMetrics([])
    setLastTimestamp(null)
    setSelectedInstrumentation("")
    setSelectedMetricNames([])
    await loadInitialMetrics()
  }, [loadInitialMetrics])

  // Toggle collection
  const handleToggleCollection = useCallback(() => {
    setCollectionStatus((prev) => (prev === "collecting" ? "paused" : "collecting"))
  }, [])

  const handleTimeRangeChange = useCallback(
    async (range: TimeRange) => {
      setTimeRange(range)
    },
    []
  )

  // Handle filter changes - reload data
  const handleInstrumentationChange = useCallback((instrumentation: string) => {
    setSelectedInstrumentation(instrumentation)
    setSelectedMetricNames([])
    setMetrics([])
    setLastTimestamp(null)
  }, [])

  const handleMetricNamesChange = useCallback((metricNames: string[]) => {
    setSelectedMetricNames(metricNames)
  }, [])

  const handlePanelToggle = useCallback((metricKey: string, shouldExpand: boolean) => {
    setExpandedPanels((prev) => {
      if (shouldExpand) {
        const filtered = prev.filter(k => k !== metricKey)
        return [...filtered, metricKey].slice(-5)
      }
      return prev.filter(k => k !== metricKey)
    })

    if (shouldExpand) {
      const metric = metrics.find(m => m.metricKey === metricKey)
      if (!metric || metric.series.length === 0 || metric.series.every(s => s.samples.length === 0)) {
        metricsService.findMetrics({
          format: "raw",
          metricKeys: [metricKey],
          startTimeNs: timeRange.startTimeNs,
          endTimeNs: timeRange.endTimeNs,
        }).then(response => {
          if (response.metrics.length > 0) {
            setMetrics(prev => {
              const existing = prev.find(m => m.metricKey === metricKey)
              return existing
                ? prev.map(m => m.metricKey === metricKey ? response.metrics[0] as Metric : m)
                : [...prev, response.metrics[0] as Metric]
            })
          }
        }).catch(console.error)
      }
    }
  }, [metrics, timeRange.startTimeNs, timeRange.endTimeNs])

  const instrumentations = useMemo(() => {
    const set = new Set<string>()
    metrics.forEach((m) => {
      const { instrumentation } = parseMetricKey(m.metricKey)
      set.add(instrumentation)
    })
    return Array.from(set).sort()
  }, [metrics])

  const metricNames = useMemo(() => {
    return metrics
      .filter((m) => {
        if (!selectedInstrumentation) return true
        const { instrumentation } = parseMetricKey(m.metricKey)
        return instrumentation === selectedInstrumentation
      })
      .map((m) => m.metricKey)
      .sort()
  }, [metrics, selectedInstrumentation])

  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      const { instrumentation } = parseMetricKey(m.metricKey)
      if (selectedInstrumentation && instrumentation !== selectedInstrumentation) return false
      if (selectedMetricNames.length > 0 && !selectedMetricNames.includes(m.metricKey)) return false
      return true
    })
  }, [metrics, selectedInstrumentation, selectedMetricNames])

  useEffect(() => {
    if (filteredMetrics.length > 0 && expandedPanels.length === 0) {
      const firstFive = filteredMetrics.slice(0, Math.min(5, filteredMetrics.length)).map(m => m.metricKey)
      setExpandedPanels(firstFive)
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
        collectionStatus={collectionStatus}
        autoRefreshInterval={autoRefreshInterval}
        isRefreshing={isRefreshing}
        onTimeRangeChange={handleTimeRangeChange}
        onInstrumentationChange={handleInstrumentationChange}
        onMetricNamesChange={handleMetricNamesChange}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        onReset={handleReset}
        onAutoRefreshChange={setAutoRefreshInterval}
        onToggleCollection={handleToggleCollection}
      />

      <main className="flex-1 p-4 space-y-4 max-w-[1800px] mx-auto w-full overflow-auto relative" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {isPending && (
          <div className="absolute top-2 right-2 z-10 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-md text-xs text-blue-600 dark:text-blue-400 animate-pulse">
            Updating charts...
          </div>
        )}
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
              key={metric.metricKey}
              metric={metric}
              viewMode={viewMode}
              timeRange={timeRange}
              onTimeRangeSelect={handleTimeRangeChange}
              isExpanded={expandedPanels.includes(metric.metricKey)}
              onToggleExpand={(shouldExpand) => handlePanelToggle(metric.metricKey, shouldExpand)}
            />
          ))
        )}
      </main>
    </div>
  )
}
