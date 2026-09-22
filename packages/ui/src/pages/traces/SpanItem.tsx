import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import { LogLinkIcon } from "./LogLinkIcon"
import { toast } from "sonner"
import { getMethodColor, getStatusColor, formatDuration } from "@/lib/helpers/trace"
import { traceService, type Span } from "@/services/traceService"
import { logsService, type LogEntry } from "@/services/logService"
import { buildSpanTree } from "./spanTree"
import TraceWaterfall from "./TraceWaterfall"
import LogItem from "@/pages/tlm-logs/LogItem"

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

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
    .then(() => toast.success("Copied to clipboard"))
    .catch(() => toast.error("Failed to copy"))
}

// This row represents one trace (its root span). Expanding it lazily loads the trace's
// full span tree plus the logs correlated to it, and shows them as two plain sections -
// spans and logs are only correlated at the trace level (per-span log matching isn't
// reliable: undici's client span isn't active anymore by the time our own code continues
// after a fetch() resolves, so a log line there can't be pinned to that specific span).
const SpanItem: React.FC<SpanItemProps> = ({ span }) => {
  const [expanded, setExpanded] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [traceSpans, setTraceSpans] = useState<Span[] | null>(null)
  const [traceLogs, setTraceLogs] = useState<LogEntry[] | null>(null)

  // Extract HTTP data
  const method = span.attributes?.http?.request?.method || "UNKNOWN"
  const target = span.attributes?.url?.path || "/"
  const statusCode = span.attributes?.http?.response?.status_code || 0
  const traceId = span.traceId || span._spanContext?.traceId || ""

  // Get timestamp: use startTime if available, else timestamp
  const spanTimestamp = (span as any).startTime || span.timestamp || 0

  // Get duration: use _duration if available, else duration
  const spanDuration = (span as any)._duration || span.duration || 0

  const toggleExpanded = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && traceSpans === null && traceId) {
      setLoadingDetail(true)
      const [traceResult, logsResult] = await Promise.all([
        traceService.fetchTraceById(traceId),
        logsService.findLogs({ query: { traceId } }),
      ])
      setTraceSpans(traceResult?.spans || [])
      setTraceLogs(logsResult.logs)
      setLoadingDetail(false)
    }
  }

  return (
    <div className="group hover:bg-muted/50 rounded-lg px-2 py-2 transition-colors border-b border-muted font-mono text-[13px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
        <button onClick={toggleExpanded} className="flex-shrink-0 text-muted-foreground hover:text-foreground" aria-label={expanded ? "Collapse trace" : "Expand trace"}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span>{formatTimestamp(spanTimestamp)}</span>
        <Badge className={`${getMethodColor(method)} border rounded-sm text-[10px]`}>
          {method.toUpperCase()}
        </Badge>
        <Badge className={`${getStatusColor(statusCode)} border rounded-sm text-[10px]`}>
          {statusCode}
        </Badge>
        <span className="text-gray-600 dark:text-gray-400">{formatDuration(spanDuration)}</span>

        {traceId && (
          <span className="flex items-center gap-1 sm:ml-auto">
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-[10px] cursor-pointer font-mono"
              onClick={() => copyToClipboard(traceId)}
              title="Copy Trace ID"
            >
              {traceId.slice(0, 8)}
            </Badge>
            <LogLinkIcon traceId={traceId} />
          </span>
        )}
      </div>

      <button onClick={toggleExpanded} className="block w-full text-left text-sm text-foreground break-words font-mono mt-1">
        {target}
      </button>

      {expanded && (
        <div className="mt-2 mb-1 bg-muted/30 rounded-sm p-2 space-y-3">
          {loadingDetail ? (
            <div className="text-xs text-muted-foreground">Loading trace...</div>
          ) : (
            <>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  Spans ({traceSpans?.length ?? 0}) <span className="font-normal">· HTTP spans only</span>
                </div>
                {traceSpans && traceSpans.length > 0 ? (
                  <TraceWaterfall tree={buildSpanTree(traceSpans)} />
                ) : (
                  <div className="text-xs text-muted-foreground">No spans found for this trace.</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  Logs ({traceLogs?.length ?? 0})
                </div>
                {traceLogs && traceLogs.length > 0 ? (
                  <div className="border rounded-sm bg-background">
                    {traceLogs.map(log => <LogItem key={log._id} log={log} showTraceLink={false} />)}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No logs correlated with this trace.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SpanItem
