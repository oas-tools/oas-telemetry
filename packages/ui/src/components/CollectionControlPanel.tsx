import React, { useEffect, useState } from "react"
import { toast } from "sonner"
import CollectionPanel from "@/components/CollectionPanel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface CollectionService {
  getStatus(): Promise<{ active: boolean }>
  startCollection(): Promise<void>
  stopCollection(): Promise<void>
  resetCollection(): Promise<void>
  setRetentionTime(seconds: number): Promise<any>
  getRetentionTime(): Promise<number>
}

interface Props {
  service: CollectionService
  resourceType: "logs" | "metrics" | "traces"
  onReset?: () => void
}

const CollectionControlPanel: React.FC<Props> = ({
  service,
  resourceType,
  onReset,
}) => {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{ active: boolean }>({ active: false })
  const [retentionTimeInSeconds, setRetentionTime] = useState("3600")
  const [expanded, setExpanded] = useState(true)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Capitalize resource type for display
  const resourceLabel = resourceType.charAt(0).toUpperCase() + resourceType.slice(1)

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
            const time = await service.getRetentionTime()
            setRetentionTime(time.toString())
          } catch {
            toast.error(`Failed to fetch retention time`)
          }
        })(),
        (async () => {
          try {
            const statusData = await service.getStatus()
            setStatus(statusData)
          } catch {
            setStatus({ active: true })
            toast("Could not connect to telemetry service")
          }
        })(),
      ])
    )
  }, [service])

  const handleToggleCollection = async (checked: boolean) => {
    await setLoadingWithDelay((async () => {
      try {
        if (checked) {
          await service.startCollection()
          toast.success(`${resourceLabel} collection started`)
        } else {
          await service.stopCollection()
          toast.warning(`${resourceLabel} collection stopped`)
        }
        setStatus({ active: checked })
      } catch {
        toast.error(`Failed to ${checked ? "start" : "stop"} ${resourceType} collection`)
      }
    })())
  }

  const handleReset = async () => {
    setShowResetConfirm(false)
    await setLoadingWithDelay((async () => {
      try {
        await service.resetCollection()
        toast.success(`All ${resourceType} cleared`)
        onReset?.()
      } catch {
        toast.error(`Failed to reset ${resourceType}`)
      }
    })())
  }

  const handleDownloadJSON = async () => {
    try {
      const endpoint = resourceType === "logs" ? "/api/logs/export" : "/api/traces/export"
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        toast.error("Failed to download data")
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${resourceType}-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`${resourceLabel} downloaded`)
    } catch {
      toast.error("Failed to download")
    }
  }

  const handleSetRetentionTime = async () => {
    await setLoadingWithDelay((async () => {
      try {
        const time = Number.parseInt(retentionTimeInSeconds)
        if (isNaN(time) || time <= 0) {
          toast.error("Retention time must be a positive number")
          return
        }
        await service.setRetentionTime(time)
        toast.success(`${resourceLabel} will be retained for ${time} seconds`)
      } catch {
        toast.error(`Failed to set retention time`)
      }
    })())
  }

  return (
    <>
      <CollectionPanel
        title={`${resourceLabel} Collection`}
        description={`Control ${resourceType} collection and retention settings`}
        status={status.active ? "collecting" : "paused"}
        loading={loading}
        retentionTime={retentionTimeInSeconds}
        onRetentionTimeChange={setRetentionTime}
        onToggleCollection={handleToggleCollection}
        onReset={() => setShowResetConfirm(true)}
        onDownload={handleDownloadJSON}
        onSetRetentionTime={handleSetRetentionTime}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
      />

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all {resourceType}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All {resourceType} data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CollectionControlPanel
