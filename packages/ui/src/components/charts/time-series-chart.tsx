"use client";

import { useEffect, useRef, useMemo, useState, use } from "react";
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
                        spanGaps: true,
                        paths: uPlot.paths.linear!(),
                        points: {
                            size: 8,
                            width: 2,
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
                            console.log(`selecting range: ${new Date(minX).toISOString()} ${new Date(maxX).toISOString()}`)
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
        console.log("Created uPlot chart");
        return () => {
            plot.destroy();
            uplotRef.current = null;
        };
        //If seriesConfig changes, we need to recreate the chart to update series
    }, [height, onRangeSelect, seriesConfig]);

    // Update data when it changes, no need to recreate chart
    useEffect(() => {
        if (!uplotRef.current) return;
        uplotRef.current.setData(data as any, true);
        //TODO REMOVE THIS
        console.log("Updated uPlot data for metric:", seriesConfig.map(s => s.label).join(", "));
    }, [data]);

    // Animate x-axis if animateXAxis is true
    useEffect(() => {
        let rafId: number | null = null;
        let running = true;
        if (animateXAxis && timeRange && uplotRef.current) {
            const animate = () => {
                if (!running) return;
                const now = Date.now();
                const windowSize = timeRange.to - timeRange.from;
                uplotRef.current!.setScale("x", { min: now - windowSize, max: now });
                rafId = requestAnimationFrame(animate);
            };
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


function tooltipPlugin(
    seriesConfig: SeriesConfig[],
    onTooltipUpdate: (data: TooltipData | null) => void
): uPlot.Plugin {
    let overPlot: HTMLElement;
    let bLeft = 0;
    let bTop = 0;


    function syncBounds() {
        if (!overPlot) return;
        const bbox = overPlot.getBoundingClientRect();
        bLeft = bbox.left;
        bTop = bbox.top;
    }

    return {
        hooks: {
            init: (u) => {
                overPlot = u.over;
                syncBounds();
                overPlot.addEventListener("mouseleave", () => onTooltipUpdate(null));
            },
            setSize: () => syncBounds(),
            setCursor: (u) => {
                const { left, top, idx } = u.cursor;

                if (left == null || top == null || idx == null || !(u.data[0][idx])) {
                    onTooltipUpdate(null);
                    return;
                }

                // Update bounds on every cursor move to handle scroll
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