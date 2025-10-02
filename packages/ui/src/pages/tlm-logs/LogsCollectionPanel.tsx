import React, { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Activity, RefreshCw, Clock, Play, Pause, Trash } from "lucide-react"
import { toast } from "sonner"
import { logsService, type LogStatus } from "@/services/logService"
import CollapsibleCard from "./CollapsibleCard"

interface Props {
  onLogsReset?: () => void
}

const LogsCollectionPanel: React.FC<Props> = ({ onLogsReset }) => {
  const [loading, setLoading] = useState(true)
  const [logStatus, setLogStatus] = useState<LogStatus>({ active: false })
  const [retentionTime, setRetentionTime] = useState("3600")
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
            const time = await logsService.getRetentionTime()
            setRetentionTime(time.toString())
          } catch {
            toast.error("Failed to fetch retention time")
          }
        })(),
        (async () => {
          try {
            const status = await logsService.getStatus()
            setLogStatus(status)
          } catch {
            setLogStatus({ active: true })
            toast("Could not connect to telemetry service")
          }
        })(),
      ])
    )
  }, [])

  const handleLogToggle = async (checked: boolean) => {
    await setLoadingWithDelay((async () => {
      try {
        if (checked) {
          await logsService.startCollection()
          toast.success("Logs collection started")
        } else {
          await logsService.stopCollection()
          toast.warning("Logs collection stopped")
        }
        setLogStatus({ active: checked })
      } catch {
        toast.error(`Failed to ${checked ? "start" : "stop"} log collection`)
      }
    })())
  }

  const handleResetLogs = async () => {
    await setLoadingWithDelay((async () => {
      try {
        await logsService.resetLogs()
        toast.success("All logs cleared")
        onLogsReset?.()
      } catch {
        toast.error("Failed to reset logs")
      }
    })())
  }

  const handleSetRetentionTime = async () => {
    await setLoadingWithDelay((async () => {
      try {
        const time = Number.parseInt(retentionTime)
        if (isNaN(time) || time <= 0) {
          toast.error("Retention time must be a positive number")
          return
        }
        await logsService.setRetentionTime(time)
        toast.success(`Logs will be retained for ${time} seconds`)
      } catch {
        toast.error("Failed to set retention time")
      }
    })())
  }

  return (
    <CollapsibleCard
      isOpen={expanded}
      onToggle={() => setExpanded((v) => !v)}
      header={
        <>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs Collection
            {loading && (
              <RefreshCw className="animate-spin h-4 w-4 text-muted-foreground ml-2" />
            )}
          </CardTitle>
          <CardDescription>
            Control logs collection and retention settings
          </CardDescription>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Current Status:</span>
            <Badge variant={logStatus.active ? "default" : "secondary"}>
              {logStatus.active ? (
                <>
                  <Activity className="h-4 w-4 mr-1 inline" />
                  Collecting
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1 inline" />
                  Paused
                </>
              )}
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant={logStatus.active ? "outline" : "default"}
              onClick={() => handleLogToggle(!logStatus.active)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {logStatus.active ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {logStatus.active ? "Pause Collection" : "Start Collection"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetLogs}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Trash className="h-4 w-4 mr-2" />
              Reset Logs
            </Button>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col md:flex-row items-start md:items-end gap-2">
          <div className="flex-1 w-full">
            <Label htmlFor="retention-time" className="text-sm">
              Retention Time (seconds)
            </Label>
            <Input
              id="retention-time"
              type="number"
              value={retentionTime}
              onChange={(e) => setRetentionTime(e.target.value)}
              placeholder="3600"
              className="mt-1"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSetRetentionTime}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            <Clock className="h-4 w-4 mr-2" />
            Set Retention
          </Button>
        </div>
      </div>
    </CollapsibleCard>
  )
}

export default LogsCollectionPanel
