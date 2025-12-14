/**
 * Data utilities for time series processing
 */

import type { TimePoint } from "@/types/metric-types";


/**
 * Merge multiple sorted timestamp arrays into a single sorted unique array
 * Uses k-way merge algorithm
 */
export function mergeSortedUnique(lists: number[][]): number[] {
  const indices = new Array(lists.length).fill(0);
  const result: number[] = [];

  while (true) {
    let min = Infinity;
    let minIdx = -1;

    // Find minimum across all lists
    for (let i = 0; i < lists.length; i++) {
      const arr = lists[i];
      const j = indices[i];
      if (j < arr.length) {
        const v = arr[j];
        if (v < min) {
          min = v;
          minIdx = i;
        }
      }
    }

    if (minIdx === -1) break; // All lists exhausted

    // Add to result if unique
    if (result.length === 0 || result[result.length - 1] !== min) {
      result.push(min);
    }

    indices[minIdx]++;
  }

  return result;
}

/**
 * Build aligned data for uPlot from multiple series
 * Returns array of [timestamps, series1, series2, ...]
 */
export function buildAlignedData(
  seriesData: TimePoint[][],
  from: number,
  to: number
): (number | null)[][] {
  // Filter points within range for each series
  const filteredSeries = seriesData.map((points) =>
    points.filter((p) => p.ts >= from && p.ts <= to)
  );

  // Check if any series has data
  const hasData = filteredSeries.some((arr) => arr.length > 0);
  if (!hasData) {
    return [[], ...seriesData.map(() => [])];
  }

  // Extract timestamp arrays
  const timestampLists = filteredSeries.map((arr) => arr.map((p) => p.ts));

  // Merge timestamps into single sorted unique array
  const timestamps = mergeSortedUnique(timestampLists);

  // Build aligned data array
  const result: (number | null)[][] = [timestamps];

  for (let i = 0; i < filteredSeries.length; i++) {
    const points = filteredSeries[i];
    const map = new Map<number, number>();
    
    // Create lookup map
    for (const p of points) {
      map.set(p.ts, p.value);
    }

    // Align values to timestamps
    const values: (number | null)[] = new Array(timestamps.length).fill(null);
    for (let j = 0; j < timestamps.length; j++) {
      const ts = timestamps[j];
      if (map.has(ts)) {
        values[j] = map.get(ts)!;
      }
    }

    result.push(values);
  }

  return result;
}

/**
 * Calculate current time range based on TimeRange config
 */
export function calculateTimeRange(range: {
  type: "relative" | "absolute";
  from: number;
  to: number;
}): { from: number; to: number } {
  const now = Date.now();

  if (range.type === "relative") {
    return {
      from: now - range.from,
      to: range.to === 0 ? now : now - range.to,
    };
  } else {
    return {
      from: range.from,
      to: range.to,
    };
  }
}
