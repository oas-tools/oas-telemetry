import { useNavigate } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  BarChart3,
  FileText,
  MemoryStick,
  RefreshCw,
} from "lucide-react"
import { ChartAreaLegend } from "@/components/mocks/simple-chart"
import { getLogLevelColor, getMethodColor, getStatusColor } from "@/utils/styles"
import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { utilService } from "@/services/utilService"

export default function LandingPage() {
  const navigate = useNavigate()

  const [heapStats, setHeapStats] = useState<any | null>(null)
  const [autoUpdateHeap, setAutoUpdateHeap] = useState(false)

  useEffect(() => {
    loadHeapStats()
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

  const loadHeapStats = async () => {
    try {
      const stats = await utilService.getHeapStats()
      setHeapStats(stats)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load heap stats:", error)
    }
  }

  const mockTraces = [
    {
      method: "GET",
      path: "/api/v1/users",
      status: 200,
      time: "12:34:56",
      duration: "0.123s",
    },
    {
      method: "POST",
      path: "/api/v1/orders",
      status: 201,
      time: "12:35:12",
      duration: "0.245s",
    },
    {
      method: "GET",
      path: "/api/v1/reports/5",
      status: 200,
      time: "12:35:28",
      duration: "0.089s",
    },
  ]

  const mockLogs = [
    {
      level: "INFO",
      message: "Server started on port 3000",
      time: "12:30:00",
    },
    {
      level: "WARN",
      message: "High memory usage detected",
      time: "12:32:15",
    },
    {
      level: "ERROR",
      message: "Database connection timeout",
      time: "12:33:42",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="py-16">
        <div className="container mx-auto px-6">
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

          {/* Separador visual */}
          <div className="mt-10" />

          {/* Opcional: título para la sección de navegación */}
          {/* <h2 className="text-2xl font-bold mb-6 text-gray-800">Explore Telemetry</h2> */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate("/traces")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Traces
                </CardTitle>
                <CardDescription>
                  Monitor API request traces and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockTraces.map((trace, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center text-sm gap-2"
                    >
                      <Badge
                        className={`${getMethodColor(trace.method)} border rounded-sm`}
                      >
                        {trace.method}
                      </Badge>

                      <Badge
                        className={`${getStatusColor(trace.status)} border rounded-sm`}
                      >
                        {trace.status}
                      </Badge>
                      <code className="text-xs">{trace.path}</code>
                      <span className="text-gray-500">{trace.duration}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate("/metrics")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Metrics
                </CardTitle>
                <CardDescription>
                  Real-time performance metrics and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <ChartAreaLegend />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate("/logs")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Logs
                </CardTitle>
                <CardDescription>
                  Application logs and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Badge
                        className={`${getLogLevelColor(
                          log.level
                        )} border rounded-sm text-xs`}
                      >
                        {log.level}
                      </Badge>
                      <div className="flex-1">
                        <div className="text-gray-900">{log.message}</div>
                        <div className="text-gray-500 text-xs">
                          {log.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
