import { useState, useEffect, useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { traceService, type Span } from "@/services/traceService"
import SpansFiltersPanel from "./SpansFiltersPanel"
import SpansList from "./SpansListPanel"
import TracesCollectionPanel from "./TracesCollectionPanel"

const SPANS_PER_FETCH = 30

// Helpers ---------------------------------------------------
const getSpanTimestamp = (span: Span) =>
  typeof span.timestamp === "number" ? span.timestamp : Number(span.timestamp)

// Main Component ---------------------------------------------
export default function TraceSpansPage() {
  // Read traceId from URL if present
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const traceIdFromUrl = params.get("traceId") || "";
  const [loading, setLoading] = useState(true)

  // Spans
  const [currentSpans, setCurrentSpans] = useState<Span[]>([])
  const [firstTimestamp, setFirstTimestamp] = useState<number | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)

  // Query to send to backend
  const [queryToSend, setQueryToSend] = useState<any>({})
  const [hasManualSearch, setHasManualSearch] = useState(false)

  const loadInitialSpans = useCallback(async (query: any = {}, isManual: boolean = false) => {
    setLoading(true)
    setQueryToSend(query)
    setHasManualSearch(isManual)
    try {
      const response = await traceService.findSpans({
        query,
        limit: SPANS_PER_FETCH,
      })
      const spans = response.spans
      setCurrentSpans(spans)
      if (spans.length > 0) {
        setFirstTimestamp(getSpanTimestamp(spans[0]))
        setLastTimestamp(getSpanTimestamp(spans[spans.length - 1]))
      } else if (isManual && spans.length === 0) {
        // Only show "No spans found" if user did a manual search
        toast.info("No spans found")
      }
    } catch {
      toast.error("Failed to load spans")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOlderSpans = useCallback(async () => {
    if (!firstTimestamp) return
    try {
      const query = { ...queryToSend, timestamp: { $lt: firstTimestamp } }
      const response = await traceService.findSpans({
        query,
        limit: SPANS_PER_FETCH,
      })
      const spans = response.spans.sort((a, b) => getSpanTimestamp(a) - getSpanTimestamp(b))
      setCurrentSpans((prev) => {
        if (prev.length === 0) return prev
        const existingIds = new Set(prev.map((s) => s._id))
        const newSpans = spans.filter((s) => !existingIds.has(s._id))
        return [...newSpans, ...prev]
      })
      setFirstTimestamp((prev) => {
        if (spans.length > 0) {
          return getSpanTimestamp(spans[0])
        }
        return prev
      })
    } catch {
      toast.error("Failed to load older spans")
    }
  }, [firstTimestamp, queryToSend, hasManualSearch])

  const loadNewerSpans = useCallback(async () => {
    // If no spans yet, load initial spans instead (but don't show "no spans" toast)
    if (!lastTimestamp) {
      return loadInitialSpans(queryToSend, false)
    }
    try {
      const query = { ...queryToSend, timestamp: { $gt: lastTimestamp } }
      const response = await traceService.findSpans({
        query,
        limit: SPANS_PER_FETCH,
      })
      const spans = response.spans.sort((a, b) => getSpanTimestamp(a) - getSpanTimestamp(b))
      let filteredNewSpans: Span[] = []
      setCurrentSpans((prev) => {
        const existingIds = new Set(prev.map((s) => s._id))
        filteredNewSpans = spans.filter((s) => !existingIds.has(s._id))
        return [...prev, ...filteredNewSpans]
      })
      if (filteredNewSpans.length > 0) {
        setLastTimestamp(getSpanTimestamp(filteredNewSpans[filteredNewSpans.length - 1]))
      }
    } catch {
      toast.error("Failed to load newer spans")
    }
  }, [lastTimestamp, queryToSend, loadInitialSpans, hasManualSearch])

  // Initial load
  useEffect(() => {
    if (traceIdFromUrl) {
      loadInitialSpans({ "_spanContext.traceId": traceIdFromUrl }, false)
    } else {
      loadInitialSpans({}, false)
    }
  }, [loadInitialSpans, traceIdFromUrl])

  // Extract and memoize unique endpoints for filters (don't recalculate on every render)
  const uniqueEndpoints = useMemo(() => 
    Array.from(
      new Set(currentSpans.map((span) => span.attributes?.http?.target)),
    ).filter(Boolean) as string[],
    [currentSpans]
  )

  // Handler for spans reset event from collection panel
  const handleSpansReset = () => {
    setCurrentSpans([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    setHasManualSearch(false)
    loadInitialSpans({}, false)
  }

  // Update queryToSend when filters change (user action = manual search)
  const handleFiltersChange = (query: any) => {
    const patchedQuery = { ...query }
    if (patchedQuery.traceId) {
      patchedQuery["_spanContext.traceId"] = patchedQuery.traceId
      delete patchedQuery.traceId
    }
    setCurrentSpans([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    loadInitialSpans(patchedQuery, true)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <TracesCollectionPanel onTracesReset={handleSpansReset} />
        <SpansFiltersPanel
          uniqueEndpoints={uniqueEndpoints}
          loading={loading}
          onFiltersChange={handleFiltersChange}
          initialTraceId={traceIdFromUrl}
        />
        <SpansList
          spans={currentSpans}
          loadOlderSpans={loadOlderSpans}
          loadNewerSpans={loadNewerSpans}
        />
      </main>
    </div>
  )
}
