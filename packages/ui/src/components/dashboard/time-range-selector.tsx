/**
 * TimeRangeSelector Component
 * UI control for selecting time ranges
 * Compatible with Next.js and React (Vite)
 */

"use client";

import { cn } from "@/lib/utils";

export type TimeRangeOption = {
  label: string;
  value: number; // milliseconds
};

export type TimeRangeSelectorProps = {
  selectedRange: number;
  onRangeChange: (range: number) => void;
  options?: TimeRangeOption[];
  className?: string;
};

const DEFAULT_OPTIONS: TimeRangeOption[] = [
  { label: "Last 1m", value: 1 * 60_000 },
  { label: "Last 5m", value: 5 * 60_000 },
  { label: "Last 15m", value: 15 * 60_000 },
  { label: "Last 1h", value: 60 * 60_000 },
  { label: "Last 4h", value: 4 * 60 * 60_000 },
];

export function TimeRangeSelector({
  selectedRange,
  onRangeChange,
  options = DEFAULT_OPTIONS,
  className,
}: TimeRangeSelectorProps) {
  return (
    <div
      className={cn(
        "flex gap-2 p-1 bg-slate-50 rounded-lg",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onRangeChange(option.value)}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
            selectedRange === option.value
              ? "bg-white text-slate-900 border-2 border-blue-500 shadow-sm"
              : "bg-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
