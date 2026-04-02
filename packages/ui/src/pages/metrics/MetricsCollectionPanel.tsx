import React, { useEffect, useState } from "react"
import { toast } from "sonner"
import { metricsService } from "@/services/metricsService"
import CollectionPanel from "@/components/CollectionPanel"

interface Props {
  onMetricsReset?: () => void
}

const MetricsCollectionPanel: React.FC<Props> = ({ onMetricsReset }) => {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{ active: boolean }>({ active: false })
  const [retentionTimeInSeconds, setRetentionTime] = useState("3600")
  const [expanded, setExpanded] = useState(true)

  // Helper for minimum loading duration
  const setLoadingWithDelay = async (promise: Promise<any>) => {
    setLoading(true)
    const start = Date.now()
    await promise
    const elapsed = Date.now() - start
    if (elapsed < 400) {
      await new Promise((resolve) => setTimeout(resolve, 400 - elapsed))
    }
    setLoading(false)
  }

  useEffect(() => {
    setLoadingWithDelay(
      Promise.all([
        (async () => {
          try {
            const time = await metricsService.getRetentionTime()
            setRetentionTime(time.toString())
          } catch {
            toast.error("Failed to fetch retention time")
          }
        })(),
        (async () => {
          try {
            const status = await metricsService.getStatus()
            setStatus(status)
          } catch {
            setStatus({ active: true })
            toast("Could not connect to telemetry service")
          }
        })(),
      ])
    )
  }, [])

  const handleToggle = async (checked: boolean) => {
    await setLoadingWithDelay((async () => {
      try {
        if (checked) {
          await metricsService.startCollection()
          toast.success("Metrics collection started")
        } else {
          await metricsService.stopCollection()
          toast.warning("Metrics collection stopped")
        }
        setStatus({ active: checked })
      } catch {
        toast.error(`Failed to ${checked ? "start" : "stop"} metrics collection`)
      }
    })())
  }

  const handleReset = async () => {
    await setLoadingWithDelay((async () => {
      try {
        await metricsService.resetMetrics()
        toast.success("All metrics cleared")
        onMetricsReset?.()
      } catch {
        toast.error("Failed to reset metrics")
      }
    })())
  }

  const handleSetRetentionTime = async () => {
    await setLoadingWithDelay((async () => {
      try {
        const time = Number.parseInt(retentionTimeInSeconds)
        if (isNaN(time) || time <= 0) {
          toast.error("Retention time must be a positive number")
          return
        }
        await metricsService.setRetentionTime(time)
        toast.success(`Metrics will be retained for ${time} seconds`)
      } catch {
        toast.error("Failed to set retention time")
      }
    })())
  }

  return (
    <CollectionPanel
      title="Metrics Collection"
      description="Control metrics collection and retention settings"
      status={status.active ? "collecting" : "paused"}
      loading={loading}
      retentionTime={retentionTimeInSeconds}
      onRetentionTimeChange={setRetentionTime}
      onToggleCollection={handleToggle}
      onReset={handleReset}
      onSetRetentionTime={handleSetRetentionTime}
      expanded={expanded}
      onToggleExpand={() => setExpanded((v) => !v)}
    />
  )
}

export default MetricsCollectionPanel
