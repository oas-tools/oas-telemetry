/**
 * useTimeRange Hook
 * Manages time range state for dashboard
 * Compatible with Next.js and React (Vite)
 */

"use client";

import { useState, useCallback } from "react";
import { type TimeRange, calculateTimeRange } from "@/lib/utils/time-series";

export function useTimeRange(initialRange: number = 15 * 60_000) {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: "relative",
    from: initialRange,
    to: 0,
  });

  const setRelativeRange = useCallback((ms: number) => {
    setTimeRange({
      type: "relative",
      from: ms,
      to: 0,
    });
  }, []);

  const setAbsoluteRange = useCallback((from: number, to: number) => {
    setTimeRange({
      type: "absolute",
      from,
      to,
    });
  }, []);

  const getCurrentRange = useCallback(() => {
    return calculateTimeRange(timeRange);
  }, [timeRange]);

  return {
    timeRange,
    setRelativeRange,
    setAbsoluteRange,
    getCurrentRange,
  };
}
