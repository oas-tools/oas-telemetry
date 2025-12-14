/**
 * useUPlotStyles Hook
 * Injects uPlot custom styles into the document
 * Compatible with Next.js and React (Vite)
 */

"use client";

import { useEffect } from "react";

export function useUPlotStyles() {
  useEffect(() => {
    const styleId = "uplot-custom-styles";

    // Check if styles are already injected
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = uplotCustomStyles;
      document.head.appendChild(styleEl);
    }

    return () => {
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);
}


const uplotCustomStyles = `
.u-over {
  cursor: crosshair !important;
}

.uplot {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.u-under {
 background: #00ffbf15 !important;
 border: 1px solid #00ffbf40;
}

.u-legend {
  text-align: left !important;
  border-top: 1px solid #e2e8f0;
}

.u-legend .u-marker {
  width: 14px !important;
  height: 14px !important;
  border-radius: 30px !important;
}
`;
