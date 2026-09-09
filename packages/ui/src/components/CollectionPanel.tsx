import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    CardDescription,
    CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Activity, Clock, FileUp, Pause, Play, RefreshCw, Trash } from "lucide-react"
import CollapsibleCard from "../components/CollapsibleCard"
import ImportExportDialog from "./ImportExportDialog"
import React, { useEffect, useState } from "react"
import { toast } from "sonner"

export interface CollectionService {
    getStatus(): Promise<{ active: boolean }>
    startCollection(): Promise<void>
    stopCollection(): Promise<void>
    resetCollection(): Promise<void>
    setRetentionTime(_: number): Promise<any>
    getRetentionTime(): Promise<number>
}

interface CollectionPanelProps {
    title?: string
    service: CollectionService
    resourceType: "logs" | "metrics" | "traces"
    onDownload?: () => Promise<void>
    onImport?: (file: File, options: { reset: boolean; format?: string }) => Promise<void>
    onReset?: () => void
}

const CollectionPanel: React.FC<CollectionPanelProps> = ({
    service,
    resourceType,
    onDownload,
    onImport,
    onReset: onResetCallback,
}) => {
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<{ active: boolean }>({ active: false })
    const [retentionHours, setRetentionHours] = useState("1")
    const [retentionMinutes, setRetentionMinutes] = useState("0")
    const [retentionSeconds, setRetentionSeconds] = useState("0")
    const [expanded, setExpanded] = useState(true)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [showImportExport, setShowImportExport] = useState(false)

    const resourceLabel = resourceType.charAt(0).toUpperCase() + resourceType.slice(1)

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
                service.getRetentionTime().then((t) => {
                    setRetentionHours(Math.floor(t / 3600).toString())
                    setRetentionMinutes(Math.floor((t % 3600) / 60).toString())
                    setRetentionSeconds((t % 60).toString())
                }).catch(() => toast.error("Failed to fetch retention time")),
                service.getStatus().then((s) => setStatus(s)).catch(() => {
                    setStatus({ active: true })
                    toast("Could not connect to service")
                }),
            ])
        )
    }, [service])

    const handleToggleCollection = async (checked: boolean) => {
        await setLoadingWithDelay(
            (checked ? service.startCollection() : service.stopCollection())
                .then(() => {
                    setStatus({ active: checked })
                    if (checked) {
                        toast.success(`${resourceLabel} collection started`)
                    } else {
                        toast.warning(`${resourceLabel} collection stopped`)
                    }
                })
                .catch(() => toast.error(`Failed to ${checked ? "start" : "stop"} ${resourceType} collection`))
        )
    }

    const handleReset = async () => {
        setShowResetConfirm(false)
        await setLoadingWithDelay(
            service.resetCollection()
                .then(() => {
                    toast.success(`All ${resourceType} cleared`)
                    onResetCallback?.()
                })
                .catch(() => toast.error(`Failed to reset ${resourceType}`))
        )
    }

    const handleSetRetentionTime = async () => {
        const hours = Number.parseInt(retentionHours)
        const minutes = Number.parseInt(retentionMinutes)
        const seconds = Number.parseInt(retentionSeconds)
        const time = hours * 3600 + minutes * 60 + seconds
        if (isNaN(time) || time <= 0 || hours < 0 || minutes < 0 || seconds < 0 || seconds > 59) {
            toast.error("Enter a valid retention time")
            return
        }
        await setLoadingWithDelay(
            service.setRetentionTime(time)
                .then(() => toast.success(`${resourceLabel} will be retained for ${hours} hours, ${minutes} minutes and ${seconds} seconds`))
                .catch(() => toast.error("Failed to set retention time"))
        )
    }

    return (
        <>
            <CollapsibleCard
                isOpen={expanded}
                onToggle={() => setExpanded((v) => !v)}
                header={
                    <>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            {resourceLabel} Collection
                            {loading && <RefreshCw className="animate-spin h-4 w-4 text-muted-foreground ml-2" />}
                        </CardTitle>
                        <CardDescription>Control {resourceType} collection and retention settings</CardDescription>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">Status:</span>
                            <Badge variant={status.active ? "default" : "secondary"}>
                                {status.active ? (
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
                                variant={status.active ? "outline" : "default"}
                                onClick={() => handleToggleCollection(!status.active)}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {status.active ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                {status.active ? "Pause" : "Start"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowImportExport(true)}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                <FileUp className="h-4 w-4 mr-2" />
                                Import/Export
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setShowResetConfirm(true)}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                <Trash className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSetRetentionTime()
                        }}
                        className="flex flex-col md:flex-row items-start md:items-end gap-2"
                    >
                        <div className="flex-1 w-full">
                            <Label className="text-sm">Retention Time</Label>
                            <div className="mt-1 grid grid-cols-3 gap-2">
                                <div>
                                    <Label htmlFor="retention-hours" className="text-xs text-muted-foreground">Hours</Label>
                                    <Input
                                        id="retention-hours"
                                        type="number"
                                        min="0"
                                        value={retentionHours}
                                        onChange={(e) => setRetentionHours(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="retention-minutes" className="text-xs text-muted-foreground">Minutes</Label>
                                    <Input
                                        id="retention-minutes"
                                        type="number"
                                        min="0"
                                        value={retentionMinutes}
                                        onChange={(e) => setRetentionMinutes(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="retention-seconds" className="text-xs text-muted-foreground">Seconds</Label>
                                    <Input
                                        id="retention-seconds"
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={retentionSeconds}
                                        onChange={(e) => setRetentionSeconds(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={loading}
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Set
                        </Button>
                    </form>
                </div>
            </CollapsibleCard>

            <ImportExportDialog
                open={showImportExport}
                onOpenChange={setShowImportExport}
                resourceType={resourceType}
                onDownload={onDownload}
                onImport={onImport}
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

export default CollectionPanel
