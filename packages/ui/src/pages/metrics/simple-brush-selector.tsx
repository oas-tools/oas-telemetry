"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import type { TimeRange } from "./metrics-types"
import { formatTimestampSmart } from "./metrics-helpers"

interface SimpleBrushSelectorProps {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  height?: number
}

export default function SimpleBrushSelector({ timeRange, onTimeRangeChange, height = 50 }: SimpleBrushSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensionsRef = useRef({ width: 0, left: 0 })
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [mouseTime, setMouseTime] = useState<number | null>(null)

  const viewStart = timeRange.startTimeNs
  const viewEnd = timeRange.endTimeNs
  const viewDuration = viewEnd - viewStart
  // No padding - use exact range
  const startTime = viewStart
  const endTime = viewEnd
  const duration = endTime - startTime

  // Cache dimensions to avoid forced reflow
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        dimensionsRef.current = { width: rect.width, left: rect.left }
      }
    }

    const debouncedUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateDimensions, 100)
    }

    updateDimensions()
    
    const resizeObserver = new ResizeObserver(debouncedUpdate)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [])

  const pixelToTime = useCallback(
    (pixel: number) => {
      const width = dimensionsRef.current.width
      if (width === 0) return startTime
      return startTime + (pixel / width) * duration
    },
    [startTime, duration],
  )

  // Convert timestamp to pixel position
  const timeToPixel = useCallback(
    (time: number) => {
      const width = dimensionsRef.current.width
      if (width === 0) return 0
      return ((time - startTime) / duration) * width
    },
    [startTime, duration],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX - dimensionsRef.current.left
      const time = pixelToTime(x)

      setIsSelecting(true)
      setSelectionStart(time)
      setSelectionEnd(time)
    },
    [pixelToTime],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX - dimensionsRef.current.left
      const clampedX = Math.max(0, Math.min(x, dimensionsRef.current.width))
      const time = pixelToTime(clampedX)

      setMouseX(clampedX)
      setMouseTime(time)

      if (isSelecting && selectionStart !== null) {
        setSelectionEnd(time)
      }
    },
    [isSelecting, selectionStart, pixelToTime],
  )

  const handleMouseLeave = useCallback(() => {
    setMouseX(null)
    setMouseTime(null)
  }, [])

  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting || selectionStart === null) return

      const x = e.clientX - dimensionsRef.current.left
      const clampedX = Math.max(0, Math.min(x, dimensionsRef.current.width))
      const time = pixelToTime(clampedX)

      setSelectionEnd(time)
    },
    [isSelecting, selectionStart, pixelToTime],
  )

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || selectionStart === null || selectionEnd === null) return

    const minTime = Math.min(selectionStart, selectionEnd)
    const maxTime = Math.max(selectionStart, selectionEnd)

    if (maxTime - minTime > duration * 0.01) {
      onTimeRangeChange({
        label: `${formatTimestampSmart(minTime, (maxTime - minTime) / 1_000_000)} — ${formatTimestampSmart(maxTime, (maxTime - minTime) / 1_000_000)}`,
        startTimeNs: minTime,
        endTimeNs: maxTime,
        isRelative: false,
      })
    }

    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [isSelecting, selectionStart, selectionEnd, duration, onTimeRangeChange])

  useEffect(() => {
    if (isSelecting) {
      document.addEventListener("mousemove", handleGlobalMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isSelecting, handleGlobalMouseMove, handleMouseUp])

  // Calculate selection box position
  let selectionLeft = 0
  let selectionWidth = 0
  if (isSelecting && selectionStart !== null && selectionEnd !== null) {
    const minTime = Math.min(selectionStart, selectionEnd)
    const maxTime = Math.max(selectionStart, selectionEnd)
    selectionLeft = timeToPixel(minTime)
    selectionWidth = timeToPixel(maxTime) - selectionLeft
  }

  const totalDurationMs = duration / 1_000_000

  return (
    <div className="select-none">
      {/* Timeline track */}
      <div
        ref={containerRef}
        className="relative bg-muted/20 border border-border/50 rounded-sm cursor-crosshair"
        style={{ height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Active view range indicator - full width since no padding */}
        <div
          className="absolute top-0 bottom-0 left-0 right-0 bg-emerald-500/20 border-x border-emerald-600/30 pointer-events-none"
        />

        {/* Selection overlay */}
        {isSelecting && selectionWidth > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/40 border-x-2 border-emerald-500 pointer-events-none"
            style={{
              left: selectionLeft,
              width: selectionWidth,
            }}
          />
        )}

        {/* Mouse cursor line */}
        {mouseX !== null && mouseTime !== null && !isSelecting && (
          <>
            <div
              className="absolute top-0 bottom-0 w-px bg-emerald-500 pointer-events-none"
              style={{ left: mouseX }}
            />
            <div
              className="absolute -top-6 px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded pointer-events-none whitespace-nowrap"
              style={{ 
                left: Math.max(0, Math.min(mouseX - 40, dimensionsRef.current.width - 80)),
              }}
            >
              {formatTimestampSmart(mouseTime, totalDurationMs)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
