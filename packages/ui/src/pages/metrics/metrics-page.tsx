"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { useUPlotStyles } from "@/hooks/use-uplot-styles";
import CollapsibleCard from "@/components/CollapsibleCard";
import { metricsService } from "@/services/metricsService";
import MetricsCollectionPanel from "./MetricsCollectionPanel";
import { DashboardRangeSelectPanel, type DashboardOption } from "./DashboardRangeSelectPanel";


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
    const latestRequestIdRef = useRef(0);
    const isRelative = relativeOption != null;

    // Persistent cache for metric configs and data
    const metricsCacheRef = useRef<Record<string, { 
        seriesConfig: any[]
        chartData: any[]
        id: string
        scopeName: string
        scopeVersion: string
        metricName: string
        descriptorType?: string
        histogramData?: {
            label: string;
            endTimes: number[];
            values: number[];
            unit: string;
        } | null
    }>>({});
    // const [metricsCacheVersion, setMetricsCacheVersion] = useState(0); // force rerender when cache changes

    // Auto-refresh logic
    useAutoRefresh(isRelative, relativeOption?.value ?? null, setRange, autoRefreshOption.value);

    // Fetch metrics data for a given range
    const fetchMetricsData = useCallback(async (startMs: number, endMs: number) => {
        try {
            const res = await metricsService.findMetrics({
                from: startMs * 1_000_000, // ms -> ns
                to: endMs * 1_000_000, // ms -> ns
                scopeMetrics: [],
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
            setLoading(true);
            const requestId = ++latestRequestIdRef.current;
            try {
                const data = await fetchMetricsData(range.from, range.to);
                if (!active || requestId !== latestRequestIdRef.current) return;
                const prevCache = metricsCacheRef.current;
                const newCache: typeof prevCache = {};
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
                    if (
                        prevCache[id] &&
                        isSeriesConfigEqual(prevCache[id].seriesConfig, seriesConfig)
                    ) {
                        // Only update data, keep config reference
                        newCache[id] = {
                            ...prevCache[id],
                            chartData,
                        };
                    } else {
                        // New or changed config
                        const descriptorType = metric.descriptor.type;
                        const descriptorUnit = metric.descriptor.unit || "ms";
                        
                        // For histograms, use first series data
                        let histogramData = null;
                        if (descriptorType === "HISTOGRAM" && series.length > 0) {
                            const firstSeries = series[0];
                            histogramData = {
                                label: metricName,
                                endTimes: firstSeries.endTimes,
                                values: firstSeries.values,
                                unit: descriptorUnit,
                            };
                        }
                        
                        newCache[id] = {
                            id,
                            scopeName,
                            scopeVersion,
                            metricName,
                            descriptorType,
                            chartData,
                            seriesConfig,
                            histogramData,
                        };
                    }
                    newExpanded.push(id);
                });
                // Remove any IDs not present in new data
                metricsCacheRef.current = newCache;
                setExpandedPanels(newExpanded);
                // force rerender if needed
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

    // Use cache for rendering
    const metricsList = Object.values(metricsCacheRef.current);

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-4 md:py-8 space-y-6">
                <MetricsCollectionPanel onMetricsReset={handleMetricsReset} />

                <DashboardRangeSelectPanel
                    from={range.from}
                    to={range.to}
                    relativeValue={relativeOption}
                    relativeOptions={RELATIVE_OPTIONS}
                    onSelectRelative={(opt) => {
                        const now = Date.now();
                        setRange({ from: now - opt.value, to: now });
                        setRelativeOption(opt);
                    }}
                    onSelectAbsolute={(from, to) => {
                        setRange({ from, to });
                        setRelativeOption(null);
                        setAutoRefreshOption(AUTOREFRESH_OPTIONS[0]); // Off
                    }}
                />


                {loading && metricsList.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">Loading metrics...</div>
                ) : metricsList.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">No metrics found.</div>
                ) : (
                    metricsList.map((metric: any) => (
                        <CollapsibleCard
                            key={metric.id}
                            header={metric.metricName}
                            isOpen={expandedPanels.includes(metric.id)}
                            onToggle={() => handlePanelToggle(metric.id)}
                        >
                            {/* Always use TimeSeriesChart. For HISTOGRAM, transform data first. */}
                            <TimeSeriesChart
                                data={metric.chartData}
                                seriesConfig={metric.seriesConfig}
                                timeRange={range}
                                animateXAxis={isRelative}
                                onRangeSelect={handleChangeRange}
                            />
                        </CollapsibleCard>
                    ))
                )}
            </main>
        </div>
    );
}

// Custom hook for auto-refresh logic
function useAutoRefresh(isRelative: boolean, relativeValue: number | null, setSelectedRange: (r: { from: number; to: number }) => void, autoRefreshInterval: number) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (autoRefreshInterval > 0 && isRelative && relativeValue != null) {
            intervalRef.current = setInterval(() => {
                const now = Date.now();
                setSelectedRange({ from: now - relativeValue, to: now });
            }, autoRefreshInterval);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [autoRefreshInterval, isRelative, relativeValue, setSelectedRange]);
}