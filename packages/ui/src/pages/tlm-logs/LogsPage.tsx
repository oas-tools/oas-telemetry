import { useState, useEffect, useCallback } from "react"
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
  const [loading, setLoading] = useState(true)

  // Logs
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([])
  const [firstTimestamp, setFirstTimestamp] = useState<number | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)

  // Query and text search to send to backend
  const [queryToSend, setQueryToSend] = useState<any>({})
  const [textSearchToSend, setTextSearchToSend] = useState<string>("")

  const loadInitialLogs = useCallback(async (query: any = {}, textSearch: string = "") => {
    setLoading(true)
    setQueryToSend(query)
    setTextSearchToSend(textSearch)
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
      } else {
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
    if (!firstTimestamp || currentLogs.length === 0) return
    console.log("Enough logs, loading older logs")
    try {
      const response = await logsService.findOlderLogs(
        { query: queryToSend, textSearch: textSearchToSend, limit: LOGS_PER_FETCH },
        firstTimestamp,
      )
      const logs = response.logs.sort((a, b) => getLogTimestamp(a) - getLogTimestamp(b))
      const existingIds = new Set(currentLogs.map((l) => l._id))
      const newLogs = logs.filter((l) => !existingIds.has(l._id))
      console.log("Fetched older logs: ", newLogs.length)
      setCurrentLogs((prev) => [...newLogs, ...prev])
      setFirstTimestamp(newLogs.length > 0 ? getLogTimestamp(newLogs[0]) : firstTimestamp)
    } catch {
      toast.error("Failed to load older logs")
    }
  }, [firstTimestamp, currentLogs, queryToSend, textSearchToSend])

  const loadNewerLogs = useCallback(async () => {
    // If no logs yet, load initial logs instead
    if (!lastTimestamp) {
      console.log("[loadNewerLogs] No lastTimestamp, loading initial logs")
      return loadInitialLogs(queryToSend, textSearchToSend)
    }
    
    try {
      const response = await logsService.findNewerLogs(
        { query: queryToSend, textSearch: textSearchToSend, limit: LOGS_PER_FETCH },
        lastTimestamp,
      )
      const logs = response.logs.sort((a, b) => getLogTimestamp(a) - getLogTimestamp(b))
      const existingIds = new Set(currentLogs.map((l) => l._id))
      const newLogs = logs.filter((l) => !existingIds.has(l._id))
      setCurrentLogs((prev) => {
        const updated = [...prev, ...newLogs]
        return updated
      })
      if (newLogs.length > 0) {
        setLastTimestamp(getLogTimestamp(newLogs[newLogs.length - 1]))
      }
    } catch {
      toast.error("Failed to load newer logs")
    }
  }, [lastTimestamp, currentLogs, queryToSend, textSearchToSend, loadInitialLogs])

  // Initial load
  useEffect(() => {
    loadInitialLogs()
  }, [loadInitialLogs])

  const uniqueServices = Array.from(
    new Set(currentLogs.map((log) => log.resource?.attributes?.service?.name)),
  ).filter(Boolean) as string[]

  // Handler for logs reset event from management card
  const handleLogsReset = () => {
    setCurrentLogs([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    loadInitialLogs({}, "")
  }

  // Update queryToSend and textSearchToSend when filters change
  const handleFiltersChange = (query: any, textSearch: string) => {
    setCurrentLogs([])
    setFirstTimestamp(null)
    setLastTimestamp(null)
    setQueryToSend(query)
    setTextSearchToSend(textSearch)
    loadInitialLogs(query, textSearch)
  }


  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <LogsCollectionPanel onLogsReset={handleLogsReset} />
        <LogsFiltersCard
          uniqueServices={uniqueServices}
          loading={loading}
          onFiltersChange={handleFiltersChange}
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