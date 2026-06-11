import React, { useState } from "react";
import { transformHistogramToLineSeries } from "./histogram-transformer";
import { TimeSeriesChart } from "./time-series-chart";
import { HistogramHeatmap } from "./histogram-heatmap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type HistogramChartProps = {
  series: any[];
  height?: number;
  timeRange?: { from: number; to: number };
  onRangeSelect?: (from: number, to: number) => void;
  animateXAxis?: boolean;
  className?: string;
};

export default function HistogramChart({
  series,
  height = 350,
  timeRange,
  onRangeSelect,
  animateXAxis,
  className,
}: HistogramChartProps) {
  const [mode, setMode] = useState<"heatmap" | "line">("heatmap");

  if (!series || series.length === 0) return null;

  const { data: chartData, seriesConfig } = transformHistogramToLineSeries(series);

  return (
    <div className={className}>
      <Tabs
        value={mode}
        onValueChange={(val) => setMode(val as "heatmap" | "line")}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground font-medium">Visualization Mode</span>
          <TabsList className="grid grid-cols-2 w-[200px] h-8 p-0.5">
            <TabsTrigger value="heatmap" className="text-xs py-1">Heatmap</TabsTrigger>
            <TabsTrigger value="line" className="text-xs py-1">Line Chart</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="line" className="mt-0 pt-2">
          <TimeSeriesChart
            data={chartData}
            seriesConfig={seriesConfig}
            height={height}
            timeRange={timeRange}
            animateXAxis={animateXAxis}
            onRangeSelect={onRangeSelect}
          />
        </TabsContent>
        <TabsContent value="heatmap" className="mt-0 pt-2">
          <HistogramHeatmap
            series={series}
            height={height}
            timeRange={timeRange}
            animateXAxis={animateXAxis}
            onRangeSelect={onRangeSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
