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
import { Activity, RefreshCw, Clock, Plus, Play, Trash } from "lucide-react"
import { toast } from "sonner"
import { logsService, type LogStatus } from "@/services/logService"

interface Props {
  onLogsReset?: () => void
}

const LogsManagementCard: React.FC<Props> = ({ onLogsReset }) => {
  const [loading, setLoading] = useState(true)
  const [logStatus, setLogStatus] = useState<LogStatus>({ active: false })
  const [retentionTime, setRetentionTime] = useState("3600")

  useEffect(() => {
    const fetchRetentionTime = async () => {
      try {
        const time = await logsService.getRetentionTime()
        setRetentionTime(time.toString())
      } catch {
        toast.error("Failed to fetch retention time")
      }
    }
    const fetchStatus = async () => {
      try {
        const status = await logsService.getStatus()
        setLogStatus(status)
      } catch {
        setLogStatus({ active: true })
        toast("Could not connect to telemetry service")
      }
    }
    setLoading(true)
    Promise.all([fetchRetentionTime(), fetchStatus()]).finally(() => setLoading(false))
  }, [])

  const handleLogToggle = async (checked: boolean) => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const handleResetLogs = async () => {
    setLoading(true)
    try {
      await logsService.resetLogs()
      toast.success("All logs cleared")
      onLogsReset?.()
    } catch {
      toast.error("Failed to reset logs")
    } finally {
      setLoading(false)
    }
  }

  const handleSetRetentionTime = async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLog = async () => {
    try {
      await logsService.generateLog("Sample log message")
      toast.success("A new log entry was generated. Wait a few seconds.")
    } catch {
      toast.error("Failed to generate log.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Logs Management
        </CardTitle>
        <CardDescription>
          Control logs collection and data management
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row flex-wrap gap-2">
              <Button
                size="sm"
                variant={logStatus.active ? "outline" : "default"}
                onClick={() => handleLogToggle(!logStatus.active)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {logStatus.active ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                {logStatus.active ? "Stop Collection" : "Start Collection"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleResetLogs}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Trash className="h-4 w-4 mr-2" />
                Reset Logs
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateLog}
                disabled={loading}
                className="w-full sm:w-auto bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Sample Log
              </Button>
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
                size="sm"
                onClick={handleSetRetentionTime}
                className="w-full sm:w-auto"
                disabled={loading}
              >
                <Clock className="h-4 w-4 mr-2" />
                Set Retention
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default LogsManagementCard
