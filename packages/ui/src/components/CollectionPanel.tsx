import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CardDescription,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Activity, Clock, Pause, Play, RefreshCw, Trash } from "lucide-react"
import CollapsibleCard from "../components/CollapsibleCard"
import React from "react"

interface CollectionPanelProps {
  title: string
  description?: string
  status: "collecting" | "paused"
  loading: boolean
  retentionTime: string
  onRetentionTimeChange: (v: string) => void
  onToggleCollection: (checked: boolean) => void
  onReset: () => void
  onSetRetentionTime: () => void
  expanded: boolean
  onToggleExpand: () => void
}

const CollectionPanel: React.FC<CollectionPanelProps> = ({
  title,
  description,
  status,
  loading,
  retentionTime,
  onRetentionTimeChange,
  onToggleCollection,
  onReset,
  onSetRetentionTime,
  expanded,
  onToggleExpand,
}) => {
  return (
    <CollapsibleCard
      isOpen={expanded}
      onToggle={onToggleExpand}
      header={
        <>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
            {loading && (
              <RefreshCw className="animate-spin h-4 w-4 text-muted-foreground ml-2" />
            )}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Current Status:</span>
            <Badge variant={status === "collecting" ? "default" : "secondary"}>
              {status === "collecting" ? (
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
              variant={status === "collecting" ? "outline" : "default"}
              onClick={() => onToggleCollection(status !== "collecting")}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {status === "collecting" ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {status === "collecting" ? "Pause Collection" : "Start Collection"}
            </Button>
            <Button
              variant="destructive"
              onClick={onReset}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Trash className="h-4 w-4 mr-2" />
              Reset
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
              onChange={(e) => onRetentionTimeChange(e.target.value)}
              placeholder="3600"
              className="mt-1"
              disabled={loading}
            />
          </div>
          <Button
            onClick={onSetRetentionTime}
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

export default CollectionPanel
