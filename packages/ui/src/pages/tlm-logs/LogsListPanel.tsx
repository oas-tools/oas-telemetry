import VirtualizedListPanel from "@/components/VirtualizedListPanel"
import type { LogEntry } from "./LogItem"
import LogItem from "./LogItem"

interface LogsListProps {
  logs: LogEntry[]
  loadOlderLogs: () => Promise<void>
  loadNewerLogs: () => Promise<void>
}

export default function LogsList({ logs, loadOlderLogs, loadNewerLogs }: LogsListProps) {
  return (
    <VirtualizedListPanel<LogEntry>
      items={logs}
      itemContent={(_, log) => <LogItem log={log} />}
      title="Logs History"
      description="View and scroll through log entries"
      emptyMessage="No logs to display. Please update your filter or try again later."
      loadOlderItems={loadOlderLogs}
      loadNewerItems={loadNewerLogs}
      panelName="LogsListPanel"
    />
  )
}

