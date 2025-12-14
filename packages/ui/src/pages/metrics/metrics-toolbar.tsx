"use client"

import { memo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Activity, BarChart3, Database, Pause, Play, RotateCcw, RefreshCw, Calendar } from "lucide-react"
import SimpleTimePicker from "./simple-time-picker"
import type { TimeRange, MetricsStats, ViewMode, CollectionStatus } from "./metrics-types"
import { formatBytes } from "./metrics-helpers"
import { cn } from "../../lib/utils"
import { toast } from "sonner"

const REFRESH_OPTIONS = [
    { label: "Off", value: "off" },
    { label: "1s", value: "1s" },
    { label: "5s", value: "5s" },
    { label: "10s", value: "10s" },
    { label: "30s", value: "30s" },
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
]

interface MetricsToolbarProps {
    timeRange: TimeRange
    selectedInstrumentation: string
    selectedMetricNames: string[]
    viewMode: ViewMode
    instrumentations: string[]
    metricNames: string[]
    stats: MetricsStats | null
    collectionStatus: CollectionStatus
    autoRefreshInterval: string
    isRefreshing: boolean
    onTimeRangeChange: (range: TimeRange) => void
    onInstrumentationChange: (instrumentation: string) => void
    onMetricNamesChange: (metricNames: string[]) => void
    onViewModeChange: (mode: ViewMode) => void
    onRefresh: () => void
    onReset: () => void
    onAutoRefreshChange: (interval: string) => void
    onToggleCollection: () => void
}

function MetricsToolbar({
    timeRange,
    selectedInstrumentation,
    selectedMetricNames,
    viewMode,
    instrumentations,
    metricNames,
    stats,
    collectionStatus,
    autoRefreshInterval,
    isRefreshing,
    onTimeRangeChange,
    onInstrumentationChange,
    onMetricNamesChange,
    onViewModeChange,
    onRefresh,
    onReset,
    onAutoRefreshChange,
    onToggleCollection,
}: MetricsToolbarProps) {
    const handleMetricToggle = (metricName: string) => {
        if (selectedMetricNames.includes(metricName)) {
            onMetricNamesChange(selectedMetricNames.filter(m => m !== metricName))
        } else {
            onMetricNamesChange([...selectedMetricNames, metricName])
        }
    }

    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const handleAbsoluteTimeRange = () => {
        if (!startDate || !endDate) {
            toast.error("Please enter both start and end dates")
            return
        }

        const startMs = new Date(startDate).getTime()
        const endMs = new Date(endDate).getTime()

        if (isNaN(startMs) || isNaN(endMs)) {
            toast.error("Invalid date format")
            return
        }

        if (startMs >= endMs) {
            toast.error("End date must be after start date")
            return
        }

        console.log("Applying absolute time range:", { startMs, endMs })
        onTimeRangeChange({
            label: `${new Date(startMs).toISOString()} — ${new Date(endMs).toISOString()}`,
            startTimeNs: startMs * 1_000_000,
            endTimeNs: endMs * 1_000_000,
            isRelative: false,
        })
    }

    return (
        <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
            {/* Main toolbar row */}
            <div className="flex items-center justify-between gap-4 px-4 py-2 flex-wrap">
                {/* Left: Time range and refresh */}
                <div className="flex items-center gap-2">
                    <SimpleTimePicker timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Absolute time range">
                                <Calendar className="h-3.5 w-3.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm">Absolute Time Range</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Start Date & Time</label>
                                        <Input
                                            type="datetime-local"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">End Date & Time</label>
                                        <Input
                                            type="datetime-local"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <Button onClick={handleAbsoluteTimeRange} size="sm" className="w-full h-8">
                                        Apply Range
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="h-8 w-8 p-0 bg-transparent"
                        title="Refresh"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                    </Button>

                    <Select value={autoRefreshInterval} onValueChange={onAutoRefreshChange}>
                        <SelectTrigger className="h-8 w-[70px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {REFRESH_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Center: Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value="multi" onValueChange={() => { }}>
                        <SelectTrigger className="h-8 w-[200px] text-xs">
                            <SelectValue>
                                {selectedMetricNames.length === 0 ? "All metrics" : `${selectedMetricNames.length} selected`}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <div className="px-2 py-1.5 text-[10px] text-muted-foreground border-b mb-1">
                                Select metrics to display
                            </div>
                            {selectedMetricNames.length > 0 && (
                                <button
                                    onClick={() => onMetricNamesChange([])}
                                    className="w-full text-left px-2 py-1.5 text-xs text-destructive hover:bg-accent rounded-sm"
                                >
                                    Clear all
                                </button>
                            )}
                            {metricNames.map((name) => {
                                const isSelected = selectedMetricNames.includes(name)
                                return (
                                    <button
                                        key={name}
                                        onClick={() => handleMetricToggle(name)}
                                        className={cn(
                                            "w-full text-left px-2 py-1.5 text-xs rounded-sm flex items-center gap-2 hover:bg-accent",
                                            isSelected && "bg-accent font-medium"
                                        )}
                                    >
                                        <span className={cn("w-3 h-3 border rounded", isSelected && "bg-primary border-primary")} />
                                        {name.split(":").pop() || name}
                                    </button>
                                )
                            })}
                        </SelectContent>
                    </Select>

                    <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="history">History</SelectItem>
                            <SelectItem value="latest">Latest</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Right: Stats and controls */}
                <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                    {/* Collection Status Badge */}
                    <Badge variant={collectionStatus === "collecting" ? "default" : "secondary"} className="h-7">
                        {collectionStatus === "collecting" ? (
                            <>
                                <Activity className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Collecting</span>
                            </>
                        ) : collectionStatus === "paused" ? (
                            <>
                                <Pause className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Paused</span>
                            </>
                        ) : (
                            <>
                                <Activity className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Error</span>
                            </>
                        )}
                    </Badge>

                    {/* Stats */}
                    {stats && (
                        <>
                            <div className="hidden md:flex items-center gap-1 text-xs lg:text-sm">
                                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{stats.totalMetrics}</span>
                                <span className="text-muted-foreground hidden lg:inline">metrics</span>
                            </div>

                            <div className="hidden md:flex items-center gap-1 text-xs lg:text-sm">
                                <Activity className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{stats.totalSeries}</span>
                                <span className="text-muted-foreground hidden lg:inline">series</span>
                            </div>

                            <div className="hidden sm:flex items-center gap-1 text-xs lg:text-sm">
                                <Database className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{stats.totalSamples?.toLocaleString()}</span>
                                <span className="text-muted-foreground hidden lg:inline">samples</span>
                            </div>

                            <div className="flex items-center gap-1 text-xs lg:text-sm">
                                <Database className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{formatBytes(stats.memoryUsageBytes)}</span>
                            </div>
                        </>
                    )}

                    <div className="hidden sm:block h-6 w-px bg-border" />

                    {/* Control Buttons */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant={collectionStatus === "collecting" ? "outline" : "default"}
                            size="sm"
                            onClick={onToggleCollection}
                            className="h-8"
                            title={collectionStatus === "collecting" ? "Pause collection" : "Start collection"}
                        >
                            {collectionStatus === "collecting" ? (
                                <Pause className="h-3 w-3" />
                            ) : (
                                <Play className="h-3 w-3" />
                            )}
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onReset}
                            className="h-8"
                            title="Reset all metrics"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(MetricsToolbar)
