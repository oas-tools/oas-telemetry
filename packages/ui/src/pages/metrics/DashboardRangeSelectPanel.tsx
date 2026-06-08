"use client";
import { useEffect, useState } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export type DashboardOption = { label: string; value: number };

function toInputValue(ms: number): string {
    const date = new Date(ms);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`;
}

function formatRangeLabel(from: number, to: number, rel: DashboardOption | null): string {
    if (rel) {
        return rel.label;
    }
    const fmt = (ms: number) => {
        const d = new Date(ms);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    return `${fmt(from)} - ${fmt(to)}`;
}

interface MetricsTimeRangePopoverProps {
    from: number;
    to: number;
    relativeValue: DashboardOption | null;
    relativeOptions: DashboardOption[];
    onSelectRelative: (v: DashboardOption) => void;
    onSelectAbsolute: (from: number, to: number) => void;
}

export function DashboardRangeSelectPanel({
    from, to, relativeValue, relativeOptions, onSelectRelative, onSelectAbsolute
}: MetricsTimeRangePopoverProps) {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [absFrom, setAbsFrom] = useState<string>(toInputValue(from));
    const [absTo, setAbsTo] = useState<string>(toInputValue(to));

    useEffect(() => {
        if (popoverOpen) {
            setAbsFrom(toInputValue(from));
            setAbsTo(toInputValue(to));
        }
    }, [popoverOpen]);

    return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
                            {relativeOptions.map((opt: DashboardOption) => (
                                <Button
                                    key={opt.value}
                                    variant={relativeValue?.value === opt.value ? "default" : "ghost"}
                                    size="sm"
                                    className="justify-start text-xs"
                                    onClick={() => {
                                        onSelectRelative(opt);
                                        setPopoverOpen(false);
                                    }}
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
                                    step="1"
                                    value={absFrom}
                                    onChange={e => setAbsFrom(e.target.value)}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">To</label>
                                <input
                                    type="datetime-local"
                                    step="1"
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
                                    const fromDate = new Date(absFrom);
                                    const toDate = new Date(absTo);
                                    let f = fromDate.getTime();
                                    let t = toDate.getTime();
                                    if (from % 1000 !== 0 && toInputValue(from) === absFrom) {
                                        f = from;
                                    }
                                    if (to % 1000 !== 0 && toInputValue(to) === absTo) {
                                        t = to;
                                    }
                                    if (!isNaN(f) && !isNaN(t) && f < t) {
                                        onSelectAbsolute(f, t);
                                        setPopoverOpen(false);
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

