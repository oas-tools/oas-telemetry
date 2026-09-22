import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { formatDuration, getSpanDurationMs, getSpanStartMs } from "@/lib/helpers/trace"
import type { SpanNode } from "./spanTree"

const MAX_VISUAL_DEPTH = 5
const INDENT_PX = 12

function methodTextColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET": return "text-blue-700 dark:text-blue-400"
    case "POST": return "text-green-700 dark:text-green-400"
    case "PUT": return "text-yellow-700 dark:text-yellow-400"
    case "DELETE": return "text-red-700 dark:text-red-400"
    case "PATCH": return "text-purple-700 dark:text-purple-400"
    default: return "text-muted-foreground"
  }
}

function statusTextColor(status: number): string {
  if (status >= 200 && status < 300) return "text-green-700 dark:text-green-400"
  if (status >= 300 && status < 400) return "text-blue-700 dark:text-blue-400"
  if (status >= 400 && status < 500) return "text-yellow-700 dark:text-yellow-400"
  return "text-red-700 dark:text-red-400"
}

interface SpanWaterfallRowProps {
  node: SpanNode
  traceStartMs: number
  traceDurationMs: number
  depth: number
}

const SpanWaterfallRow: React.FC<SpanWaterfallRowProps> = ({ node, traceStartMs, traceDurationMs, depth }) => {
  const [open, setOpen] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const hasChildren = node.children.length > 0

  const method = node.attributes?.http?.request?.method
  const statusCode = node.attributes?.http?.response?.status_code
  const target = node.attributes?.url?.path
  const isError = node.status?.code === 2

  const durationMs = getSpanDurationMs(node)
  const startMs = getSpanStartMs(node)
  const leftPercent = ((startMs - traceStartMs) / traceDurationMs) * 100
  const widthPercent = Math.max((durationMs / traceDurationMs) * 100, 0.5)

  const indent = Math.min(depth, MAX_VISUAL_DEPTH) * INDENT_PX

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 py-1.5 border-b border-muted/60 text-[12px] font-mono hover:bg-muted/40 cursor-pointer"
        onClick={() => setDetailsOpen(v => !v)}
      >
        {/* Name / meta column - never truncated, this is the important part */}
        <div
          className="flex items-start gap-1 min-w-0 md:basis-[38%] md:max-w-[38%] flex-shrink-0"
          style={{ paddingLeft: indent }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button
                className="flex-shrink-0 h-3.5 w-3.5 mt-0.5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={open ? "Collapse span" : "Expand span"}
                onClick={e => e.stopPropagation()}
              >
                {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </CollapsibleTrigger>
          ) : (
            <span className="w-3.5 flex-shrink-0" />
          )}

          <span className="break-words">
            {method && <span className={cn(methodTextColor(method), "font-semibold mr-1")}>{method.toUpperCase()}</span>}
            {typeof statusCode === "number" && <span className={cn(statusTextColor(statusCode), "font-semibold mr-1")}>{statusCode}</span>}
            <span className="text-foreground" title={target || node.name}>{target || node.name}</span>
          </span>
        </div>

        {/* Timeline column */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="relative flex-1 h-4 bg-muted border border-border">
            <div
              className={cn(
                "absolute top-0 h-full border",
                isError ? "bg-red-500 border-red-900 dark:border-red-950" : "bg-emerald-500 border-emerald-900 dark:border-emerald-950"
              )}
              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
              title={`${node.name} · ${formatDuration(durationMs)}`}
            />
          </div>
          <span className="text-xs text-muted-foreground w-16 flex-shrink-0 text-right">
            {formatDuration(durationMs)}
          </span>
        </div>
      </div>

      {detailsOpen && (
        <div className="mb-1.5 ml-4 mt-1 bg-muted/30 rounded p-2 font-mono text-xs overflow-x-auto border" onClick={e => e.stopPropagation()}>
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(node, (key, value) => key === "children" ? undefined : value, 2)}</pre>
        </div>
      )}

      {hasChildren && (
        <CollapsibleContent>
          {node.children.map(child => (
            <SpanWaterfallRow
              key={child._spanContext?.spanId || child._id}
              node={child}
              traceStartMs={traceStartMs}
              traceDurationMs={traceDurationMs}
              depth={depth + 1}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

export default SpanWaterfallRow
