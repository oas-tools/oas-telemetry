/**
 * AutoRefreshControl Component
 * UI control for configuring auto-refresh interval
 * Compatible with Next.js and React (Vite)
 */

"use client";

import { cn } from "@/lib/utils";

export type AutoRefreshOption = {
  label: string;
  value: number | null; // milliseconds, null = off
};

export type AutoRefreshControlProps = {
  selectedInterval: number | null;
  onIntervalChange: (interval: number | null) => void;
  options?: AutoRefreshOption[];
  className?: string;
};

const DEFAULT_OPTIONS: AutoRefreshOption[] = [
  { label: "Off", value: null },
  { label: "500ms", value: 500 },
  { label: "1s", value: 1000 },
  { label: "5s", value: 5000 },
];

export function AutoRefreshControl({
  selectedInterval,
  onIntervalChange,
  options = DEFAULT_OPTIONS,
  className,
}: AutoRefreshControlProps) {
  return (
    <div className={cn("flex gap-2 items-center", className)}>
      <span className="text-sm text-slate-600">Auto-refresh:</span>
      <select
        value={selectedInterval ?? "null"}
        onChange={(e) =>
          onIntervalChange(e.target.value === "null" ? null : Number(e.target.value))
        }
        className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-md cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
