import { useState, useEffect, useCallback } from "react"
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
  const [loading, setLoading] = useState(true)

  // Spans
  const [currentSpans, setCurrentSpans] = useState<Span[]>([])
  const [firstTimestamp, setFirstTimestamp] = useState<number | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)

  // Query to send to backend
  const [queryToSend, setQueryToSend] = useState<any>({})

  const loadInitialSpans = useCallback(async (query: any = {}) => {
    setLoading(true)
    setQueryToSend(query)
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
      } else {
        toast.info("No spans found")
      }
    } catch {
      toast.error("Failed to load spans")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOlderSpans = useCallback(async () => {
    if (!firstTimestamp || currentSpans.length === 0) return
    console.log("Loading older spans")
    try {
      const query = { ...queryToSend, timestamp: { $lt: firstTimestamp } }
      const response = await traceService.findSpans({
        query,
        limit: SPANS_PER_FETCH,
      })
      const spans = response.spans.sort((a, b) => getSpanTimestamp(a) - getSpanTimestamp(b))
      const existingIds = new Set(currentSpans.map((s) => s._id))
      const newSpans = spans.filter((s) => !existingIds.has(s._id))
      console.log("Fetched older spans: ", newSpans.length)
      setCurrentSpans((prev) => [...newSpans, ...prev])
      setFirstTimestamp(newSpans.length > 0 ? getSpanTimestamp(newSpans[0]) : firstTimestamp)
    } catch {
      toast.error("Failed to load older spans")
    }
  }, [firstTimestamp, currentSpans, queryToSend])

  const loadNewerSpans = useCallback(async () => {
    // If no spans yet, load initial spans instead
    if (!lastTimestamp) {
      console.log("[loadNewerSpans] No lastTimestamp, loading initial spans")
      return loadInitialSpans(queryToSend)
    }
    
    try {
      const query = { ...queryToSend, timestamp: { $gt: lastTimestamp } }
      const response = await traceService.findSpans({
        query,
        limit: SPANS_PER_FETCH,
      })
      const spans = response.spans.sort((a, b) => getSpanTimestamp(a) - getSpanTimestamp(b))
      const existingIds = new Set(currentSpans.map((s) => s._id))
      const newSpans = spans.filter((s) => !existingIds.has(s._id))
      setCurrentSpans((prev) => {
        const updated = [...prev, ...newSpans]
        return updated
      })
      if (newSpans.length > 0) {
        setLastTimestamp(getSpanTimestamp(newSpans[newSpans.length - 1]))
      }
    } catch {
      toast.error("Failed to load newer spans")
    }
  }, [lastTimestamp, currentSpans, queryToSend, loadInitialSpans])

  // Initial load
  useEffect(() => {
    loadInitialSpans()
  }, [loadInitialSpans])

  // Extract unique endpoints for filters
  const uniqueEndpoints = Array.from(
    new Set(currentSpans.map((span) => span.attributes?.http?.target)),
  ).filter(Boolean) as string[]

  // Handler for spans reset event from collection panel
  const handleSpansReset = () => {
    setCurrentSpans([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    loadInitialSpans({})
  }

  // Update queryToSend when filters change
  const handleFiltersChange = (query: any) => {
    setCurrentSpans([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    setQueryToSend(query)
    loadInitialSpans(query)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <TracesCollectionPanel onTracesReset={handleSpansReset} />
        <SpansFiltersPanel
          uniqueEndpoints={uniqueEndpoints}
          loading={loading}
          onFiltersChange={handleFiltersChange}
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
