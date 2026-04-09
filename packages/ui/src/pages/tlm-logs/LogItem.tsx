import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { TraceLinkIcon } from "./TraceLinkIcon"
import { Badge } from "@/components/ui/badge"
import { Code2 } from "lucide-react"
import { severityOptions } from "./severityOptions"
import { toast } from "sonner"

// Accept all possible log fields
export interface LogEntry {
  _id: string
  timestamp: number
  body: string
  severityText?: string
  severity?: string
  traceId?: string
  resource?: { attributes?: { service?: { name?: string } } }
  [key: string]: any
}

interface LogItemProps {
    log: LogEntry
}

function getSeverityOption(severity?: string) {
    return severityOptions.find((opt) => opt.value === severity) || severityOptions[0]
}

function formatTimestamp(ts: number | string) {
    const ms = typeof ts === "number" ? Math.floor(ts / 1e3) : Math.floor(Number(ts) / 1e3)
    return new Date(ms).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
        .then(() => toast.success("Copied to clipboard"))
        .catch(() => toast.error("Failed to copy"))
}

const LogItem: React.FC<LogItemProps> = ({ log }) => {
    const [showDetails, setShowDetails] = useState(false)
    const severityOpt = getSeverityOption(log.severityText || log.severity)
    const SeverityIcon = severityOpt.icon
    const serviceName = log.resource?.attributes?.service?.name || "unknown-service"

    return (
        <div className="group hover:bg-muted/50 rounded-lg px-2 py-2 transition-colors border-b border-muted font-mono text-[13px]">
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground font-mono">
                <span>{formatTimestamp(log.timestamp)}</span>
                <span className="text-blue-700 dark:text-blue-400">{serviceName}</span>
                <span className="flex items-center gap-1">
                    <SeverityIcon className={severityOpt.color + " h-4 w-4"} />
                    {log.severityText || log.severity}
                </span>
                <span className="flex items-center gap-2 ml-auto">
                                        {log.traceId && (
                                            <>
                                                <Badge
                                                    variant="outline"
                                                    className="px-2 py-0.5 text-[10px] cursor-pointer font-mono"
                                                    onClick={() => copyToClipboard(log.traceId || "")}
                                                    title="Copy Trace ID"
                                                >
                                                    {log.traceId.slice(0, 8)}
                                                </Badge>
                                                <TraceLinkIcon traceId={log.traceId} />
                                            </>
                                        )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 h-7 w-7 p-0"
                        aria-label="Show more Context"
                        onClick={() => setShowDetails((v) => !v)}
                    >
                        <Code2 className="h-4 w-4" />
                    </Button>
                </span>
            </div>
            {showDetails && (
                <div className="mt-2 mb-2 bg-muted/30 rounded p-2 font-mono text-xs overflow-x-auto border">
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log, null, 2)}</pre>
                </div>
            )}
            <div className="text-sm text-foreground break-words font-mono mt-1">{log.body}</div>
        </div>
    )
}

export default LogItem