"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HistogramHeatmapChart } from "@/components/charts/histogram-heatmap-chart";
import { useUPlotStyles } from "@/hooks/use-uplot-styles";
import CollapsibleCard from "@/components/CollapsibleCard";
import { metricsService } from "@/services/metricsService";
import MetricsCollectionPanel from "./MetricsCollectionPanel";
import { DashboardRangeSelectPanel, type DashboardOption } from "./DashboardRangeSelectPanel";
import { RefreshCw } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Info } from "lucide-react";

// Own instrumentation scopes should be listed before third-party ones
// (e.g. @opentelemetry/instrumentation-*).
function isOwnScope(scopeName: string): boolean {
    return scopeName.toLowerCase().includes("oas");
}


const RELATIVE_OPTIONS: DashboardOption[] = [
    { label: "Last 1m", value: 1 * 60 * 1000 },
    { label: "Last 5m", value: 5 * 60 * 1000 },
    { label: "Last 15m", value: 15 * 60 * 1000 },
    { label: "Last 30m", value: 30 * 60 * 1000 },
    { label: "Last 1h", value: 60 * 60 * 1000 },
    { label: "Last 2h", value: 2 * 60 * 60 * 1000 },
    { label: "Last 6h", value: 6 * 60 * 60 * 1000 },
    { label: "Last 24h", value: 24 * 60 * 60 * 1000 },
];
const AUTOREFRESH_OPTIONS: DashboardOption[] = [
    { label: "Off", value: 0 },
    { label: "500ms", value: 500 },
    { label: "1s", value: 1 * 1000 },
    { label: "5s", value: 5 * 1000 },
    { label: "10s", value: 10 * 1000 },
];

