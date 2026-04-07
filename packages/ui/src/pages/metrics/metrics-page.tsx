"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { useUPlotStyles } from "@/hooks/use-uplot-styles";
import CollapsibleCard from "@/components/CollapsibleCard";
import { metricsService } from "@/services/metricsService";
import { DashboardControlPanel, type DashboardOption } from "./DashboardControlPanel";
import MetricsCollectionPanel from "./MetricsCollectionPanel";


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
    const metricsCacheRef = useRef<Record<string, { seriesConfig: any[]; chartData: any[]; id: string; scopeName: string; scopeVersion: string; metricName: string }>>({});
    const [metricsCacheVersion, setMetricsCacheVersion] = useState(0); // force rerender when cache changes

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
                    const chartData = [timestamps, ...series.map((s: any) => s.values)];
                    const seriesConfig = series.map((s: any, i: number) => ({
                        id: `series${i}`,
                        label: s.attributes && Object.keys(s.attributes).length > 0
                            ? Object.entries(s.attributes).map(([k, v]) => `${k.split(".").pop() || k}=${v}`).join(", ")
                            : metricName,
                    }));
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
                        newCache[id] = {
                            id,
                            scopeName,
                            scopeVersion,
                            metricName,
                            chartData,
                            seriesConfig,
                        };
                    }
                    newExpanded.push(id);
                });
                // Remove any IDs not present in new data
                metricsCacheRef.current = newCache;
                setExpandedPanels(newExpanded);
                setMetricsCacheVersion(v => v + 1); // force rerender
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
    const handleChangeRange = useCallback(
        (newFrom: number, newTo: number, relOption?: { label: string; value: number }) => {
            setRange({ from: newFrom, to: newTo });
            if (relOption) {
                setRelativeOption(relOption);
            } else {
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
        setMetricsCacheVersion(v => v + 1);
        // Refetch with current range
        setRange(r => ({ ...r }));
    }, []);

    // Use cache for rendering
    const metricsList = Object.values(metricsCacheRef.current);

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-4 md:py-8 space-y-6">
                <MetricsCollectionPanel onMetricsReset={handleMetricsReset} />

                <DashboardControlPanel
                    from={range.from}
                    to={range.to}
                    onChangeRange={handleChangeRange}
                    onManualRefresh={() => {
                        let startMs = range.from;
                        let endMs = range.to;
                        if (isRelative && relativeOption?.value != null) {
                            const now = Date.now();
                            startMs = now - relativeOption.value;
                            endMs = now;
                            setRange({ from: startMs, to: endMs });
                        } else {
                            setRange(r => ({ ...r })); // force update
                        }
                    }}
                    relativeValue={relativeOption}
                    autoRefresh={autoRefreshOption}
                    setAutoRefresh={setAutoRefreshOption}
                    relativeOptions={RELATIVE_OPTIONS}
                    autoRefreshOptions={AUTOREFRESH_OPTIONS}
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