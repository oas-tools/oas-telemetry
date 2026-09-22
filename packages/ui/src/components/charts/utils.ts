/**
 * Chart utilities
 * Shared utilities for chart components
 */

// Okabe-Ito color palette (colorblind-friendly)
export const OKABE_ITO = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermillion
  "#CC79A7", // reddish purple
  "#000000", // black
];

/**
 * Get a color from the palette by index
 * Cycles through the palette if index exceeds available colors
 */
export function getColorFromPalette(index: number): string {
  return OKABE_ITO[index % OKABE_ITO.length];
}

/**
 * Format timestamp to time string (HH:MM:SS)
 */
export function formatTimeString(timestamp: number): string {
  const date = new Date(timestamp);
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  return (
    (h < 10 ? "0" : "") + h + ":" +
    (m < 10 ? "0" : "") + m + ":" +
    (s < 10 ? "0" : "") + s
  );
}

/**
 * Format large numbers with K, M, B suffixes
 * e.g., 1000 -> 1K, 1000000 -> 1M
 */
export function formatNumber(value: number): string {
  if (value === 0) return "0";
  if (!isFinite(value)) return "";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1e9) {
    return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (abs >= 1e6) {
    return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (abs >= 1e3) {
    return sign + (abs / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  }

  return value.toFixed(0);
}

/**
 * Compact axis-value formatter: abbreviates large numbers (K/M/B, via
 * formatNumber) and keeps small/fractional numbers short (max 3 significant
 * digits, no long trailing decimals) so long labels don't overflow the chart.
 */
export function formatCompactNumber(value: number): string {
  if (value === 0) return "0";
  if (!isFinite(value)) return "";

  const abs = Math.abs(value);
  if (abs >= 1e3) return formatNumber(value);

  const precise = Number(value.toPrecision(3));
  return precise.toString();
}

/**
 * Trims a boundary value to a short, readable string (used for histogram
 * bucket range labels).
 */
export function formatBoundary(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Number(n.toPrecision(4)).toString();
}

/**
 * Builds the "low-high" range label for bucket `i`, given the OTel-style
 * explicit bucket boundaries. Buckets are (boundaries[i-1], boundaries[i]],
 * with the last bucket open-ended (>last boundary) when there's one more
 * count than boundaries.
 */
export function bucketRangeLabel(i: number, boundaries: number[], unit?: string): string {
  const lower = i === 0 ? 0 : boundaries[i - 1];
  const upper = boundaries[i];
  const suffix = unit ? unit : "";
  if (upper === undefined) {
    return `>${formatBoundary(lower)}${suffix}`;
  }
  return `${formatBoundary(lower)}-${formatBoundary(upper)}${suffix}`;
}

/**
 * uPlot axis `size` callback that measures the actual rendered width of the
 * widest tick label and reserves that much gutter space, so long/large
 * numbers never get clipped or overlap the plot area, regardless of
 * container width.
 */
export function dynamicAxisSize(padding = 16, minSize = 32) {
  return (self: any, values: (string | null)[] | null, axisIdx: number): number => {
    if (!values || values.length === 0) return minSize;
    const axis = self.axes[axisIdx];
    const ctx = self.ctx as CanvasRenderingContext2D;
    ctx.save();
    ctx.font = (axis.font as unknown as string) || "12px Inter, sans-serif";
    let max = 0;
    for (const v of values) {
      if (v == null) continue;
      const w = ctx.measureText(v).width;
      if (w > max) max = w;
    }
    ctx.restore();
    return Math.max(minSize, Math.ceil(max) + padding);
  };
}
