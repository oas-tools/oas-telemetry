"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatTimeString, formatNumber } from "./utils";
import { transformOtelHistogramToHeatmap } from "./histogram-transformer";

type HistogramHeatmapProps = {
  series: any[];
  height?: number;
  timeRange?: { from: number; to: number };
  onRangeSelect?: (from: number, to: number) => void;
  animateXAxis?: boolean;
  className?: string;
};

type TooltipInfo = {
  x: number; // clientX
  y: number; // clientY
  timeString: string;
  bucketLabel: string;
  count: number;
};

// Custom helper to format non-integer/decimal bounds correctly
function formatValue(value: number): string {
  if (value === 0) return "0";
  if (!isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs < 1) {
    // Show up to 3 decimal places for small fractions, strip trailing zeros
    return value.toFixed(3).replace(/\.?0+$/, "");
  }
  return formatNumber(value);
}

export function HistogramHeatmap({
  series,
  height = 350,
  timeRange,
  onRangeSelect,
  animateXAxis,
  className,
}: HistogramHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  // Drag select state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeRangeRef = useRef<{ from: number; to: number } | null>(null);

  // Extract heatmap data
  const heatmap = transformOtelHistogramToHeatmap(series);
  const { xData, matrix, boundaries } = heatmap;
  const timestamps = xData.map((t: number) => t * 1000); // convert seconds to ms

  const B = boundaries.length;
  const S = timestamps.length;

  // Track max count in current matrix for scaling the color intensity
  let maxCount = 0;
  for (let y = 0; y < B; y++) {
    for (let x = 0; x < S; x++) {
      const val = matrix[y]?.[x] || 0;
      if (val > maxCount) maxCount = val;
    }
  }

  // Handle resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Canvas layout dimensions (match uPlot paddings and margins)
  const paddingLeft = 60;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;

  const plotWidth = dimensions.width - paddingLeft - paddingRight;
  const plotHeight = dimensions.height - paddingTop - paddingBottom;

  // Premium sequential color palette generator
  const getCellColor = (count: number, max: number) => {
    if (count === 0 || max === 0) return "rgba(241, 245, 249, 0.05)"; // subtle/transparent grid block
    const normalized = Math.min(1, count / max);
    // sequential transition: Indigo/Blue -> Purple -> Hot Pink -> Orange/Yellow
    const hue = 210 + normalized * 130; // 210 (blue) to 340 (pink)
    const lightness = 65 - normalized * 20; // 65% to 45%
    const opacity = 0.2 + normalized * 0.8; // 0.2 to 1.0
    return `hsla(${hue}, 85%, ${lightness}%, ${opacity})`;
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Support High DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (S === 0 || B === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No data available", dimensions.width / 2, dimensions.height / 2);
      return;
    }

    // Freeze time range boundaries during drag interactions
    let minTime: number;
    let maxTime: number;
    if (isDragging && dragTimeRangeRef.current) {
      minTime = dragTimeRangeRef.current.from;
      maxTime = dragTimeRangeRef.current.to;
    } else {
      minTime = timeRange?.from ?? (timestamps[0] || 0);
      maxTime = timeRange?.to ?? (timestamps[timestamps.length - 1] || 1);
    }

    const getXPos = (time: number) => {
      const pct = (time - minTime) / (maxTime - minTime || 1);
      return paddingLeft + pct * plotWidth;
    };

    // Clip heatmap cell rendering strictly within the plot area to prevent overflow
    ctx.save();
    ctx.beginPath();
    ctx.rect(paddingLeft, paddingTop, plotWidth, plotHeight);
    ctx.clip();

    // Draw Heatmap Cells
    const cellWidth = Math.max(1, plotWidth / S);
    const cellHeight = plotHeight / B;

    for (let x = 0; x < S; x++) {
      const t = timestamps[x];
      if (t < minTime || t > maxTime) continue;

      const xPos = getXPos(t) - cellWidth / 2;

      for (let y = 0; y < B; y++) {
        const count = matrix[y]?.[x] || 0;
        const color = getCellColor(count, maxCount);

        const yPos = paddingTop + (B - 1 - y) * cellHeight;

        ctx.fillStyle = color;
        // Draw slightly overlapping rect to prevent subpixel gaps
        ctx.fillRect(xPos, yPos, cellWidth + 0.5, cellHeight + 0.5);
      }
    }

    ctx.restore();

    // Draw grid lines (matching uPlot stroke & width)
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;

    // Draw horizontal gridlines at boundary points
    for (let y = 0; y <= B; y++) {
      const yPos = paddingTop + y * cellHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yPos);
      ctx.lineTo(dimensions.width - paddingRight, yPos);
      ctx.stroke();
    }

    // Draw ticks & axis borders (matching uPlot axis lines)
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;

    // Left Y-axis vertical boundary line
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + plotHeight);
    ctx.stroke();

    // Bottom X-axis horizontal boundary line
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop + plotHeight);
    ctx.lineTo(dimensions.width - paddingRight, paddingTop + plotHeight);
    ctx.stroke();

    // Labels styling matching line charts exactly (12px Inter, sans-serif, #64748b)
    ctx.fillStyle = "#64748b";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    // Draw Y-Axis labels and tick marks aligned to ticks/horizontal gridlines
    for (let y = 0; y <= B; y++) {
      const yPos = paddingTop + y * cellHeight;
      let val: number;
      if (y < B) {
        val = boundaries[B - 1 - y];
      } else {
        val = 0;
      }
      const label = formatValue(val);
      ctx.fillText(label, paddingLeft - 10, yPos);

      // Draw tick mark line (pointing left)
      ctx.strokeStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(paddingLeft - 4, yPos);
      ctx.lineTo(paddingLeft, yPos);
      ctx.stroke();
    }

    // Draw X-Axis labels and gridlines
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Time-dependent vertical gridlines (always 18 lines across the timeframe)
    const tickCount = 18;
    for (let i = 0; i < tickCount; i++) {
      const pct = i / (tickCount - 1);
      const t = minTime + pct * (maxTime - minTime);
      const xPos = getXPos(t);

      // Draw thin vertical grid line matching uPlot style
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(xPos, paddingTop);
      ctx.lineTo(xPos, dimensions.height - paddingBottom);
      ctx.stroke();

      // Draw tick mark line (pointing down)
      ctx.strokeStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(xPos, paddingTop + plotHeight);
      ctx.lineTo(xPos, paddingTop + plotHeight + 4);
      ctx.stroke();

      // Draw time label for subset of ticks to avoid overlap (indices: 0, 3, 6, 9, 12, 15, 17)
      if (i % 3 === 0 || i === tickCount - 1) {
        const timeStr = formatTimeString(t);
        ctx.fillStyle = "#64748b";
        ctx.fillText(timeStr, xPos, dimensions.height - paddingBottom + 8);
      }
    }

    // Draw selection overlay if dragging
    if (isDragging && dragStart !== null && dragCurrent !== null) {
      const startX = Math.max(paddingLeft, Math.min(dimensions.width - paddingRight, dragStart));
      const currentX = Math.max(paddingLeft, Math.min(dimensions.width - paddingRight, dragCurrent));
      const selLeft = Math.min(startX, currentX);
      const selWidth = Math.abs(startX - currentX);

      ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
      ctx.fillRect(selLeft, paddingTop, selWidth, plotHeight);

      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(selLeft, paddingTop);
      ctx.lineTo(selLeft, paddingTop + plotHeight);
      ctx.moveTo(selLeft + selWidth, paddingTop);
      ctx.lineTo(selLeft + selWidth, paddingTop + plotHeight);
      ctx.stroke();
    }
  }, [dimensions, matrix, boundaries, timestamps, timeRange, dragStart, dragCurrent, isDragging, S, B, maxCount]);

  // Mouse handlers for tooltip and drag range selection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setDragCurrent(mouseX);
    }

    // Check if mouse is within plot area
    if (
      mouseX >= paddingLeft &&
      mouseX <= dimensions.width - paddingRight &&
      mouseY >= paddingTop &&
      mouseY <= dimensions.height - paddingBottom
    ) {
      let minTime: number;
      let maxTime: number;
      if (isDragging && dragTimeRangeRef.current) {
        minTime = dragTimeRangeRef.current.from;
        maxTime = dragTimeRangeRef.current.to;
      } else {
        minTime = timeRange?.from ?? (timestamps[0] || 0);
        maxTime = timeRange?.to ?? (timestamps[timestamps.length - 1] || 1);
      }

      // Interpolate time from X position
      const pctX = (mouseX - paddingLeft) / plotWidth;
      const targetTime = minTime + pctX * (maxTime - minTime);

      // Find closest timestamp index
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < S; i++) {
        const diff = Math.abs(timestamps[i] - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      // Interpolate Y index
      const pctY = Math.max(0, Math.min(0.999, (mouseY - paddingTop) / plotHeight));
      const yIdx = B - 1 - Math.floor(pctY * B);

      if (closestIdx >= 0 && closestIdx < S && yIdx >= 0 && yIdx < B) {
        const count = matrix[yIdx]?.[closestIdx] || 0;
        const timeVal = timestamps[closestIdx];

        // Format bucket label
        const lower = yIdx > 0 ? formatValue(boundaries[yIdx - 1]) : "0";
        const upper = formatValue(boundaries[yIdx]);
        const bucketLabel = yIdx === B - 1 ? `> ${lower}` : `${lower} - ${upper}`;

        setTooltip({
          x: e.clientX,
          y: e.clientY,
          timeString: formatTimeString(timeVal),
          bucketLabel,
          count,
        });
        return;
      }
    }

    setTooltip(null);
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    dragTimeRangeRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (mouseX >= paddingLeft && mouseX <= dimensions.width - paddingRight) {
      // Freeze the current time range reference for calculations during this drag interaction
      const minTime = timeRange?.from ?? (timestamps[0] || 0);
      const maxTime = timeRange?.to ?? (timestamps[timestamps.length - 1] || 1);
      dragTimeRangeRef.current = { from: minTime, to: maxTime };

      setDragStart(mouseX);
      setDragCurrent(mouseX);
      setIsDragging(true);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || dragStart === null || dragCurrent === null) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
      dragTimeRangeRef.current = null;
      return;
    }

    const dragDist = Math.abs(dragStart - dragCurrent);
    if (dragDist > 5 && onRangeSelect && dragTimeRangeRef.current) {
      const minTime = dragTimeRangeRef.current.from;
      const maxTime = dragTimeRangeRef.current.to;

      const x1 = Math.min(dragStart, dragCurrent);
      const x2 = Math.max(dragStart, dragCurrent);

      const pct1 = (x1 - paddingLeft) / plotWidth;
      const pct2 = (x2 - paddingLeft) / plotWidth;

      const newFrom = minTime + pct1 * (maxTime - minTime);
      const newTo = minTime + pct2 * (maxTime - minTime);

      onRangeSelect(newFrom, newTo);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    dragTimeRangeRef.current = null;
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`} style={{ height: dimensions.height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        style={{ height: dimensions.height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />

      {/* Floating Tooltip with premium glassmorphism positioned perfectly near the cursor */}
      {tooltip && (
        <div
          className="fixed pointer-events-none z-[9999] bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-md p-2.5 min-w-[145px]"
          style={{
            left: `${tooltip.x + 15 + 155 > window.innerWidth ? tooltip.x - 170 : tooltip.x + 15}px`,
            top: `${tooltip.y + 15 + 95 > window.innerHeight ? tooltip.y - 110 : tooltip.y + 15}px`,
          }}
        >
          <div className="text-[11px] text-muted-foreground font-medium mb-1.5">
            {tooltip.timeString}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Range:</span>
              <span className="font-semibold text-foreground">{tooltip.bucketLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs border-t border-border/50 pt-1 mt-1">
              <span className="text-muted-foreground">Count:</span>
              <span className="font-semibold text-foreground tabular-nums">{tooltip.count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Color legend scale at the top right (avoids overlapping the timeline labels) */}
      {maxCount > 0 && (
        <div className="absolute right-4 top-1.5 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded border border-border text-[10px] text-muted-foreground">
          <span>0</span>
          <div
            className="w-24 h-1.5 rounded-full"
            style={{
              background: "linear-gradient(to right, rgba(241, 245, 249, 0.2), hsla(210, 85%, 65%, 0.3), hsla(275, 85%, 55%, 0.6), hsla(340, 85%, 45%, 1))",
            }}
          />
          <span className="font-semibold text-foreground">{formatValue(maxCount)}</span>
        </div>
      )}
    </div>
  );
}
