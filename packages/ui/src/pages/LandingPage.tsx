import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { utilService } from "@/services/utilService"
import { getLogLevelColor } from "@/utils/styles"
import {
  Bot,
  ExternalLink,
  FileText,
  MessageCircle,
  Puzzle,
  User,
  Wrench,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

// Minimal MessageBubble for fake chat
function MessageBubble({ content, timestamp, isUser }: { content: string; timestamp: Date; isUser: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full border m-1 p-1 flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div className={`max-w-[70%] rounded-md px-2 py-1 break-words ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} text-xs`}>
        {content}
        <span className="text-[10px] opacity-60 mt-0.5 block">
          {timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full border m-1 p-1 flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [heapStats, setHeapStats] = useState<any | null>(null)
  const [autoUpdateHeap, setAutoUpdateHeap] = useState(false)

  useEffect(() => { loadHeapStats() }, [])

  useEffect(() => {
    if (!autoUpdateHeap) return
    const interval = setInterval(loadHeapStats, 2000)
    return () => clearInterval(interval)
  }, [autoUpdateHeap])

  const loadHeapStats = async () => {
    try {
      const stats = await utilService.getHeapStats()
      setHeapStats(stats)
    } catch (error) {
      console.error("Failed to load heap stats:", error)
    }
  }

  const mockLogs = [
    { level: "INFO", message: "Server started on port 3000", time: "12:30:00" },
    { level: "WARN", message: "High memory usage detected", time: "12:32:15" },
    { level: "ERROR", message: "Database connection timeout", time: "12:33:42" },
    { level: "ERROR", message: "Endpoint /api/v1/orders failed with status 500", time: "12:34:10" },
    { level: "WARN", message: "Slow response detected on /api/v1/users", time: "12:34:30" },
  ]

  const fakeChat = [
    { role: "user", content: "What happened in the last error?", timestamp: new Date(Date.now() - 60000) },
    { role: "assistant", content: "The last error was a database connection timeout at 12:33.", timestamp: new Date(Date.now() - 30000) },
    { role: "user", content: "Any critical issues?", timestamp: new Date(Date.now() - 20000) },
    { role: "assistant", content: "Detected that endpoint /api/v1/orders consistently generates error logs.", timestamp: new Date() },
  ]

  const cardConfigs = [
    {
      key: "logs",
      to: "/logs",
      hoverMessage: "Go to logs page",
      header: (
        <>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Logs
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </CardTitle>
          <CardDescription>Latest system events and messages.</CardDescription>
        </>
      ),
      content: (
        <div className="space-y-3">
          {mockLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <Badge className={`${getLogLevelColor(log.level)} border rounded-sm text-xs`}>
                {log.level}
              </Badge>
              <div className="flex-1">
                <div className="text-gray-900">{log.message}</div>
                <div className="text-gray-500 text-[10px]">{log.time}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "chat",
      to: "/chat",
      hoverMessage: "Go to chat page",
      header: (
        <>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            AI Chat
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </CardTitle>
          <CardDescription>Ask the AI about logs and server requests.</CardDescription>
        </>
      ),
      content: (
        <div className="space-y-2">
          {fakeChat.map((msg, idx) => (
            <MessageBubble
              key={idx}
              content={msg.content}
              timestamp={msg.timestamp}
              isUser={msg.role === "user"}
            />
          ))}
        </div>
      ),
    },
    {
      key: "plugins",
      to: "/plugins",
      hoverMessage: "Go to plugins page",
      header: (
        <>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-green-600" />
            Plugin System
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </CardTitle>
          <CardDescription>Extend telemetry with custom plugins.</CardDescription>
        </>
      ),
      content: (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-yellow-700" />
            <span className="font-semibold text-sm">Error Detector Plugin</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Monitors logs and traces for critical errors and sends notifications.
          </div>
          <div className="bg-gray-100 rounded p-2 mt-2 text-xs font-mono">
            <span className="text-green-700">Plugin active</span>: <span className="text-gray-700">Detects "ERROR" logs and alerts team.</span>
          </div>
          <div className="bg-gray-100 rounded p-2 text-xs font-mono">
            <span className="text-blue-700">Plugin detected</span>: <span className="text-gray-700">5 logs of error caused by the same endpoint.</span>
          </div>
          <div className="bg-gray-100 rounded p-2 text-xs font-mono">
            <span className="text-purple-700">Plugin info</span>: <span className="text-gray-700">No critical errors detected in the last 24h.</span>
          </div>
        </div>
      ),
    },
  ]

  // Card wrapper with overlay only on CardContent
  function PlaceholderCard({ children, header, hoverMessage, to }: { children: React.ReactNode, header: React.ReactNode, hoverMessage: string, to: string }) {
    const [hovered, setHovered] = useState(false)
    const navigate = useNavigate()
    return (
      <Card
        className="relative group cursor-pointer"
        tabIndex={0}
        role="button"
        onClick={() => navigate(to)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CardHeader>{header}</CardHeader>
        <CardContent className="relative min-h-[260px] rounded-lg overflow-hidden flex flex-col justify-center px-10">
          {children}
          <div
            className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-200 rounded-lg mx-6 ${hovered ? "bg-gray-900 opacity-100" : "bg-gray-900 opacity-5"
              }`}
          >
            <span className="text-white font-semibold text-lg transition-opacity duration-200">
              {hovered ? hoverMessage : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Responsive cards layout: vertical stack on small screens, horizontal grid on large screens
  function CardsSection() {
    return (
      <div className="flex flex-col gap-8 xl:grid xl:grid-cols-3 xl:gap-8 ">
        {cardConfigs.map(card => (
          <PlaceholderCard
            key={card.key}
            header={card.header}
            hoverMessage={card.hoverMessage}
            to={card.to}
          >
            {card.content}
          </PlaceholderCard>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TooltipProvider>
        <section className="py-16">
          <div className="container mx-auto px-6">
            {/* Heap Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={loadHeapStats}
                        variant="outline"
                        size="sm"
                        disabled={autoUpdateHeap}
                        className={autoUpdateHeap ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        Update
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {autoUpdateHeap ? "Disabled while auto update is enabled" : "Click to manually update heap stats"}
                    </TooltipContent>
                  </Tooltip>
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
            <div className="mt-10" />
            {/* Cards section: responsive layout */}
            <CardsSection />
          </div>
        </section>
      </TooltipProvider>
    </div>
  )
}
