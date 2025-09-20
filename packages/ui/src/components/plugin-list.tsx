import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Code,
  Globe,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react"
import type { Plugin } from "@/lib/types"
import { getPluginService } from "@/services/pluginService"
import { getPluginOrigin } from "@/lib/utils/plugin-utils"
import AceEditor from "react-ace"
import "ace-builds/src-noconflict/mode-javascript"
import "ace-builds/src-noconflict/mode-json"
import "ace-builds/src-noconflict/theme-monokai"
import "ace-builds/src-noconflict/ext-language_tools"

interface PluginListProps {
  onRefresh?: () => void
}

function PluginDetails({ plugin }: { plugin: Plugin }) {
  const [sourceCode, setSourceCode] = useState(plugin.sourceCode)
  const [install, setInstall] = useState(plugin.install ? JSON.stringify(plugin.install, null, 2) : "")
  const [config, setConfig] = useState(plugin.config ? JSON.stringify(plugin.config, null, 2) : "")

  useEffect(() => {
    setSourceCode(plugin.sourceCode)
    setInstall(plugin.install ? JSON.stringify(plugin.install, null, 2) : "")
    setConfig(plugin.config ? JSON.stringify(plugin.config, null, 2) : "")
  }, [plugin])

  return (
    <div className="space-y-4">
      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-2">Source Code</h5>
        <AceEditor
          mode="javascript"
          theme="monokai"
          value={sourceCode}
          name={`source_${plugin.id}`}
          readOnly={true}
          width="100%"
          fontSize={14}
          wrapEnabled
          showPrintMargin={false}
          showGutter={true}
          setOptions={{ useWorker: false }}
          minLines={5}
          maxLines={20}
          onChange={setSourceCode}
        />
      </div>
      {plugin.install && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2">Dependencies</h5>
          <AceEditor
            mode="json"
            theme="monokai"
            value={install}
            name={`install_${plugin.id}`}
            readOnly={true}
            width="100%"
            fontSize={14}
            wrapEnabled
            showPrintMargin={false}
            showGutter={true}
            setOptions={{ useWorker: false }}
            minLines={5}
            maxLines={20}
            onChange={setInstall}
          />
        </div>
      )}
      {plugin.config && Object.keys(plugin.config).length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2">Plugin Configuration</h5>
          <AceEditor
            mode="json"
            theme="monokai"
            value={config}
            name={`config_${plugin.id}`}
            readOnly={true}
            width="100%"
            fontSize={14}
            wrapEnabled
            showPrintMargin={false}
            showGutter={true}
            setOptions={{ useWorker: false }}
            minLines={5}
            maxLines={20}
            onChange={setConfig}
          />
        </div>
      )}
    </div>
  )
}

export function PluginList({ onRefresh }: PluginListProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadPlugins()
  }, [])

  const loadPlugins = async () => {
    setLoading(true)
    setError(null)
    const pluginService = getPluginService()
    const result = await pluginService.listPlugins()
    if (result.status === "success") {
      setPlugins(result.data)
    } else {
      setPlugins([])
      setError(result.message)
    }
    setLoading(false)
  }

  const togglePlugin = async (plugin: Plugin) => {
    const pluginId = plugin.id
    setActionLoading((prev) => new Set(prev).add(pluginId))

    const pluginService = getPluginService()
    let result
    if (plugin.active) {
      result = await pluginService.deactivatePlugin(pluginId)
    } else {
      result = await pluginService.activatePlugin(pluginId)
    }
    if (result.status !== "success") {
      setError(result.message)
    }
    await loadPlugins()
    onRefresh?.()
    setActionLoading((prev) => {
      const newSet = new Set(prev)
      newSet.delete(pluginId)
      return newSet
    })
  }

  const deletePlugin = async (pluginId: string) => {
    if (!confirm("Are you sure you want to delete this plugin?")) return
    setActionLoading((prev) => new Set(prev).add(pluginId))
    const pluginService = getPluginService()
    const result = await pluginService.deletePlugin(pluginId)
    if (result.status !== "success") {
      setError(result.message)
    }
    await loadPlugins()
    onRefresh?.()
    setActionLoading((prev) => {
      const newSet = new Set(prev)
      newSet.delete(pluginId)
      return newSet
    })
  }

  const exportPlugin = (plugin: Plugin) => {
    const exportData = {
      ...plugin,
      exportedAt: new Date().toISOString(),
    }
    delete exportData.process
    //MUST be an array for easy import
    const blob = new Blob([JSON.stringify([exportData], null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const date = new Date().toISOString().split("T")[0]
    a.href = url
    a.download = `plugin-${plugin.id}-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleExpanded = (pluginId: string) => {
    setExpandedPlugins((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(pluginId)) {
        newSet.delete(pluginId)
      } else {
        newSet.add(pluginId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading plugins...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadPlugins}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (plugins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Plugins Found</CardTitle>
          <CardDescription>Get started by creating your first plugin.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Plugins ({plugins.length})</CardTitle>
        <CardDescription>
          Manage your telemetry plugins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plugins.map((plugin) => {
          const isExpanded = expandedPlugins.has(plugin.id)
          const isActionLoading = actionLoading.has(plugin.id)
          const origin = getPluginOrigin(plugin)

          return (
            <Collapsible key={plugin.id} open={isExpanded} onOpenChange={() => toggleExpanded(plugin.id)}>
              <Card className="rounded-lg border-l-4 border-l-transparent data-[state=open]:border-l-primary transition-all">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="rounded-md h-9 w-9 p-0 flex-shrink-0 mt-0.5">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base">{plugin.name || plugin.id}</h3>
                          <Badge variant={plugin.active ? "default" : "secondary"}>
                            {plugin.active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-xs">
                            {plugin.moduleFormat.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono mb-2">{plugin.id}</p>
                        {plugin.description && (
                          <p className="text-sm text-muted-foreground mb-2">{plugin.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          {origin === "url" ? (
                            <div className="flex items-center gap-1 min-w-0">
                              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              {plugin.url && (
                                <a
                                  href={plugin.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline truncate"
                                >
                                  {plugin.url}
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Code className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Inline Code</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-4 self-start w-full sm:w-auto">
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Switch
                            checked={plugin.active}
                            onCheckedChange={() => togglePlugin(plugin)}
                            disabled={isActionLoading}
                          />
                          {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportPlugin(plugin)}
                          className="rounded-md h-9 w-full sm:w-9 p-0"
                          title="Export Plugin"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePlugin(plugin.id)}
                          disabled={isActionLoading}
                          className="text-destructive hover:text-destructive rounded-md h-9 w-full sm:w-9 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 rounded-b-lg">
                    <PluginDetails plugin={plugin} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </CardContent>
    </Card>
  )
}
