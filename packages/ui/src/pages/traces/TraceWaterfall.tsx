import React from "react"
import { formatDuration } from "@/lib/helpers/trace"
import SpanWaterfallRow from "./SpanWaterfallRow"
import type { SpanTree } from "./spanTree"

// Fewer ticks than a full 0/25/50/75/100 ruler - this waterfall is embedded in a narrow
// list item, and duration labels ("352.84ms") are wide enough to overlap at that width.
const RULER_TICKS = [0, 0.5, 1]

interface TraceWaterfallProps {
  tree: SpanTree
}

const TraceWaterfall: React.FC<TraceWaterfallProps> = ({ tree }) => {
  const { roots, traceStartMs, traceDurationMs } = tree

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[280px]">
        {/* Time ruler, aligned with the timeline column of each row below */}
        <div className="flex items-center gap-2 pb-1 mb-1 border-b text-[11px] text-muted-foreground font-mono">
          <div className="hidden md:block md:basis-[38%] md:max-w-[38%] flex-shrink-0" />
          <div className="flex-1 relative h-4">
            {RULER_TICKS.map(fraction => (
              <span
                key={fraction}
                className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                style={{ left: `${fraction * 100}%` }}
              >
                {formatDuration(traceDurationMs * fraction)}
              </span>
            ))}
          </div>
          <span className="w-16 flex-shrink-0" />
        </div>

        {roots.map(root => (
          <SpanWaterfallRow
            key={root._spanContext?.spanId || root._id}
            node={root}
            traceStartMs={traceStartMs}
            traceDurationMs={traceDurationMs}
            depth={0}
          />
        ))}
      </div>
    </div>
  )
}

export default TraceWaterfall
