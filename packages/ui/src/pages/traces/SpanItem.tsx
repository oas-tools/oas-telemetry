import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Code2 } from "lucide-react"
import { toast } from "sonner"
import { getMethodColor, getStatusColor } from "@/lib/helpers/trace"
import type { Span } from "@/services/traceService"

interface SpanItemProps {
  span: Span
}

function formatTimestamp(ts: number | string | [number, number]) {
  let ms: number

  // Handle array format [seconds, nanoseconds] from OpenTelemetry
  if (Array.isArray(ts)) {
    const [seconds, nanos] = ts
    ms = seconds * 1000 + nanos / 1e6
  } else if (typeof ts === "string") {
    ms = Number(ts)
  } else {
    ms = ts
  }

  // Detect if timestamp is in nanoseconds (OpenTelemetry, > 10^15)
  if (ms > 1e15) {
    ms = Math.floor(ms / 1e6)
  }

  const date = new Date(ms)
  if (isNaN(date.getTime())) {
    return "Invalid timestamp"
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDuration(duration: number | [number, number]) {
  let durationMs: number

  // Handle array format [seconds, nanoseconds]
  if (Array.isArray(duration)) {
    const [seconds, nanos] = duration
    durationMs = seconds * 1000 + nanos / 1e6
  } else {
    durationMs = duration
  }

  if (durationMs < 1) return `${(durationMs * 1000).toFixed(1)}µs`
  if (durationMs < 1000) return `${durationMs.toFixed(2)}ms`
  return `${(durationMs / 1000).toFixed(2)}s`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
    .then(() => toast.success("Copied to clipboard"))
    .catch(() => toast.error("Failed to copy"))
}

const SpanItem: React.FC<SpanItemProps> = ({ span }) => {
  const [showDetails, setShowDetails] = useState(false)

  // Extract HTTP data
  const httpData = span.attributes?.http
  const method = httpData?.method || "UNKNOWN"
  const target = httpData?.target || "/"
  const statusCode = httpData?.status_code || 0
  const traceId = span.traceId || span._spanContext?.traceId || ""

  // Get timestamp: use startTime if available, else timestamp
  const spanTimestamp = (span as any).startTime || span.timestamp || 0

  // Get duration: use _duration if available, else duration
  const spanDuration = (span as any)._duration || span.duration || 0

  return (
    <div className="group hover:bg-muted/50 rounded-lg px-2 py-2 transition-colors border-b border-muted font-mono text-[13px]">
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground font-mono">
        <span>{formatTimestamp(spanTimestamp)}</span>
        <Badge className={`${getMethodColor(method)} border rounded-sm text-[10px]`}>
          {method.toUpperCase()}
        </Badge>
        <Badge className={`${getStatusColor(statusCode)} border rounded-sm text-[10px]`}>
          {statusCode}
        </Badge>
        <span className="text-gray-600 dark:text-gray-400">{formatDuration(spanDuration)}</span>

        <span className="flex items-center gap-2 ml-auto">
          {traceId && (
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-[10px] cursor-pointer font-mono"
              onClick={() => copyToClipboard(traceId)}
              title="Copy Trace ID"
            >
              {traceId.slice(0, 8)}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-7 w-7 p-0"
            aria-label="Show raw span data"
            onClick={() => setShowDetails((v) => !v)}
          >
            <Code2 className="h-4 w-4" />
          </Button>
        </span>
      </div>

      {showDetails && (
        <div className="mt-2 mb-2 bg-muted/30 rounded p-2 font-mono text-xs overflow-x-auto border">
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(span, null, 2)}</pre>
        </div>
      )}

      <div className="text-sm text-foreground break-words font-mono mt-1">{target}</div>
    </div>
  )
}

export default SpanItem
