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
 * Format timestamp to time string
 */
export function formatTimeString(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
