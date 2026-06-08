"use client";

import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { getColorFromPalette, formatTimeString } from "./utils";
import { ChartTooltip, type TooltipData } from "./chart-tooltip";

export type SeriesConfig = {
    id: string;
    label: string;
    color?: string; // Optional: if not provided, uPlot will generate colors automatically
};

export type TimeSeriesChartProps = {
    data: (number | null)[][];
    seriesConfig: SeriesConfig[];
    height?: number;
    onRangeSelect?: (from: number, to: number) => void;
    timeRange?: { from: number; to: number };
    animateXAxis?: boolean;
    className?: string;
};




export function TimeSeriesChart({
    data,
    seriesConfig,
    height = 350,
    onRangeSelect,
    timeRange,
    animateXAxis,
    className,
}: TimeSeriesChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const uplotRef = useRef<uPlot | null>(null);
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const [plotSize, setPlotSize] = useState({ width: 0, height });

    // Only create chart on mount or when main params change.
    useEffect(() => {
        if (!chartRef.current) return;
        if (uplotRef.current) return; // Already created
        const plugin = tooltipPlugin(seriesConfig, setTooltipData);
        const timeGapRefiner = createCachedTimeGapRefiner(1.6);

        const options: uPlot.Options = {
            width: chartRef.current.clientWidth,
            height,
            pxAlign: false,
            cursor: {
                x: true,
                y: false,
                drag: {
                    x: true,
                    y: false,
                    setScale: false,
                },
                dataIdx: (self, seriesIdx, hoveredIdx, cursorXVal) => {
                    const prevIdx = self.data[0][hoveredIdx] > cursorXVal ? hoveredIdx - 1 : hoveredIdx;
                    const yVals = self.data[seriesIdx];
                    let idx = prevIdx;
                    while (idx >= 0 && yVals[idx] == null) {
                        idx--;
                    }
                    return idx >= 0 ? idx : hoveredIdx;
                },
            },
            scales: {
                x: {
                    time: false,
                    min: timeRange?.from,
                    max: timeRange?.to,
                }
            },
            axes: [
                {
                    stroke: "#64748b",
                    grid: {
                        show: true,
                        stroke: "#e2e8f0",
                        width: 1,
                    },
                    space: 50,
                    font: "12px Inter, sans-serif",
                    values: (_, ticks) => ticks.map((t) => formatTimeString(t as number)),
                },
                {
                    stroke: "#64748b",
                    grid: {
                        show: true,
                        stroke: "#e2e8f0",
                        width: 1,
                    },
                    font: "12px Inter, sans-serif",
                },
            ],
            series: [
                {}, // x-axis
                ...seriesConfig.map((cfg, i) => {
                    const color = cfg.color || getColorFromPalette(i);
                    return {
                        label: cfg.label,
                        stroke: color,
                        width: 2,
                        spanGaps: false,
                        gaps: timeGapRefiner,
                        paths: uPlot.paths.linear!(),
                        points: {
                          size: 8,
                          width: 5,
                        },
                    };
                }),
            ],
            legend: {
                show: true,
                live: false,

            },
            hooks: {
                setSelect: [
                    (u) => {
                        if (!onRangeSelect) return;

                        const min = u.select.left;
                        const max = u.select.left + u.select.width;

                        if (min !== undefined && max !== undefined) {
                            const minX = u.posToVal(min, "x");
                            const maxX = u.posToVal(max, "x");
                            //
                            onRangeSelect(minX, maxX);
                        }
                    },
                ],
            },
            plugins: [plugin],
        };
        // Create with empty data
        const plot = new uPlot(
            options,
            [[], []],
            chartRef.current
        );
        uplotRef.current = plot;
        setPlotSize({ width: plot.over.clientWidth, height: plot.over.clientHeight });
        //
        return () => {
            plot.destroy();
            uplotRef.current = null;
        };
        //If seriesConfig changes, we need to recreate the chart to update series
    }, [height, onRangeSelect, seriesConfig]);

    // Update data when it changes, no need to recreate chart
    useEffect(() => {
        if (!uplotRef.current) return;
        const resetScales = !timeRange;
        uplotRef.current.setData(data as any, resetScales);
        if (timeRange && !animateXAxis) {
            uplotRef.current.setScale("x", { min: timeRange.from, max: timeRange.to });
        }
    }, [data, timeRange, animateXAxis]);

    // Clear visual selection and update scale whenever timeRange changes, prevents visual selection bug
    useEffect(() => {
        if (uplotRef.current) {
            uplotRef.current.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
            if (timeRange && !animateXAxis) {
                uplotRef.current.setScale("x", { min: timeRange.from, max: timeRange.to });
            }
        }
    }, [timeRange, animateXAxis]);

    // Animate x-axis: always show [currentTime - windowSize, currentTime] like uPlot streaming demo
    // Optimized: skips setScale when the delta since last frame is too small to produce a
    // visible pixel change, avoiding redundant full redraws.
    useEffect(() => {
        let rafId: number | null = null;
        let running = true;
        let lastMax = 0;
        function animate() {
            if (!running || !timeRange || !uplotRef.current) return;
            const now = Date.now();
            // Skip if less than ~1px of movement
            // At 60fps we get ~16ms per frame; for a 60s window that's ~0.27px per ms
            // Minimum visible delta: windowSize / chartWidth (1 data-pixel)
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
                uplotRef.current.setSize({
                    width: chartRef.current.clientWidth,
                    height,
                });
                setPlotSize({ width: chartRef.current.clientWidth, height });
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [height]);

    const hasData = data[0]?.length > 0;
    const plotWidth = plotSize.width;
    const plotHeight = plotSize.height;

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
            <ChartTooltip data={tooltipData} plotWidth={plotWidth} plotHeight={plotHeight} />
        </div>
    );
}

/**
 * Cached version of the time-gap refiner.
 * The gap threshold (median delta) only depends on the data, not the current
 * scale/viewport, so we cache it keyed by dataLen+idx range to avoid
 * re-sorting on every animation frame.
 */
function createCachedTimeGapRefiner(gapMultiplier = 1.5) {
    let cachedThreshold: number | null = null;
    let cachedKey = "";

    return (u: uPlot, seriesIdx: number, idx0: number, idx1: number, nullGaps: [number, number][]) => {
        const xData = u.data[0] as number[];
        const yData = u.data[seriesIdx] as Array<number | null | undefined>;

        if (!Array.isArray(xData) || !Array.isArray(yData) || idx1 - idx0 < 2) {
            return nullGaps;
        }

        // Cache key: data length + series index + index range
        const key = `${xData.length}:${seriesIdx}:${idx0}:${idx1}`;
        let threshold: number;

        if (key === cachedKey && cachedThreshold !== null) {
            threshold = cachedThreshold;
        } else {
            // Compute median delta — only when data changes
            const deltas: number[] = [];
            let prevValidIdx: number | null = null;

            for (let i = idx0; i <= idx1; i++) {
                const y = yData[i];
                if (typeof y !== "number" || !Number.isFinite(y)) continue;

                if (prevValidIdx != null) {
                    const delta = xData[i] - xData[prevValidIdx];
                    if (delta > 0) deltas.push(delta);
                }
                prevValidIdx = i;
            }

            if (deltas.length === 0) return nullGaps;

            deltas.sort((a, b) => a - b);
            const medianDelta = deltas[Math.floor(deltas.length / 2)];
            threshold = medianDelta * gapMultiplier;
            if (!Number.isFinite(threshold) || threshold <= 0) return nullGaps;

            cachedThreshold = threshold;
            cachedKey = key;
        }

        const extraGaps: [number, number][] = [];
        let prevValidIdx: number | null = null;

        for (let i = idx0; i <= idx1; i++) {
            const y = yData[i];
            if (typeof y !== "number" || !Number.isFinite(y)) continue;

            if (prevValidIdx != null) {
                const delta = xData[i] - xData[prevValidIdx];
                if (delta > threshold) {
                    uPlot.addGap(
                        extraGaps,
                        Math.round(u.valToPos(xData[prevValidIdx], "x", true)),
                        Math.round(u.valToPos(xData[i], "x", true))
                    );
                }
            }

            prevValidIdx = i;
        }

        if (extraGaps.length === 0) return nullGaps;

        const merged = [...nullGaps, ...extraGaps];
        merged.sort((a, b) => a[0] - b[0]);
        return merged;
    };
}


function tooltipPlugin(
    seriesConfig: SeriesConfig[],
    onTooltipUpdate: (data: TooltipData | null) => void
): uPlot.Plugin {
    let overPlot: HTMLElement;
    let bLeft = 0;
    let bTop = 0;


    let boundsDirty = true;

    function syncBounds() {
        if (!overPlot || !boundsDirty) return;
        const bbox = overPlot.getBoundingClientRect();
        bLeft = bbox.left;
        bTop = bbox.top;
        boundsDirty = false;
    }

    function markBoundsDirty() {
        boundsDirty = true;
    }

    return {
        hooks: {
            init: (u) => {
                overPlot = u.over;
                boundsDirty = true;
                syncBounds();
                overPlot.addEventListener("mouseleave", () => onTooltipUpdate(null));
                // Mark bounds dirty on scroll/resize instead of recalculating every cursor move
                window.addEventListener("scroll", markBoundsDirty, { passive: true });
                window.addEventListener("resize", markBoundsDirty, { passive: true });
            },
            setSize: () => { boundsDirty = true; },
            setCursor: (u) => {
                const { left, top, idx } = u.cursor;

                if (left == null || top == null || idx == null || !(u.data[0][idx])) {
                    onTooltipUpdate(null);
                    return;
                }

                // Only recalculate bounds when marked dirty (scroll/resize)
                syncBounds();

                // Use cursor.idxs which contains the resolved index per series (after dataIdx)
                const series = seriesConfig.map((cfg, i) => {
                    const seriesIdx = u.cursor.idxs?.[i + 1] ?? idx;
                    return {
                        label: cfg.label,
                        value: u.data[i + 1]?.[seriesIdx] ?? null,
                        color: cfg.color || getColorFromPalette(i),
                    };
                });

                onTooltipUpdate({
                    timeString: formatTimeString(u.data[0][idx] as number),
                    x: left,
                    y: top,
                    left: bLeft,
                    top: bTop,
                    series,
                });
            },
        },
    };
}
