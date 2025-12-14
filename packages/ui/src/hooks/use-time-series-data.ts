"use client";

import { useState, useEffect, useMemo } from "react";
import { buildAlignedData, TimePoint } from "@/lib/time-series";
import { fetchMetrics } from "@/lib/api-client";

export function useTimeSeriesData(
  seriesIds: string[],
  timeRange: { from: number; to: number },
  _refreshTrigger?: number
) {
  const [rawData, setRawData] = useState<Record<string, TimePoint[]>>({});

  useEffect(() => {
    let isMounted = true;

    fetchMetrics(seriesIds, timeRange.from, timeRange.to)
      .then((response) => {
        if (isMounted) {
          setRawData(response.data);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch metrics:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [seriesIds, timeRange.from, timeRange.to, _refreshTrigger]);

  const data = useMemo(() => {
    const seriesData = seriesIds.map((id) => rawData[id] || []);
    return buildAlignedData(seriesData, timeRange.from, timeRange.to);
  }, [rawData, seriesIds, timeRange.from, timeRange.to]);

  return {
    data,
  };
}
