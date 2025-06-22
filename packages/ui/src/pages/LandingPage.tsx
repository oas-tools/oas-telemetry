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
  Zap,
  Shield,
  Puzzle,
} from "lucide-react"
import { ChartAreaLegend } from "@/components/mocks/simple-chart"
import { getLogLevelColor, getMethodColor, getStatusColor } from "@/utils/styles"

export default function LandingPage() {
  const navigate = useNavigate()

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

      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-6">Welcome to OAS-Telemetry</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Express middleware for collecting telemetry data using OpenTelemetry
            in OpenAPI Specification applications. Monitor, and
            optimize your APIs with real-time insights.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Powerful Telemetry Features
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              OAS Telemetry enhances observability for your OpenAPI-based applications, without introducing overhead.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Real-time Monitoring
              </h3>
              <p className="text-gray-600">
                Track API performance and usage in real-time with detailed
                metrics and traces
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Built with security in mind, featuring authentication and data
                ownership
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Puzzle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Extensible Plugins</h3>
              <p className="text-gray-600">
                Extend functionality with custom plugins for alerting and data
                export
              </p>
            </div>
          </div>

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
