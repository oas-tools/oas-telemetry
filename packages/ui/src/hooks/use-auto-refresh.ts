/**
 * useAutoRefresh Hook
 * Manages auto-refresh interval and triggers updates
 * Compatible with Next.js and React (Vite)
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export function useAutoRefresh(
  initialInterval: number | null = 1000,
  onRefresh?: () => void
) {
  const [refreshInterval, setRefreshInterval] = useState<number | null>(
    initialInterval
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    onRefresh?.();
  }, [onRefresh]);

  useEffect(() => {
    if (refreshInterval) {
      const intervalId = setInterval(() => {
        triggerRefresh();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, triggerRefresh]);

  return {
    refreshInterval,
    setRefreshInterval,
    refreshTrigger,
    triggerRefresh,
  };
}
