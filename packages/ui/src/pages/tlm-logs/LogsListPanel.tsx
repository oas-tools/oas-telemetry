import { CardDescription, CardTitle } from "@/components/ui/card"
import { useEffect, useRef, useState } from "react"
import { Virtuoso } from "react-virtuoso"
import CollapsibleCard from "../../components/CollapsibleCard"
import type { LogEntry } from "./LogItem"
import LogItem from "./LogItem"

const ROWS_COUNT_THRESHOLD = 15

interface LogsListProps {
  logs: LogEntry[];
  loadOlderLogs: () => Promise<void>;
  loadNewerLogs: () => Promise<void>;
}

export default function LogsList({ logs, loadOlderLogs, loadNewerLogs }: LogsListProps) {
  const virtuosoRef = useRef<any>(null)
  const isItemsBelowMinimum = useRef(true)
  //Can not be negative, so start with a large number
  const [firstItemIndex, setFirstItemIndex] = useState(100_000_000)
  const prevCountRef = useRef(0)
  const prevLogsRef = useRef<LogEntry[]>([])
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    isItemsBelowMinimum.current = logs.length <= ROWS_COUNT_THRESHOLD

    const prevLogs = prevLogsRef.current
    let addedAtTop = 0

    if (logs.length > prevLogs.length && prevLogs.length > 0 && logs[0]?._id !== prevLogs[0]?._id 
    ) {
      addedAtTop = logs.length - prevLogs.length
      setFirstItemIndex((prev) => prev - addedAtTop)
      console.log(`[LogsListPanel] ADDED AT TOP: prevLogs.length=${prevLogs.length} + addedAtTop=${addedAtTop} = logs.length=${logs.length}`)
    }
    prevLogsRef.current = logs
    prevCountRef.current = logs.length
  }, [logs])

  const handleStartReached = async () => {
    console.log("Top reached triggered")
    if (isItemsBelowMinimum.current) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    await loadOlderLogs()
  }

  const handleEndReached = async () => {
    console.log("Bottom reached triggered")

    if (isItemsBelowMinimum.current) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
    await loadNewerLogs()
  }

  return (
    <CollapsibleCard
      isOpen={expanded}
      onToggle={() => setExpanded((v) => !v)}
      header={
        <>
          <CardTitle>Logs History</CardTitle>
          <CardDescription>View and scroll through log entries</CardDescription>
        </>
      }
    >
      {logs.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No logs to display. Please update your filter or try again later.
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          firstItemIndex={firstItemIndex}
          style={{ height: "70vh" }}
          data={logs}
          initialTopMostItemIndex={logs.length - 1}
          itemContent={(_, log) => <LogItem log={log} />}
          startReached={handleStartReached}
          endReached={handleEndReached}
        />
      )}
    </CollapsibleCard>
  )
}

