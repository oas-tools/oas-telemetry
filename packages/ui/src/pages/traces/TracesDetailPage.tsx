import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { RefreshCw, Clock, Globe, Activity } from "lucide-react"
import { telemetryService, type ParsedTrace, type TraceSpan } from "@/services/telemetryService"
import { getStatusColor } from "@/utils/styles";
import { getMethodColor } from "@/utils/styles";

interface TracesDetailPageProps {
  path?: string
  method?: string
  status?: number
  onBack?: () => void
  onNavigateToLanding?: () => void
}



export default function TracesDetailPage({
  path = "/api/v1/pets",
  method = "GET",
  status = 200,
}: TracesDetailPageProps) {
  const [traces, setTraces] = useState<ParsedTrace[]>([])
  const [selectedTrace, setSelectedTrace] = useState<TraceSpan | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadTraces()
  }, [path, method, status])

  const loadTraces = async () => {
    try {
      setLoading(true)
      const traceData = await telemetryService.getTracesByEndpoint(path, method, status)
      setTraces(traceData)
    } catch (error) {
      console.error("Failed to load traces:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTraceClick = async (traceId: string) => {
    try {
      const traceDetails = await telemetryService.getTraceDetails(traceId)
      setSelectedTrace(traceDetails)
      setDialogOpen(true)
    } catch (error) {
      console.error("Failed to load trace details:", error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Endpoint Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Endpoint Information
            </CardTitle>
            <CardDescription>Telemetry data for specific endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-lg">
              <Badge className={`${getMethodColor(method)} border rounded-sm text-sm`}>
                {method.toUpperCase()}
              </Badge>
              <code className="bg-gray-100 px-2 py-1 rounded font-mono">{path}</code>
              <Badge className={`${getStatusColor(status)} border rounded-sm`}>{status}</Badge>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Showing {traces.length} trace{traces.length !== 1 ? "s" : ""} for this endpoint
            </div>
          </CardContent>
        </Card>

        {/* Request Traces */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Request Traces
            </CardTitle>
            <CardDescription>Individual request traces and performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={loadTraces} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Response Time</TableHead>
                      <TableHead>Trace ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {traces.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No traces found for this endpoint
                        </TableCell>
                      </TableRow>
                    ) : (
                      traces.map((trace) => (
                        <TableRow
                          key={trace.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleTraceClick(trace.traceId)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {formatTimestamp(trace.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{trace.endpoint}</TableCell>
                          <TableCell>
                            <Badge className={`${getMethodColor(trace.method)} border rounded-sm`}>
                              {trace.method.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(trace.status)} border rounded-sm`}>
                              {trace.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">{trace.duration.toFixed(3)}s</TableCell>
                          <TableCell className="font-mono text-xs text-gray-600">
                            {trace.traceId.substring(0, 16)}...
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Trace Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trace Details</DialogTitle>
            <DialogDescription>Complete trace information and metadata</DialogDescription>
          </DialogHeader>
          {/* Increased size for both dimensions */}
              <ScrollArea className="overflow-auto overflow-x-hidden max-h-[70vh]">
              <pre className="text-xs bg-gray-50 p-4 rounded-lg whitespace-pre overflow-y-auto overflow-x-hidden">
                {selectedTrace ? JSON.stringify(selectedTrace, null, 2) : "Loading..."}
              </pre>
              <ScrollBar orientation="horizontal" />
              </ScrollArea>

        </DialogContent>
      </Dialog>
    </div>
  )
}
