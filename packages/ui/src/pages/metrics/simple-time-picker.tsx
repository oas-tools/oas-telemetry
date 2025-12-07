"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Clock, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimeRange } from "./metrics-types"

const TIME_PRESETS = [
    { label: "Last 1m", minutes: 1 },
    { label: "Last 5m", minutes: 5 },
    { label: "Last 15m", minutes: 15 },
    { label: "Last 30m", minutes: 30 },
    { label: "Last 1h", minutes: 60 },
    { label: "Last 3h", minutes: 180 },
    { label: "Last 6h", minutes: 360 },
    { label: "Last 12h", minutes: 720 },
    { label: "Last 24h", minutes: 1440 },
    { label: "Last 2d", minutes: 2880 },
    { label: "Last 7d", minutes: 10080 },
]

interface SimpleTimePickerProps {
    timeRange: TimeRange
    onTimeRangeChange: (range: TimeRange) => void
}

export default function SimpleTimePicker({ timeRange, onTimeRangeChange }: SimpleTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handlePresetClick = useCallback(
        (preset: (typeof TIME_PRESETS)[0]) => {
            const now = Date.now()
            onTimeRangeChange({
                label: preset.label,
                startTimeNs: (now - preset.minutes * 60 * 1000) * 1_000_000,
                endTimeNs: now * 1_000_000,
                isRelative: true,
                relativeMinutes: preset.minutes,
            })
            setIsOpen(false)
        },
        [onTimeRangeChange],
    )

    const displayLabel = timeRange.isRelative
        ? timeRange.label
        : `${new Date(timeRange.startTimeNs / 1_000_000).toLocaleString()} - ${new Date(timeRange.endTimeNs / 1_000_000).toLocaleString()}`

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 gap-2 font-normal border-input bg-background hover:bg-accent",
                        "text-foreground min-w-[180px] justify-between",
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm truncate">{displayLabel}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                    {TIME_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => handlePresetClick(preset)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-sm",
                                "hover:bg-accent transition-colors",
                                timeRange.label === preset.label && timeRange.isRelative && "bg-accent font-medium",
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
