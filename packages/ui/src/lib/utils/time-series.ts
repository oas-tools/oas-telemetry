/**
 * Data utilities for time series processing
 */

export type TimeRange = 
  | { type: "relative"; from: number; to?: number }
  | { type: "absolute"; from: number; to: number }

/**
 * Calculate current time range based on TimeRange config
 */
export function calculateTimeRange(range: TimeRange): { from: number; to: number } {
  const now = Date.now()

  if (range.type === "relative") {
    return {
      from: now - range.from,
      to: range.to === undefined || range.to === 0 ? now : now - range.to,
    }
  } else {
    return {
      from: range.from,
      to: range.to,
    }
  }
}
