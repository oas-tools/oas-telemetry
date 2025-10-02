
import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Upload, Loader2, AlertCircle, CheckCircle, FileText } from "lucide-react"
import type { Plugin, CreatePluginRequest } from "@/lib/types"
import { getPluginService } from "@/services/pluginService"
import { exportPluginsToJson, validatePluginImport } from "@/lib/utils/plugin-utils"
import { toast } from "sonner"

interface PluginExportProps {
  plugins: Plugin[]
}

export function PluginExport({ plugins }: PluginExportProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const jsonData = exportPluginsToJson(plugins)
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `plugins-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      toast.success(
        <div>
          <div className="font-semibold">Plugins exported</div>
          <div className="text-xs whitespace-pre-line mt-1">
            Exported {plugins.length} plugin{plugins.length === 1 ? "" : "s"} successfully.
          </div>
        </div>
      )
    } catch (error) {
      toast.error(
        <div>
          <div className="font-semibold">Error exporting plugins</div>
          <div className="text-xs whitespace-pre-line mt-1">{error instanceof Error ? error.message : "Export failed"}</div>
        </div>,
        { duration: 10000 }
      )
      console.error("Export failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="gap-2 bg-transparent"
      onClick={handleExport}
      disabled={loading || plugins.length === 0}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export ({plugins.length})
    </Button>
  )
}

interface PluginImportProps {
  onPluginsImported?: () => void
}

export function PluginImport({ onPluginsImported }: PluginImportProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<CreatePluginRequest[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setError(null)
    setSuccess(null)
    setPreviewData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    resetState()

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!validatePluginImport(data)) {
        throw new Error("Invalid plugin data format")
      }

      setPreviewData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
    }
  }

  const handleImport = async () => {
    if (!previewData) return

    setLoading(true)
    setError(null)

    try {
      const pluginService = getPluginService()
      const results = []

      for (const pluginData of previewData) {
        try {
          const result = await pluginService.createPlugin(pluginData)
          if (result.status === "success") {
            results.push({ id: pluginData.id, success: true })
          } else {
            results.push({
              id: pluginData.id,
              success: false,
              error: result.message || "Unknown error",
            })
          }
        } catch (err) {
          results.push({
            id: pluginData.id,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const failureCount = results.length - successCount

      if (failureCount === 0) {
        setSuccess(`Successfully imported ${successCount} plugins`)
        toast.success(
          <div>
            <div className="font-semibold">Plugins imported</div>
            <div className="text-xs whitespace-pre-line mt-1">
              Imported {successCount} plugin{successCount === 1 ? "" : "s"} successfully.
            </div>
          </div>
        )
      } else {
        setSuccess(`Imported ${successCount} plugins (${failureCount} failed)`)
        toast.error(
          <div>
            <div className="font-semibold">Some plugins failed to import</div>
            <div className="text-xs whitespace-pre-line mt-1">
              Imported {successCount} plugin{successCount === 1 ? "" : "s"}, {failureCount} failed.
              {results.filter(r => !r.success).map(r => `\n${r.id}: ${r.error}`).join("")}
            </div>
          </div>,
          { duration: 10000 }
        )
      }

      onPluginsImported?.()

      setTimeout(() => {
        setOpen(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
      toast.error(
        <div>
          <div className="font-semibold">Error importing plugins</div>
          <div className="text-xs whitespace-pre-line mt-1">{err instanceof Error ? err.message : "Import failed"}</div>
        </div>,
        { duration: 10000 }
      )
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetState()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Plugins</DialogTitle>
          <DialogDescription>Upload a JSON file to import plugins in bulk.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {!previewData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plugin-file">Select Plugin File</Label>
                <Input id="plugin-file" type="file" accept=".json" onChange={handleFileSelect} ref={fileInputRef} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Expected Format
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
                    <code>{`[
  {
    "id": "my-plugin",
    "name": "My Plugin",
    "moduleFormat": "esm",
    "code": "export default function...",
    "active": true,
    "install": {
      "dependencies": ["lodash"],
      "ignoreErrors": false
    },
    "config": {
      "option": true
    }
  }
]`}</code>
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}

          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Preview ({previewData.length} plugins)</h3>
                <Button variant="outline" size="sm" onClick={resetState}>
                  Choose Different File
                </Button>
              </div>

              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-4 space-y-3">
                  {previewData.map((plugin, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{plugin.id}</div>
                            <div className="text-sm text-muted-foreground">
                              {plugin.url ? `URL: ${plugin.url}` : "Code provided"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {plugin.moduleFormat.toUpperCase()}
                            </Badge>
                            {plugin.install?.dependencies && (
                              <Badge variant="secondary" className="text-xs">
                                {plugin.install.dependencies.length} deps
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import {previewData.length} Plugins
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
