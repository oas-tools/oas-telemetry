import type { Span } from "@/services/traceService"
import { getSpanDurationMs, getSpanStartMs } from "@/lib/helpers/trace"

export interface SpanNode extends Span {
  children: SpanNode[]
}

export interface SpanTree {
  roots: SpanNode[]
  traceStartMs: number
  traceDurationMs: number
}

function getSpanId(span: Span): string | undefined {
  return span._spanContext?.spanId
}

function getParentSpanId(span: Span): string | undefined {
  return span.parentSpanContext?.spanId
}

/**
 * Builds a span hierarchy from a flat list of spans belonging to (at least) one trace.
 *
 * A span becomes a root if it has no parent, or if its parent isn't present in the given
 * list — this keeps it working even for a partial set of spans (e.g. spans fetched from a
 * single service while a distributed trace also has spans elsewhere), rather than requiring
 * every span's ancestor chain to be complete.
 */
export function buildSpanTree(spans: Span[]): SpanTree {
  const nodesBySpanId = new Map<string, SpanNode>()
  spans.forEach(span => {
    const spanId = getSpanId(span)
    if (spanId) nodesBySpanId.set(spanId, { ...span, children: [] })
  })

  const roots: SpanNode[] = []
  nodesBySpanId.forEach(node => {
    const parentId = getParentSpanId(node)
    const parent = parentId ? nodesBySpanId.get(parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortByStart = (a: SpanNode, b: SpanNode) => getSpanStartMs(a) - getSpanStartMs(b)
  const sortRecursively = (nodes: SpanNode[]) => {
    nodes.sort(sortByStart)
    nodes.forEach(node => sortRecursively(node.children))
  }
  sortRecursively(roots)

  const startTimes = spans.map(getSpanStartMs).filter(ms => ms > 0)
  const endTimes = spans.map(span => getSpanStartMs(span) + getSpanDurationMs(span)).filter(ms => ms > 0)
  const traceStartMs = startTimes.length > 0 ? Math.min(...startTimes) : 0
  const traceEndMs = endTimes.length > 0 ? Math.max(...endTimes) : traceStartMs
  const traceDurationMs = Math.max(traceEndMs - traceStartMs, 0.001) // avoid divide-by-zero for instant spans

  return { roots, traceStartMs, traceDurationMs }
}
