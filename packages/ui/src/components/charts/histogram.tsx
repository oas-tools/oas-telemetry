import React, { useEffect, useRef, useState } from "react";

import { transformHistogramToLineSeries } from "./histogram-transformer";
import { TimeSeriesChart } from "./time-series-chart";

type HistogramLineChartProps = {
  data: any;
  height?: number;
  className?: string;
};

export default function HistogramLineChart({ data, height = 350, className }: HistogramLineChartProps) {
  if (!data) return null;
  const { data: chartData, seriesConfig } = transformHistogramToLineSeries(data.series);
  return (
    <TimeSeriesChart
      data={chartData}
      seriesConfig={seriesConfig}
      height={height}
      className={className}
    />
  );
}
