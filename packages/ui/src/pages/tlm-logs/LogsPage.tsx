import { useState, useEffect, useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { logsService, type LogEntry } from "@/services/logService"
import LogsFiltersCard from "./LogsFiltersPanel"
import LogsList from "./LogsListPanel"
import LogsCollectionPanel from "./LogsCollectionPanel"

const LOGS_PER_FETCH = 30

// Helpers ---------------------------------------------------
const getLogTimestamp = (log: LogEntry) =>
  typeof log.timestamp === "number" ? log.timestamp : Number(log.timestamp)

// Main Component ---------------------------------------------
export default function LogsPage() {
  // Read traceId from URL if present
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const traceIdFromUrl = params.get("traceId") || "";
  const [loading, setLoading] = useState(true)

  // Logs
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([])
  const [firstTimestamp, setFirstTimestamp] = useState<number | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)

  // Query and text search to send to backend
  const [queryToSend, setQueryToSend] = useState<any>({})
  const [textSearchToSend, setTextSearchToSend] = useState<string>("")
  const [hasManualSearch, setHasManualSearch] = useState(false)
  // For initial filter hydration
  const [initialTraceId, setInitialTraceId] = useState(traceIdFromUrl)

  const loadInitialLogs = useCallback(async (query: any = {}, textSearch: string = "", isManual: boolean = false) => {
    setLoading(true)
    setQueryToSend(query)
    setTextSearchToSend(textSearch)
    setHasManualSearch(isManual)
    try {
      const response = await logsService.findLogs({
        query,
        textSearch,
        limit: LOGS_PER_FETCH,
      })
      const logs = response.logs
      setCurrentLogs(logs)
      if (logs.length > 0) {
        setFirstTimestamp(getLogTimestamp(logs[0]))
        setLastTimestamp(getLogTimestamp(logs[logs.length - 1]))
      } else if (isManual && logs.length === 0) {
        // Only show "No logs found" if user did a manual search
        toast.info("No logs found")
      }
    } catch {
      toast.error("Failed to load logs")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOlderLogs = useCallback(async () => {
    // If no logs loadNewerLogs will handle it.
    if (!firstTimestamp) return
    //
    try {
      const response = await logsService.findOlderLogs(
        { query: queryToSend, textSearch: textSearchToSend, limit: LOGS_PER_FETCH },
        firstTimestamp,
      )
      const logs = response.logs.sort((a, b) => getLogTimestamp(a) - getLogTimestamp(b))
      
      // Track new logs for later timestamp update
      let filteredNewLogs: LogEntry[] = []
      
      // Use functional setState to access current state and avoid stale closure
      setCurrentLogs((prev) => {
        if (prev.length === 0) return prev
        const existingIds = new Set(prev.map((l) => l._id))
        filteredNewLogs = logs.filter((l) => !existingIds.has(l._id))
        return [...filteredNewLogs, ...prev]
      })
      
      //
      
      // Update timestamp only if there are new logs
      if (filteredNewLogs.length > 0) {
        setFirstTimestamp(getLogTimestamp(filteredNewLogs[0]))
      }
    } catch {
      toast.error("Failed to load older logs")
    }
  }, [firstTimestamp, queryToSend, textSearchToSend])

  const loadNewerLogs = useCallback(async () => {
    // If no logs yet, load initial logs instead (but don't show "no logs" toast)
    if (!lastTimestamp) {
      //
      return loadInitialLogs(queryToSend, textSearchToSend, false)
    }
    
    try {
      const response = await logsService.findNewerLogs(
        { query: queryToSend, textSearch: textSearchToSend, limit: LOGS_PER_FETCH },
        lastTimestamp,
      )
      const logs = response.logs.sort((a, b) => getLogTimestamp(a) - getLogTimestamp(b))
      
      // Track new logs for later timestamp update
      let filteredNewLogs: LogEntry[] = []
      
      // Use functional setState to access current state and avoid stale closure
      setCurrentLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l._id))
        filteredNewLogs = logs.filter((l) => !existingIds.has(l._id))
        return [...prev, ...filteredNewLogs]
      })
      
      // Update timestamp only if there are new logs
      if (filteredNewLogs.length > 0) {
        setLastTimestamp(getLogTimestamp(filteredNewLogs[filteredNewLogs.length - 1]))
      }
    } catch {
      toast.error("Failed to load newer logs")
    }
  }, [lastTimestamp, queryToSend, textSearchToSend, loadInitialLogs])

  // Initial load
  useEffect(() => {
    // If traceId is in URL, filter by it on first load
    if (traceIdFromUrl) {
      loadInitialLogs({ traceId: traceIdFromUrl }, "", false)
    } else {
      loadInitialLogs({}, "", false)
    }
  }, [loadInitialLogs, traceIdFromUrl])

  // Extract and memoize unique services for filters (don't recalculate on every render)
  const uniqueServices = useMemo(() =>
    Array.from(
      new Set(currentLogs.map((log) => log.resource?.attributes?.service?.name)),
    ).filter(Boolean) as string[],
    [currentLogs]
  )

  // Handler for logs reset event from management card
  const handleLogsReset = () => {
    setCurrentLogs([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    setHasManualSearch(false)
    loadInitialLogs({}, "", false)
  }

  // Update queryToSend and textSearchToSend when filters change (user action = manual search)
  const handleFiltersChange = (query: any, textSearch: string) => {
    setCurrentLogs([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    loadInitialLogs(query, textSearch, true)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <LogsCollectionPanel onLogsReset={handleLogsReset} />
        <LogsFiltersCard
          uniqueServices={uniqueServices}
          loading={loading}
          onFiltersChange={handleFiltersChange}
          initialTraceId={initialTraceId}
        />
        <LogsList
          logs={currentLogs}
          loadOlderLogs={loadOlderLogs}
          loadNewerLogs={loadNewerLogs}
        />
      </main>
    </div>
  )
}