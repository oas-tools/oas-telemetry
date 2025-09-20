"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AceEditor from "react-ace"
import { Wand2, Eraser } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code, Globe, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { getPluginService } from "@/services/pluginService"
import type { CreatePluginRequest } from "@/lib/types"
import { Switch } from "@/components/ui/switch"

import "ace-builds/src-noconflict/mode-javascript"
import "ace-builds/src-noconflict/mode-json"
import "ace-builds/src-noconflict/theme-monokai"
import "ace-builds/src-noconflict/ext-language_tools"

const dependencyExample = {
  globalOptions: '--no-save',
  verbose: false,
  ignoreErrors: false,
  dependencies: [
    { name: 'lodash', options: '--no-save', override: false },
  ]
};

const sourceExample = `
import _ from "lodash";

let text = "hello world";
let capital = _.capitalize(text);
console.log(capital);
let loaded = false;

const plugin = {
  async load(config) {
    console.log("Plugin loaded with config:", config);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    loaded = true;
    console.log("Plugin is now loaded");
  },
  unload() {
    console.log("Plugin unloaded");
  },
  isConfigured() {
    return loaded;
  },
  newLog(log) {
    // PLEASE DO NOT LOG (INFINITE LOOP RISK)
  },
  newTrace(trace) {
    console.log("New trace received");
  },
  newMetric(metric) {
    console.log("New metric received");
  }
};

export default {plugin};
`.trim();

const configExample = {
  setting1: "value1",
  setting2: "value2",
  setting3: "value3"
};

const nameExample = "Capitalize Plugin";
const descriptionExample = "A plugin that demonstrates usage of lodash's capitalize function.";