export default function MetricsPage() {
    useUPlotStyles();
    const defaultRelative = RELATIVE_OPTIONS[1];
    const defaultAutoRefresh = AUTOREFRESH_OPTIONS[3];
    const initialTo = Date.now();
    const initialFrom = initialTo - defaultRelative.value;

    const [range, setRange] = useState<{ from: number; to: number }>({ from: initialFrom, to: initialTo });
    const [relativeOption, setRelativeOption] = useState<DashboardOption | null>(defaultRelative);
    const [autoRefreshOption, setAutoRefreshOption] = useState<DashboardOption>(defaultAutoRefresh);
    const [loading, setLoading] = useState(false);
    const [expandedPanels, setExpandedPanels] = useState<string[]>([]);
    const [, forceRerender] = useState(0);
    // Per-metric view mode for HISTOGRAM cards: classic per-bucket line chart vs. the new heatmap.
    const [histogramViewMode, setHistogramViewMode] = useState<Record<string, "line" | "heatmap">>({});
    const expandedPanelsRef = useRef<string[]>([]);
    const latestRequestIdRef = useRef(0);
    const isAutoRefreshTickRef = useRef(false);
    const isRelative = relativeOption != null;

    useEffect(() => {
        expandedPanelsRef.current = expandedPanels;
    }, [expandedPanels]);

    // Persistent cache for metric configs and data
    const metricsCacheRef = useRef<Record<string, {
        seriesConfig: any[]
        chartData: any[]
        id: string
        scopeName: string
        scopeVersion: string
        metricName: string
        descriptorType?: string
        descriptorUnit?: string
        descriptorDescription?: string
        histogramData?: {
            label: string;
            endTimes: number[]; // ms, aligned 1:1 with `values`
            values: ({ boundaries?: number[]; counts?: number[] } | null | undefined)[];
            unit: string;
            latestBoundaries: number[];
        } | null
    }>>({});
    // const [metricsCacheVersion, setMetricsCacheVersion] = useState(0); // force rerender when cache changes

    // Auto-refresh logic
    useAutoRefresh(isRelative, relativeOption?.value ?? null, setRange, autoRefreshOption.value, isAutoRefreshTickRef);

    // Fetch metrics data for a given range. When `scopeMetrics` is provided (non-empty),
    // only those scope+metric combinations are requested from the backend.
    const fetchMetricsData = useCallback(async (startMs: number, endMs: number, scopeMetrics?: { scope: { name: string; version?: string }; descriptor: { name: string } }[]) => {
        try {
            const res = await metricsService.findMetrics({
                from: startMs * 1_000_000, // ms -> ns
                to: endMs * 1_000_000, // ms -> ns
                scopeMetrics: scopeMetrics || [],
            });
            return res.scopeMetrics || [];
        } catch {
            return [];
        }
    }, []);

    // Deep compare for seriesConfig
    function isSeriesConfigEqual(a: any[], b: any[]): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i].id !== b[i].id || a[i].label !== b[i].label) return false;
        }
        return true;
    }

    // Fetch data whenever range or relativeValue changes
    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            const isAutoTick = isAutoRefreshTickRef.current;
            isAutoRefreshTickRef.current = false;

            const prevCache = metricsCacheRef.current;

            // On an auto-refresh tick we only need fresh data for panels that are
            // currently expanded (collapsed cards aren't rendered, so there's no
            // point asking the backend for their data). If nothing is expanded,
            // skip the request entirely.
            let scopeMetricsFilter: { scope: { name: string; version?: string }; descriptor: { name: string } }[] | undefined;
            if (isAutoTick) {
                const openMetrics = Object.values(prevCache).filter((m) => expandedPanelsRef.current.includes(m.id));
                if (openMetrics.length === 0) {
                    return;
                }
                scopeMetricsFilter = openMetrics.map((m) => ({
                    scope: { name: m.scopeName, version: m.scopeVersion === "no_scope" ? undefined : m.scopeVersion },
                    descriptor: { name: m.metricName },
                }));
            }

            setLoading(true);
            const requestId = ++latestRequestIdRef.current;
            try {
                const data = await fetchMetricsData(range.from, range.to, scopeMetricsFilter);
                if (!active || requestId !== latestRequestIdRef.current) return;
                // Partial (auto-refresh) fetches only touch the metrics they asked for;
                // everything else in the cache (including collapsed cards) is kept as-is.
                const newCache: typeof prevCache = isAutoTick ? { ...prevCache } : {};
                const newExpanded: string[] = [];
                // Track which IDs are still present
                data.forEach((metric: any) => {
                    const scopeName = metric.scope.name;
                    const scopeVersion = metric.scope.version || "no_scope";
                    const metricName = metric.descriptor.name;
                    const series = metric.series || [];
                    const attributesHash = series.map((s: any) => s.id).join("|");
                    const id = `${scopeName}@${scopeVersion}:${metricName}${attributesHash}`;
                    // X axis: convert nanoseconds -> milliseconds
                    const rawTimestamps = series[0]?.endTimes || [];
                    const timestamps = rawTimestamps.map((ns: number) => ns / 1_000_000);
                    // For HISTOGRAM, map values to a single number (e.g., count)
                    let chartData;
                    if (metric.descriptor.type === "HISTOGRAM") {
                        // Efficiently build one series per bucket, plus min and max, in a single pass
                        // Assume only one histogram series per metric (OpenTelemetry default)
                        const s = series[0];
                        if (s && Array.isArray(s.values) && s.values.length > 0) {
                            const bucketCount = s.values[0]?.buckets?.counts?.length || 0;
                            const bucketSeries: (number | null)[][] = Array.from({ length: bucketCount }, () => []);
                            const minSeries: (number | null)[] = [];
                            const maxSeries: (number | null)[] = [];
                            for (let i = 0; i < s.values.length; i++) {
                                const v = s.values[i];
                                if (v && v.buckets && Array.isArray(v.buckets.counts)) {
                                    for (let b = 0; b < bucketCount; b++) {
                                        bucketSeries[b].push(v.buckets.counts[b] ?? null);
                                    }
                                } else {
                                    for (let b = 0; b < bucketCount; b++) bucketSeries[b].push(null);
                                }
                                minSeries.push(v?.min ?? null);
                                maxSeries.push(v?.max ?? null);
                            }
                            chartData = [
                                timestamps,
                                ...bucketSeries,
                                minSeries,
                                maxSeries,
                            ];
                        } else {
                            chartData = [timestamps];
                        }
                    } else {
                        chartData = [timestamps, ...series.map((s: any) => s.values)];
                    }
                    let seriesConfig;
                    if (metric.descriptor.type === "HISTOGRAM") {
                        // One series per bucket, plus min and max
                        const s = series[0];
                        if (s && Array.isArray(s.values) && s.values.length > 0) {
                            const boundaries = s.values[0]?.buckets?.boundaries || [];
                            seriesConfig = [
                                ...boundaries.map((b: number, i: number) => ({
                                    id: `bucket_${i}`,
                                    label: `Bucket ${b}`,
                                })),
                                { id: "min", label: "Min", color: "#2e7d32" },
                                { id: "max", label: "Max", color: "#c62828" },
                            ];
                        } else {
                            seriesConfig = [];
                        }
                    } else {
                        seriesConfig = series.map((s: any, i: number) => ({
                            id: `series${i}`,
                            label: s.attributes && Object.keys(s.attributes).length > 0
                                ? Object.entries(s.attributes).map(([k, v]) => `${k.split(".").pop() || k}=${v}`).join(", ")
                                : metricName,
                        }));
                    }
                    const descriptorType = metric.descriptor.type;
                    const descriptorUnit = metric.descriptor.unit || "ms";

                    // For histograms, keep the per-timestamp bucket snapshots (used by
                    // the heatmap view) and the most recent boundaries (used as the
                    // canonical bucket layout for the y-axis labels).
                    let histogramData = null;
                    if (descriptorType === "HISTOGRAM" && series.length > 0) {
                        const firstSeries = series[0];
                        const rawValues = firstSeries.values || [];
                        const latestValue = rawValues[rawValues.length - 1];
                        const latestBoundaries: number[] =
                            latestValue?.buckets?.boundaries
                            ?? metric.descriptor.advice?.explicitBucketBoundaries
                            ?? [];
                        histogramData = {
                            label: metricName,
                            endTimes: (firstSeries.endTimes || []).map((ns: number) => ns / 1_000_000),
                            values: rawValues.map((v: any) => v?.buckets),
                            unit: descriptorUnit,
                            latestBoundaries,
                        };
                    }

                    if (
                        prevCache[id] &&
                        isSeriesConfigEqual(prevCache[id].seriesConfig, seriesConfig)
                    ) {
                        // Only update data, keep config reference
                        newCache[id] = {
                            ...prevCache[id],
                            chartData,
                            histogramData,
                        };
                    } else {
                        // New or changed config
                        newCache[id] = {
                            id,
                            scopeName,
                            scopeVersion,
                            metricName,
                            descriptorType,
                            descriptorUnit,
                            descriptorDescription: metric.descriptor.description,
                            chartData,
                            seriesConfig,
                            histogramData,
                        };
                    }
                    if (!isAutoTick) {
                        // Keep the panel's current open/closed state; only brand-new
                        // metrics get auto-expanded. This is what previously made
                        // every card pop back open on each refresh.
                        const isNewMetric = !prevCache[id];
                        const wasExpandedBefore = expandedPanelsRef.current.includes(id);
                        if (isNewMetric || wasExpandedBefore) {
                            newExpanded.push(id);
                        }
                    }
                });
                metricsCacheRef.current = newCache;
                if (isAutoTick) {
                    // Expanded state didn't change; just force a rerender to reflect the new chart data.
                    forceRerender((v) => v + 1);
                } else {
                    setExpandedPanels(newExpanded);
                }
            } finally {
                if (active && requestId === latestRequestIdRef.current) {
                    setLoading(false);
                }
            }
        };
        fetchData();
        return () => { active = false; };
    }, [range, relativeOption, isRelative, fetchMetricsData]);

    // Changing the range always triggers fetch via useEffect
    // Si relOption está presente, es un rango relativo (quick select), si no, es custom/drag
    const handleChangeRange = useCallback(
        (newFrom: number, newTo: number, relOption?: { label: string; value: number }) => {
            setRange({ from: newFrom, to: newTo });
            if (relOption) {
                setRelativeOption(relOption);
                // No tocar autorefresh, el usuario puede querer mantenerlo
            } else {
                // Custom range: desactivar relativo y autorefresh
                setRelativeOption(null);
                setAutoRefreshOption(AUTOREFRESH_OPTIONS[0]); // Off
            }
        },
        []
    );

    const handlePanelToggle = useCallback((id: string) => {
        setExpandedPanels((prev) =>
            prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
        );
    }, []);

    const handleMetricsReset = useCallback(() => {
        // Refetch with current range
        setRange(r => ({ ...r }));
    }, []);

    // Use cache for rendering. Own (oas-telemetry) scopes are shown first,
    // third-party (e.g. @opentelemetry/instrumentation-*) scopes after.
    const metricsList = Object.values(metricsCacheRef.current).sort(
        (a, b) => Number(isOwnScope(b.scopeName)) - Number(isOwnScope(a.scopeName))
    );

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-3 py-3 space-y-3">
                <MetricsCollectionPanel onMetricsReset={handleMetricsReset} />
                <div className="sticky top-0 z-10 -mx-3 px-3 py-1.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b flex flex-wrap gap-2 items-center">
                    <DashboardRangeSelectPanel
                        from={range.from}
                        to={range.to}
                        relativeValue={relativeOption}
                        relativeOptions={RELATIVE_OPTIONS}
                        onSelectRelative={(opt) => {
                            const now = Date.now();
                            setRange({ from: now - opt.value, to: now });
                            setRelativeOption(opt);
                            if (relativeOption === null) {
                                setAutoRefreshOption(defaultAutoRefresh);
                            }
                        }}
                        onSelectAbsolute={(from, to) => {
                            setRange({ from, to });
                            setRelativeOption(null);
                            setAutoRefreshOption(AUTOREFRESH_OPTIONS[0]); // Off
                        }}
                    />

                    <Select
                        value={autoRefreshOption.value.toString()}
                        onValueChange={(val) => {
                            const opt = AUTOREFRESH_OPTIONS.find(o => o.value.toString() === val);
                            if (opt) setAutoRefreshOption(opt);
                        }}
                        disabled={!isRelative}
                    >
                        <SelectTrigger className="h-9" size="default">
                            <RefreshCw className={`${autoRefreshOption.value > 0 ? "animate-spin" : ""}`} style={{ animationDuration: '6s' }} />
                            <SelectValue placeholder="Auto refresh" />
                        </SelectTrigger>
                        <SelectContent>
                            {AUTOREFRESH_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value.toString()}>
                                    {opt.label === "Off" ? "Off" : `Auto refresh: ${opt.label}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>


                {loading && metricsList.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">Loading metrics...</div>
                ) : metricsList.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">No metrics found.</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                        {metricsList.map((metric: any) => (
                            <CollapsibleCard
                                key={metric.id}
                                className="py-2 gap-2 h-full"
                                headerClassName="px-3 py-1.5 gap-1"
                                contentClassName="px-3 pb-3 pt-0 overflow-x-auto"
                                header={
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-medium text-sm truncate">{metric.metricName}</span>
                                            {metric.descriptorType && (
                                                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-normal">
                                                    {metric.descriptorType}
                                                </Badge>
                                            )}
                                            {metric.descriptorUnit && (
                                                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-normal">
                                                    {metric.descriptorUnit}
                                                </Badge>
                                            )}
                                            {metric.descriptorDescription && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            aria-label="Metric description"
                                                            className="shrink-0 text-muted-foreground"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Info className="h-3.5 w-3.5" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-auto max-w-xs text-xs p-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {metric.descriptorDescription}
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground truncate">
                                            {metric.scopeName}
                                            {metric.scopeVersion && metric.scopeVersion !== "no_scope" ? `@${metric.scopeVersion}` : ""}
                                        </div>
                                    </div>
                                }
                                headerAction={
                                    metric.descriptorType === "HISTOGRAM" ? (
                                        <ToggleGroup
                                            type="single"
                                            size="sm"
                                            value={histogramViewMode[metric.id] ?? "heatmap"}
                                            onValueChange={(v) => {
                                                if (!v) return;
                                                setHistogramViewMode((prev) => ({ ...prev, [metric.id]: v as "line" | "heatmap" }));
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="shrink-0"
                                        >
                                            <ToggleGroupItem value="line" className="text-[10px] h-6 px-2">Line</ToggleGroupItem>
                                            <ToggleGroupItem value="heatmap" className="text-[10px] h-6 px-2">Heatmap (beta)</ToggleGroupItem>
                                        </ToggleGroup>
                                    ) : undefined
                                }
                                isOpen={expandedPanels.includes(metric.id)}
                                onToggle={() => handlePanelToggle(metric.id)}
                            >
                                {metric.descriptorType === "HISTOGRAM" && metric.histogramData && (histogramViewMode[metric.id] ?? "heatmap") === "heatmap" ? (
                                    <HistogramHeatmapChart
                                        endTimes={metric.histogramData.endTimes}
                                        values={metric.histogramData.values}
                                        boundaries={metric.histogramData.latestBoundaries}
                                        unit={metric.descriptorUnit}
                                        timeRange={range}
                                        animateXAxis={isRelative}
                                        onRangeSelect={handleChangeRange}
                                    />
                                ) : (
                                    <TimeSeriesChart
                                        data={metric.chartData}
                                        seriesConfig={metric.seriesConfig}
                                        timeRange={range}
                                        animateXAxis={isRelative}
                                        onRangeSelect={handleChangeRange}
                                    />
                                )}
                            </CollapsibleCard>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

// Custom hook for auto-refresh logic
function useAutoRefresh(isRelative: boolean, relativeValue: number | null, setSelectedRange: (r: { from: number; to: number }) => void, autoRefreshInterval: number, isAutoRefreshTickRef: { current: boolean }) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (autoRefreshInterval > 0 && isRelative && relativeValue != null) {
            intervalRef.current = setInterval(() => {
                const now = Date.now();
                isAutoRefreshTickRef.current = true;
                setSelectedRange({ from: now - relativeValue, to: now });
            }, autoRefreshInterval);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [autoRefreshInterval, isRelative, relativeValue, setSelectedRange]);
}
