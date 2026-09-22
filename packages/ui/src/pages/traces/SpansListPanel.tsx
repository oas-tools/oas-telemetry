import VirtualizedListPanel from "@/components/VirtualizedListPanel"
import type { Span } from "@/services/traceService"
import SpanItem from "./SpanItem"

interface SpansListProps {
  spans: Span[]
  loadOlderSpans: () => Promise<void>
  loadNewerSpans: () => Promise<void>
}

export default function SpansList({ spans, loadOlderSpans, loadNewerSpans }: SpansListProps) {
  return (
    <VirtualizedListPanel<Span>
      items={spans}
      itemContent={(_, span) => <SpanItem span={span} />}
      title="Traces"
      description="Recent traces. Expand one to see its spans and correlated logs."
      emptyMessage="No traces to display. Please update your filter or try again later."
      loadOlderItems={loadOlderSpans}
      loadNewerItems={loadNewerSpans}
      panelName="SpansListPanel"
    />
  )
}
