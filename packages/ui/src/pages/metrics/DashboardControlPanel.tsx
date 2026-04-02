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
                <Button variant="outline" className="min-w-[220px] justify-start text-left">
                    <span className="truncate">{formatRangeLabel(from, to, relativeValue)}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-4">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-1 flex-1">
                        <div className="font-semibold mb-1">Relative</div>
                        {relativeOptions.map(opt => (
                            <Button
                                key={opt.value}
                                variant={relativeValue?.value === opt.value ? "default" : "ghost"}
                                className={cn("justify-start", relativeValue?.value === opt.value && "font-bold")}
                                onClick={() => onSelectRelative(opt)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                    <Separator orientation="vertical" className="mx-2" />
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="font-semibold mb-1">Absolute</div>
                        <input
                            type="datetime-local"
                            value={absFrom}
                            onChange={e => setAbsFrom(e.target.value)}
                            className="border rounded px-2 py-1"
                        />
                        <input
                            type="datetime-local"
                            value={absTo}
                            onChange={e => setAbsTo(e.target.value)}
                            className="border rounded px-2 py-1"
                        />
                        <Button
                            variant="secondary"
                            className="mt-1"
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
            </PopoverContent>
        </Popover>
    );
}

export function DashboardControlPanel({
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
        <div className="sticky top-0 z-30 bg-background border-b py-2 px-4 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
                <span className="font-semibold">Time range:</span>
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
            <div className="flex items-center gap-2">
                <Button
                    onClick={onManualRefresh}
                    variant="outline"
                    className="px-3 py-1"
                    title="Manual refresh"
                >⟳ Refresh</Button>
                <Select
                    value={autoRefresh.value.toString()}
                    onValueChange={e => {
                        const found = autoRefreshOptions.find(opt => opt.value.toString() === e);
                        if (found) setAutoRefresh(found);
                    }}
                >
                    <SelectTrigger className="w-[120px]">
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
    );
}
