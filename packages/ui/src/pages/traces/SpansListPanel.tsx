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
      title="Spans History"
      description="View and scroll through HTTP spans"
      emptyMessage="No spans to display. Please update your filter or try again later."
      loadOlderItems={loadOlderSpans}
      loadNewerItems={loadNewerSpans}
      panelName="SpansListPanel"
    />
  )
}