export default function PluginCreatePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<"url" | "code">("code")
  const [dependenciesEnabled, setDependenciesEnabled] = useState(false)
  const [configEnabled, setConfigEnabled] = useState(false)

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    moduleFormat: "esm" as "cjs" | "esm",
    url: "",
    code: "",
    dependencies: "",
    config: "",
  })

  const handleLoadExample = () => {
    setFormData({
      id: "capitalize-plugin",
      name: nameExample,
      description: descriptionExample,
      moduleFormat: "esm",
      url: "",
      code: sourceExample,
      dependencies: JSON.stringify(dependencyExample, null, 2),
      config: JSON.stringify(configExample, null, 2),
    });
    setDependenciesEnabled(true);
    setConfigEnabled(true);
  };

  const handleClear = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      moduleFormat: "esm",
      url: "",
      code: "",
      dependencies: "",
      config: "",
    });
    setDependenciesEnabled(false);
    setConfigEnabled(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.id.trim()) throw new Error("Plugin ID is required")
      if (!formData.name.trim()) throw new Error("Plugin name is required")
      if (sourceType === "url" && !formData.url.trim()) throw new Error("URL is required")
      if (sourceType === "code" && !formData.code.trim()) throw new Error("Code is required")

      let config = undefined
      if (configEnabled) {
        if (formData.config.trim()) {
          try {
            config = JSON.parse(formData.config)
          } catch {
            throw new Error("Invalid JSON in config field")
          }
        } else {
          config = {}
        }
      } else {
        config = {}
      }

      let install = {}
      if (dependenciesEnabled) {
        if (formData.dependencies.trim()) {
          try {
            install = JSON.parse(formData.dependencies)
          } catch {
            throw new Error("Invalid JSON in dependencies field")
          }
        } else {
          install = {}
        }
      } else {
        install = {}
      }

      const request: CreatePluginRequest = {
        id: formData.id.trim(),
        name: formData.name.trim(),
        ...(formData.description?.trim() && { description: formData.description.trim() }),
        moduleFormat: formData.moduleFormat,
        ...(sourceType === "url" ? { url: formData.url.trim() } : { code: formData.code.trim() }),
        install,
        ...(config && { config }),
      }

      const pluginService = getPluginService()
      const result = await pluginService.createPlugin(request)

      if (result.status !== "success") {
        setError(result.message)
        toast.error(
          <div>
            <div className="font-semibold">Error creating plugin</div>
            <div className="text-xs whitespace-pre-line mt-1">{result.message}</div>
          </div>,
          { duration: Infinity }
        )
        return
      }

      toast.success("Plugin created successfully!")
      navigate("/plugins")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create plugin"
      setError(msg)
      console.error("Plugin creation error:", err)
      toast.error(
        <div>
          <div className="font-semibold">Error creating plugin</div>
          <div className="text-xs whitespace-pre-line mt-1">{msg}</div>
        </div>,
        { duration: Infinity }
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">Create New Plugin</CardTitle>
                <CardDescription>Add a new plugin to your telemetry system.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadExample}
                  className="gap-2"
                  title="Load Example"
                >
                  <Wand2 className="h-4 w-4" />
                  Load Example
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="gap-2"
                  title="Clear"
                >
                  <Eraser className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plugin-id">Plugin ID *</Label>
                  <Input
                    id="plugin-id"
                    placeholder="my-plugin-unique-id"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plugin-name">Name *</Label>
                  <Input
                    id="plugin-name"
                    placeholder="My Plugin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="plugin-description">Description</Label>
                  <textarea
                    id="plugin-description"
                    placeholder="Describe what this plugin does (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full min-h-20 border rounded px-3 py-2 text-sm font-mono resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-format">Module Format *</Label>
                  <Select
                    value={formData.moduleFormat}
                    onValueChange={(value: "cjs" | "esm") => setFormData({ ...formData, moduleFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="esm">ESM (ES Modules)</SelectItem>
                      <SelectItem value="cjs">CJS (CommonJS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Source Code or URL */}
              <div className="space-y-4">
                <Label>Plugin Source *</Label>
                <Tabs value={sourceType} onValueChange={(value) => setSourceType(value as "url" | "code")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="code" className="gap-2">
                      <Code className="h-4 w-4" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="url" className="gap-2">
                      <Globe className="h-4 w-4" />
                      URL
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="code" className="space-y-4">
                    <Label htmlFor="plugin-code">Source Code</Label>
                    <AceEditor
                      mode="javascript"
                      theme="monokai"
                      value={formData.code}
                      name="plugin_code_editor"
                      width="100%"
                      fontSize={14}
                      wrapEnabled
                      showPrintMargin={false}
                      showGutter={true}
                      setOptions={{ useWorker: false }}
                      minLines={8}
                      maxLines={24}
                      onChange={(val) => setFormData({ ...formData, code: val })}
                      className="font-mono text-sm resize-y border rounded-lg"
                    />
                  </TabsContent>

                  <TabsContent value="url" className="space-y-2">
                    <Label htmlFor="plugin-url">Source URL</Label>
                    <Input
                      id="plugin-url"
                      type="url"
                      placeholder="https://example.com/my-plugin.js"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      required={sourceType === "url"}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Dependencies */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dependencies">Dependencies</Label>
                  <Switch id="dependencies-switch" checked={dependenciesEnabled} onCheckedChange={setDependenciesEnabled} />
                  <span className="text-xs text-muted-foreground">Enable</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional dependencies to install (npm @motero2k/dynamic-installer syntax)
                </p>
                {dependenciesEnabled && (
                  <AceEditor
                    mode="json"
                    theme="monokai"
                    value={formData.dependencies}
                    name="plugin_dependencies_editor"
                    width="100%"
                    fontSize={14}
                    wrapEnabled
                    showPrintMargin={false}
                    showGutter={true}
                    setOptions={{ useWorker: false }}
                    minLines={8}
                    maxLines={16}
                    onChange={(val) => setFormData({ ...formData, dependencies: val })}
                    className="font-mono text-sm resize-y border rounded-lg"
                    readOnly={!dependenciesEnabled}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="plugin-config">Plugin Configuration</Label>
                  <Switch id="config-switch" checked={configEnabled} onCheckedChange={setConfigEnabled} />
                  <span className="text-xs text-muted-foreground">Enable</span>
                </div>
                <p className="text-xs text-muted-foreground">JSON configuration object</p>
                {configEnabled && (
                  <AceEditor
                    mode="json"
                    theme="monokai"
                    value={formData.config}
                    name="plugin_config_editor"
                    width="100%"
                    fontSize={14}
                    wrapEnabled
                    showPrintMargin={false}
                    showGutter={true}
                    setOptions={{ useWorker: false }}
                    minLines={8}
                    maxLines={16}
                    onChange={(val) => setFormData({ ...formData, config: val })}
                    className="font-mono text-sm resize-y border rounded-lg"
                    readOnly={!configEnabled}
                  />
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/plugins")} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Plugin
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
