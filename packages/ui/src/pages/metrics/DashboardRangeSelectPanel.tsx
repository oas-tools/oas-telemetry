"use client";
import { useEffect, useState } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select"
import { RefreshCw } from "lucide-react"

export type DashboardOption = { label: string; value: number };


function toInputValue(ms: number) {
    return new Date(ms).toISOString().slice(0, 16)
}

function formatRangeLabel(from: number, to: number, rel: DashboardOption | null) {
    if (rel) {
        return rel.label;
    }
    const fmt = (ms: number) => {
        const d = new Date(ms);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    return `${fmt(from)} - ${fmt(to)}`;
}

function MetricsTimeRangePopover({
    from, to, relativeValue, relativeOptions,
    onSelectRelative, onSelectAbsolute
}: {
    from: number,
    to: number,
    relativeValue: DashboardOption | null,
    relativeOptions: DashboardOption[],
    onSelectRelative: (v: DashboardOption) => void,
    onSelectAbsolute: (from: number, to: number) => void,
}) {
    const [absFrom, setAbsFrom] = useState(toInputValue(from))
    const [absTo, setAbsTo] = useState(toInputValue(to))

    useEffect(() => {
        setAbsFrom(toInputValue(from))
        setAbsTo(toInputValue(to))
    }, [from, to])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto justify-start">
                    <span className="truncate text-sm">{formatRangeLabel(from, to, relativeValue)}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3">
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-semibold mb-2">Quick select</p>
                        <div className="grid gap-1">
                            {relativeOptions.map(opt => (
                                <Button
                                    key={opt.value}
                                    variant={relativeValue?.value === opt.value ? "default" : "ghost"}
                                    size="sm"
                                    className="justify-start text-xs"
                                    onClick={() => onSelectRelative(opt)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div>
                        <p className="text-sm font-semibold mb-2">Custom range</p>
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs text-muted-foreground">From</label>
                                <input
                                    type="datetime-local"
                                    value={absFrom}
                                    onChange={e => setAbsFrom(e.target.value)}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">To</label>
                                <input
                                    type="datetime-local"
                                    value={absTo}
                                    onChange={e => setAbsTo(e.target.value)}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                />
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => {
                                    const f = new Date(absFrom).getTime();
                                    const t = new Date(absTo).getTime();
                                    if (!isNaN(f) && !isNaN(t) && f < t) {
                                        onSelectAbsolute(f, t);
                                    }
                                }}
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function DashboardRangeSelectPanel({
    from, to, onChangeRange, onManualRefresh,
    relativeValue, autoRefresh, setAutoRefresh,
    relativeOptions, autoRefreshOptions
}: {
    from: number,
    to: number,
    relativeValue: DashboardOption | null,
    autoRefresh: DashboardOption,
    onChangeRange: (from: number, to: number, relativeValue?: DashboardOption) => void,
    onManualRefresh: () => void,
    setAutoRefresh: (v: DashboardOption) => void,
    relativeOptions: DashboardOption[],
    autoRefreshOptions: DashboardOption[],
}) {
    return (
        <div className="sticky top-0 z-30 bg-background border-b">
            <div className="flex flex-col sm:flex-row gap-3 p-3 sm:items-center sm:justify-between">
                {/* Time Range */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <span className="text-sm font-medium whitespace-nowrap">Time range:</span>
                    <MetricsTimeRangePopover
                        from={from}
                        to={to}
                        relativeValue={relativeValue}
                        relativeOptions={relativeOptions}
                        onSelectRelative={(opt) => {
                            const now = Date.now();
                            onChangeRange(now - opt.value, now, opt);
                        }}
                        onSelectAbsolute={(f, t) => {
                            onChangeRange(f, t);
                        }}
                    />
                </div>

                {/* Refresh & Auto-refresh */}
                <div className="flex gap-2 sm:justify-end">
                    <Button
                        onClick={onManualRefresh}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Select
                        value={autoRefresh.value.toString()}
                        onValueChange={e => {
                            const found = autoRefreshOptions.find(opt => opt.value.toString() === e);
                            if (found) setAutoRefresh(found);
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-auto text-sm">
                            <SelectValue placeholder="Auto-refresh" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Auto-refresh</SelectLabel>
                                {autoRefreshOptions.map(opt =>
                                    <SelectItem key={opt.value} value={opt.value.toString()}>
                                        {opt.label}
                                    </SelectItem>
                                )}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
