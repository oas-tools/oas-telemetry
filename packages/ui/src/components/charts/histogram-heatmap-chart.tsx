"use client";

import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { formatTimeString, bucketRangeLabel, dynamicAxisSize } from "./utils";
import { ChartTooltip, type TooltipData } from "./chart-tooltip";

export type HistogramBucketSnapshot = {
    boundaries?: number[];
    counts?: number[];
} | null | undefined;

export type HistogramHeatmapChartProps = {
    /** Timestamps in ms, one per bucket snapshot. */
    endTimes: number[];
    /** Per-timestamp bucket snapshot, aligned 1:1 with `endTimes`. */
    values: HistogramBucketSnapshot[];
    /** Canonical bucket boundaries, used for the y-axis range labels. */
    boundaries: number[];
    unit?: string;
    height?: number;
    onRangeSelect?: (from: number, to: number) => void;
    timeRange?: { from: number; to: number };
    animateXAxis?: boolean;
    className?: string;
};

function colorForIntensity(alpha: number): string {
    const a = Math.max(0, Math.min(1, alpha));
    const lightness = 92 - a * 57; // 92% (near-empty) -> 35% (max)
    return `hsl(217, 75%, ${lightness}%)`;
}

export function HistogramHeatmapChart({
    endTimes,
    values,
    boundaries,
    unit,
    height,
    onRangeSelect,
    timeRange,
    animateXAxis,
    className,
}: HistogramHeatmapChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const uplotRef = useRef<uPlot | null>(null);
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const [plotSize, setPlotSize] = useState({ width: 0, height: 0 });
    // Kept in a ref so the draw/cursor hooks (bound once, on chart creation)
    // always read the latest data without needing to recreate the uPlot instance.
    const dataRef = useRef({ endTimes, values, boundaries });
    dataRef.current = { endTimes, values, boundaries };

    const bucketCount = boundaries.length;
    // Give every bucket row enough vertical room so its label never gets
    // hidden/overlapped, however many buckets the histogram has.
    const resolvedHeight = height ?? Math.max(280, bucketCount * 26);

    // Create chart once per bucket layout (recreate if the bucket count changes,
    // same as the line chart recreates when its series config changes).
    useEffect(() => {
        if (!chartRef.current) return;

        let overPlot: HTMLElement;
        let bLeft = 0;
        let bTop = 0;
        let boundsDirty = true;
        const syncBounds = () => {
            if (!overPlot || !boundsDirty) return;
            const bbox = overPlot.getBoundingClientRect();
            bLeft = bbox.left;
            bTop = bbox.top;
            boundsDirty = false;
        };

        const options: uPlot.Options = {
            width: chartRef.current.clientWidth,
            height: resolvedHeight,
            pxAlign: false,
            cursor: {
                x: true,
                y: false,
                drag: { x: true, y: false, setScale: false },
            },
            scales: {
                x: {
                    time: false,
                    min: timeRange?.from,
                    max: timeRange?.to,
                },
                y: {
                    range: () => [-0.5, Math.max(0.5, dataRef.current.boundaries.length - 0.5)],
                },
            },
            axes: [
                {
                    stroke: "#64748b",
                    grid: { show: false },
                    font: "12px Inter, sans-serif",
                    space: 50,
                    gap: 0, // Places labels close to the axis
                    values: (_, ticks) => ticks.map((t) => formatTimeString(t as number)),
                },
                {
                    side: 3, // Left axis
                    gap: 0, // Places labels close to the axis
                    stroke: "#64748b",
                    grid: { show: false },
                    font: "11px Inter, sans-serif",
                    // One tick per bucket, labeled with its range (e.g. "0.005-0.01s").
                    // `filter` is forced to keep every tick so buckets never get
                    // silently hidden due to space/collision heuristics, and `size`
                    // is measured from the actual text so labels never get clipped.
                    splits: () => {
                        const n = dataRef.current.boundaries.length;
                        return Array.from({ length: n }, (_, i) => i);
                    },
                    filter: (_, splits) => splits,
                    values: (_, ticks) =>
                        ticks.map((t) => bucketRangeLabel(t as number, dataRef.current.boundaries, unit)),
                    size: dynamicAxisSize(10, 32),
                },
            ],
            series: [
                {},
                { show: false },
            ],
            legend: { show: false },
            hooks: {
                init: [
                    (u) => {
                        overPlot = u.over;
                        boundsDirty = true;
                        syncBounds();
                        overPlot.addEventListener("mouseleave", () => setTooltipData(null));
                        window.addEventListener("scroll", () => { boundsDirty = true; }, { passive: true });
                        window.addEventListener("resize", () => { boundsDirty = true; }, { passive: true });
                    },
                ],
                setSize: [() => { boundsDirty = true; }],
                setSelect: [
                    (u) => {
                        if (!onRangeSelect) return;
                        const min = u.select.left;
                        const max = u.select.left + u.select.width;
                        if (min !== undefined && max !== undefined) {
                            onRangeSelect(u.posToVal(min, "x"), u.posToVal(max, "x"));
                        }
                    },
                ],
                setCursor: [
                    (u) => {
                        const { left, top, idx } = u.cursor;
                        const { endTimes: xs, values: vals, boundaries: bnds } = dataRef.current;
                        if (left == null || top == null || idx == null || xs[idx] == null) {
                            setTooltipData(null);
                            return;
                        }
                        const counts = vals[idx]?.counts;
                        if (!counts || counts.length === 0) {
                            setTooltipData(null);
                            return;
                        }

                        syncBounds();

                        const series = counts
                            .map((count, b) => ({
                                label: bucketRangeLabel(b, bnds, unit),
                                value: count ?? null,
                                color: colorForIntensity(count ? 0.7 : 0.15),
                            }))
                            .filter((s) => s.value != null && s.value > 0);

                        setTooltipData({
                            timeString: formatTimeString(xs[idx]),
                            x: left,
                            y: top,
                            left: bLeft,
                            top: bTop,
                            series: series.length > 0 ? series : [{ label: "No events", value: 0, color: colorForIntensity(0) }],
                        });
                    },
                ],
                draw: [
                    (u) => {
                        const { endTimes: xs, values: vals, boundaries: bnds } = dataRef.current;
                        const bucketN = bnds.length;
                        if (xs.length === 0 || bucketN === 0) return;

                        let maxCount = 0;
                        for (const v of vals) {
                            const counts = v?.counts;
                            if (!counts) continue;
                            for (const c of counts) if (c != null && c > maxCount) maxCount = c;
                        }

                        // Half-width of a cell in px, based on the median spacing between points.
                        let cellPx = 20;
                        if (xs.length > 1) {
                            const deltas: number[] = [];
                            for (let i = 1; i < xs.length; i++) {
                                deltas.push(u.valToPos(xs[i], "x", true) - u.valToPos(xs[i - 1], "x", true));
                            }
                            deltas.sort((a, b) => a - b);
                            cellPx = Math.max(2, deltas[Math.floor(deltas.length / 2)]);
                        }

                        const ctx = u.ctx;
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
                        ctx.clip();

                        for (let i = 0; i < xs.length; i++) {
                            const counts = vals[i]?.counts;
                            if (!counts) continue;
                            const xCenter = u.valToPos(xs[i], "x", true);
                            const x0 = xCenter - cellPx / 2;

                            for (let b = 0; b < bucketN; b++) {
                                const val = counts[b];
                                if (!val) continue; // skip empty buckets, keep background visible
                                const y0 = u.valToPos(b - 0.5, "y", true);
                                const y1 = u.valToPos(b + 0.5, "y", true);
                                const alpha = maxCount > 0 ? Math.max(val / maxCount, 0.08) : 0;
                                ctx.fillStyle = colorForIntensity(alpha);
                                ctx.fillRect(x0, Math.min(y0, y1), cellPx, Math.abs(y1 - y0));
                            }
                        }

                        ctx.restore();
                    },
                ],
            },
        };

        const plot = new uPlot(options, [[], []], chartRef.current);
        uplotRef.current = plot;
        setPlotSize({ width: plot.over.clientWidth, height: plot.over.clientHeight });

        return () => {
            plot.destroy();
            uplotRef.current = null;
        };
        // Axes/hooks read from dataRef, so values/endTimes don't need to be in deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedHeight, onRangeSelect, bucketCount]);

    // Update data + trigger a repaint (the draw hook reads dataRef directly).
    useEffect(() => {
        if (!uplotRef.current) return;
        const resetScales = !timeRange;
        uplotRef.current.setData([endTimes, endTimes.map(() => 0)], resetScales);
        if (timeRange && !animateXAxis) {
            uplotRef.current.setScale("x", { min: timeRange.from, max: timeRange.to });
        }
        uplotRef.current.redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endTimes, values, boundaries, timeRange, animateXAxis]);

    // Clear visual selection and update scale whenever timeRange changes
    useEffect(() => {
        if (uplotRef.current) {
            uplotRef.current.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
            if (timeRange && !animateXAxis) {
                uplotRef.current.setScale("x", { min: timeRange.from, max: timeRange.to });
            }
        }
    }, [timeRange, animateXAxis]);

    // Animate x-axis: slide the [now - window, now] range, same as the line chart.
    useEffect(() => {
        let rafId: number | null = null;
        let running = true;
        let lastMax = 0;
        function animate() {
            if (!running || !timeRange || !uplotRef.current) return;
            const now = Date.now();
            const windowSize = timeRange.to - timeRange.from;
            const minDelta = windowSize / (uplotRef.current.over.clientWidth || 800);
            if (now - lastMax >= minDelta) {
                lastMax = now;
                uplotRef.current.setScale("x", { min: now - windowSize, max: now });
            }
            rafId = requestAnimationFrame(animate);
        }
        if (animateXAxis && timeRange && uplotRef.current) {
            animate();
        }
        return () => {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [timeRange, animateXAxis]);

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (uplotRef.current && chartRef.current) {
                uplotRef.current.setSize({ width: chartRef.current.clientWidth, height: resolvedHeight });
                setPlotSize({ width: chartRef.current.clientWidth, height: resolvedHeight });
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [resolvedHeight]);

    const hasData = endTimes.length > 0 && bucketCount > 0;

    return (
        <div className={className}>
            <div style={{ position: "relative" }}>
                {!hasData && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground pointer-events-none">
                        No data available
                    </div>
                )}
                <div ref={chartRef} style={{ width: "100%" }} />
            </div>
            <ChartTooltip data={tooltipData} plotWidth={plotSize.width} plotHeight={plotSize.height} />
        </div>
    );
}
