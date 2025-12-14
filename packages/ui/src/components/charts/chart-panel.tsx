/**
 * ChartPanel Component
 * Wrapper component for charts with title and styling
 * Compatible with Next.js and React (Vite)
 */

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChartPanelProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function ChartPanel({ title, children, className }: ChartPanelProps) {
  return (
    <div
      className={cn(
        "mb-6 p-4 bg-white rounded-lg shadow-sm border border-slate-200",
        className
      )}
    >
      {title && (
        <h3 className="mb-3 text-base font-semibold text-slate-900">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
