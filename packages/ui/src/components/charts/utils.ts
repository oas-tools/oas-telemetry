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
