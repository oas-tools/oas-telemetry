import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Activity, MemoryStick, Globe, ChevronUp, ChevronDown } from "lucide-react"
import { telemetryService, type ApiEndpoint, type HeapStats, type TelemetryStatus } from "@/services/telemetryService"
import { getMethodColor, getStatusColor } from "@/utils/styles"


type SortField = "path" | "method" | "status" | "requestCount" | "averageResponseTime"
type SortDirection = "asc" | "desc"

export default function TracesPage() {
  const navigate = useNavigate()
  const [telemetryStatus, setTelemetryStatus] = useState<TelemetryStatus>({ active: false, valid: true })
  const [heapStats, setHeapStats] = useState<HeapStats | null>(null)
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([])
  const [autoUpdateHeap, setAutoUpdateHeap] = useState(false)
  const [autoUpdateEndpoints, setAutoUpdateEndpoints] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("path")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (autoUpdateHeap) {
      interval = setInterval(loadHeapStats, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoUpdateHeap])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (autoUpdateEndpoints) {
      interval = setInterval(loadApiEndpoints, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoUpdateEndpoints])

  const loadInitialData = async () => {
    try {
      const [status, heap, endpoints] = await Promise.all([
        telemetryService.getTelemetryStatus(),
        telemetryService.getHeapStats(),
        telemetryService.getApiEndpoints(),
      ])
      setTelemetryStatus(status)
      setHeapStats(heap)
      setApiEndpoints(endpoints)
    } catch (error) {
      console.error("Failed to load initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadHeapStats = async () => {
    try {
      const stats = await telemetryService.getHeapStats()
      setHeapStats(stats)
    } catch (error) {
      console.error("Failed to load heap stats:", error)
    }
  }

  const loadApiEndpoints = async () => {
    try {
      const endpoints = await telemetryService.getApiEndpoints()
      setApiEndpoints(endpoints)
    } catch (error) {
      console.error("Failed to load API endpoints:", error)
    }
  }

  const handleTelemetryToggle = async (checked: boolean) => {
    try {
      await telemetryService.toggleTelemetry(checked)
      setTelemetryStatus((prev) => ({ ...prev, active: checked }))
    } catch (error) {
      console.error("Failed to toggle telemetry:", error)
    }
  }

  const handleResetTelemetry = async () => {
    try {
      await telemetryService.resetTelemetryData()
      await loadApiEndpoints()
    } catch (error) {
      console.error("Failed to reset telemetry:", error)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedEndpoints = [...apiEndpoints].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Traces Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Traces Management
            </CardTitle>
            <CardDescription>Control traces collection and data management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch id="traces-status" checked={telemetryStatus.active} onCheckedChange={handleTelemetryToggle} />
                  <Label htmlFor="traces-status">
                    Traces Collection: {telemetryStatus.active ? "Active" : "Stopped"}
                  </Label>
                </div>
                <Badge variant={telemetryStatus.active ? "default" : "secondary"}>
                  {telemetryStatus.active ? "Running" : "Stopped"}
                </Badge>
              </div>
              <Button onClick={handleResetTelemetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Traces Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Heap Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MemoryStick className="h-5 w-5" />
              Heap Statistics
            </CardTitle>
            <CardDescription>Memory usage and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Switch id="auto-update-heap" checked={autoUpdateHeap} onCheckedChange={setAutoUpdateHeap} />
                <Label htmlFor="auto-update-heap">Auto Update: {autoUpdateHeap ? "Enabled" : "Manual"}</Label>
              </div>
              <Button onClick={loadHeapStats} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Update
              </Button>
            </div>

            {heapStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-600">Used Heap</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {heapStats.used_heap_size.toFixed(2)} {heapStats.units}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-600">Total Heap</div>
                  <div className="text-2xl font-bold text-green-900">
                    {heapStats.total_heap_size.toFixed(2)} {heapStats.units}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-yellow-600">Available</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {heapStats.total_available_size.toFixed(2)} {heapStats.units}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">External Memory</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {heapStats.external_memory.toFixed(2)} {heapStats.units}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-600">Heap Limit</div>
                  <div className="text-2xl font-bold text-red-900">
                    {heapStats.heap_size_limit.toFixed(2)} {heapStats.units}
                  </div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-indigo-600">Peak Malloc</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    {heapStats.peak_malloced_memory.toFixed(2)} {heapStats.units}
                  </div>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-pink-600">Native Contexts</div>
                  <div className="text-2xl font-bold text-pink-900">{heapStats.number_of_native_contexts}</div>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-cyan-600">Global Handles</div>
                  <div className="text-2xl font-bold text-cyan-900">
                    {heapStats.used_global_handles_size.toFixed(3)} {heapStats.units}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Traces Endpoints
            </CardTitle>
            <CardDescription>API endpoint monitoring and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-update-endpoints"
                  checked={autoUpdateEndpoints}
                  onCheckedChange={setAutoUpdateEndpoints}
                />
                <Label htmlFor="auto-update-endpoints">Auto Update: {autoUpdateEndpoints ? "Enabled" : "Manual"}</Label>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("path")}>
                      <div className="flex items-center gap-2">
                        Path
                        <SortIcon field="path" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("method")}>
                      <div className="flex items-center gap-2">
                        Method
                        <SortIcon field="method" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-2">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead
                      className="text-center cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("requestCount")}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Request Count
                        <SortIcon field="requestCount" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("averageResponseTime")}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Avg Response Time
                        <SortIcon field="averageResponseTime" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEndpoints.map((endpoint, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{endpoint.path}</TableCell>
                      <TableCell>
                        <Badge className={`${getMethodColor(endpoint.method)} border rounded-sm`}>
                          {endpoint.method.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(endpoint.status)} border rounded-sm`}>
                          {endpoint.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{endpoint.description}</TableCell>
                      <TableCell className="text-center font-semibold">{endpoint.requestCount}</TableCell>
                      <TableCell className="text-center">{endpoint.averageResponseTime.toFixed(3)}s</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            navigate(
                              `/traces/details?path=${encodeURIComponent(endpoint.path)}&method=${encodeURIComponent(
                                endpoint.method
                              )}&status=${endpoint.status}`
                            )
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
