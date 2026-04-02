import { useEffect, useRef } from "react";

type TooltipSeries = {
    label: string;
    value: number | null;
    color: string;
};

export type TooltipData = {
    timeString: string;
    x: number;
    y: number;
    left: number;
    top: number;
    series: TooltipSeries[];
};

type ChartTooltipProps = {
    data: TooltipData | null;
    plotWidth: number;
    plotHeight: number;
};

export function ChartTooltip({ data, plotWidth, plotHeight }: ChartTooltipProps) {
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!tooltipRef.current || !data) return;

        const rect = tooltipRef.current.getBoundingClientRect();
        const offset = 12;

        let x = data.left + data.x + offset;
        let y = data.top + data.y + offset;

        // Flip to left if overflows right edge
        if (data.x + rect.width + offset > plotWidth) {
            x = data.left + data.x - rect.width - offset;
        }

        // Flip to top if overflows bottom edge
        if (data.y + rect.height + offset > plotHeight) {
            y = data.top + data.y - rect.height - offset;
        }

        tooltipRef.current.style.left = `${x}px`;
        tooltipRef.current.style.top = `${y}px`;
    }, [data, plotWidth, plotHeight]);

    if (!data) return null;

    return (
        <div
            ref={tooltipRef}
            className="fixed pointer-events-none z-[9999] bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-md p-2.5 min-w-[140px]"
        >
            <div className="text-[11px] text-muted-foreground font-medium mb-1.5">
                {data.timeString}
            </div>
            <div className="space-y-1">
                {data.series.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-2 h-2 rounded-sm"
                                style={{ backgroundColor: s.color }}
                            />
                            <span className="text-muted-foreground">{s.label}</span>
                        </div>
                        <span className="font-semibold text-foreground tabular-nums">
                            {s.value != null && s.value !== undefined && !isNaN(Number(s.value))
                                ? s.value.toString()
                                : "-"}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
