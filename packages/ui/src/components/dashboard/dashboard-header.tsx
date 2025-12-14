/**
 * DashboardHeader Component
 * Header with title and controls for the dashboard
 * Compatible with Next.js and React (Vite)
 */

"use client";

import { TimeRangeSelector } from "./time-range-selector";
import { AutoRefreshControl } from "./auto-refresh-control";
import { cn } from "@/lib/utils";

export type DashboardHeaderProps = {
  title?: string;
  subtitle?: string;
  selectedRange: number;
  onRangeChange: (range: number) => void;
  autoRefreshInterval: number | null;
  onAutoRefreshChange: (interval: number | null) => void;
  showCustomRangeIndicator?: boolean;
  className?: string;
};

export function DashboardHeader({
  title = "Real-time Dashboard",
  subtitle,
  selectedRange,
  onRangeChange,
  autoRefreshInterval,
  onAutoRefreshChange,
  showCustomRangeIndicator = false,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 p-5 bg-white rounded-lg shadow-sm border border-slate-200",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <TimeRangeSelector
          selectedRange={selectedRange}
          onRangeChange={onRangeChange}
        />

        <div className="w-px h-8 bg-slate-200" />

        <AutoRefreshControl
          selectedInterval={autoRefreshInterval}
          onIntervalChange={onAutoRefreshChange}
        />

        {showCustomRangeIndicator && (
          <div className="px-3 py-1.5 bg-amber-50 text-amber-900 text-sm rounded-md">
            Custom range selected
          </div>
        )}
      </div>
    </header>
  );
}
