"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { getColorFromPalette, formatTimeString } from "./utils";
import { ChartTooltip, type TooltipData } from "./chart-tooltip";

export type SeriesConfig = {
  id: string;
  label: string;
  defaultInterval: number;
  generateValue: (now: number) => number;
  color?: string; // Optional: if not provided, uPlot will generate colors automatically
};

export type TimeSeriesChartProps = {
    data: (number | null)[][];
    seriesConfig: SeriesConfig[];
    title?: string;
    height?: number;
    onRangeSelect?: (from: number, to: number) => void;
    timeRange?: { from: number; to: number };
    className?: string;
};



export function TimeSeriesChart({
    data,
    seriesConfig,
    height = 350,
    onRangeSelect,
    timeRange,
    className,
}: TimeSeriesChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const uplotRef = useRef<uPlot | null>(null);
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const onRangeSelectRef = useRef(onRangeSelect);
    const targetRangeRef = useRef<{ from: number; to: number } | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Keep ref updated
    useEffect(() => {
        onRangeSelectRef.current = onRangeSelect;
    }, [onRangeSelect]);

    const plugins = useMemo(() => [tooltipPlugin(seriesConfig, setTooltipData)], [seriesConfig]);

    useEffect(() => {
        if (!chartRef.current) return;

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
                    setScale: true,
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
                x: {},
                y: {
                    range: (u, dataMin, dataMax) => [dataMin, dataMax],
                },
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
                {},
                ...seriesConfig.map((cfg, i) => {
                    const color = cfg.color || getColorFromPalette(i);
                    return {
                        label: cfg.label,
                        stroke: color,
                        width: 1.5,
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
                        if (!onRangeSelectRef.current) return;

                        const min = u.select.left;
                        const max = u.select.left + u.select.width;

                        if (min !== undefined && max !== undefined) {
                            const minX = u.posToVal(min, "x");
                            const maxX = u.posToVal(max, "x");
                            onRangeSelectRef.current(minX, maxX);
                        }
                    },
                ],
            },
            plugins,
        };

        const plot = new uPlot(
            options,
            [[], ...seriesConfig.map(() => [])],
            chartRef.current
        );

        uplotRef.current = plot;

        return () => {
            plot.destroy();
        };
    }, [seriesConfig, height, plugins]);

    // Update data first
    useEffect(() => {
        if (!uplotRef.current) return;
        uplotRef.current.setData(data as any);
    }, [data]);

    // Then animate range changes smoothly
    useEffect(() => {
        if (!uplotRef.current || !timeRange) return;
        
        const currentScale = uplotRef.current.scales.x;
        const currentMin = currentScale.min ?? timeRange.from;
        const currentMax = currentScale.max ?? timeRange.to;
        
        targetRangeRef.current = { from: timeRange.from, to: timeRange.to };
        
        // If values are the same, no need to animate
        if (Math.abs(currentMin - timeRange.from) < 1 && Math.abs(currentMax - timeRange.to) < 1) {
            return;
        }
        
        // Cancel previous animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        
        const duration = 400; // ms
        const startTime = performance.now();
        const startMin = currentMin;
        const startMax = currentMax;
        
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            
            const newMin = startMin + (timeRange.from - startMin) * eased;
            const newMax = startMax + (timeRange.to - startMax) * eased;
            
            if (uplotRef.current) {
                uplotRef.current.setScale("x", {
                    min: newMin,
                    max: newMax,
                });
            }
            
            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [timeRange]);

    useEffect(() => {
        const handleResize = () => {
            if (uplotRef.current && chartRef.current) {
                uplotRef.current.setSize({
                    width: chartRef.current.clientWidth,
                    height,
                });
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [height]);

    const hasData = data[0]?.length > 0;
    const plotWidth = uplotRef.current?.over.clientWidth || 0;
    const plotHeight = uplotRef.current?.over.clientHeight || 0;

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
                
                if (left == null || top == null || idx == null) {
                    onTooltipUpdate(null);
                    return;
                }

                const timestamp = u.data[0][idx];
                if (!timestamp) {
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
                        value: u.data[i + 1][seriesIdx],
                        color: cfg.color || getColorFromPalette(i),
                    };
                });

                onTooltipUpdate({
                    timeString: formatTimeString(timestamp),
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