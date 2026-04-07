import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import AceEditor from "react-ace"
import { Wand2, Eraser, Info } from "lucide-react"

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
import type { CreatePluginRequest } from "@/lib/types/plugins"
import { Switch } from "@/components/ui/switch"

import "ace-builds/src-noconflict/mode-javascript"
import "ace-builds/src-noconflict/mode-json"
import "ace-builds/src-noconflict/theme-monokai"

// Replace dependency example with globalOptions and control flags
const dependencyExample = {
  globalOptions: ["--no-save"],
  verbose: false,
  ignoreErrors: false,
  dependencies: [
    {
      name: "lodash@latest",
    }
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
    // Do not worry this logs will not be captured by the telemetry system
    console.log("New log received:", log);
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

const nameExample = "Sample Plugin";
const descriptionExample = "This plugin demonstrates all available features: it reads configuration, imports a dependency (lodash) to capitalize the first letter of a message, and logs when it receives traces, metrics, or logs. You can extend it to perform any custom logic, such as sending a message to Slack or Telegram when a log matches a specific regex.";

export default function PluginCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<"url" | "code">("code")
  const [dependenciesEnabled, setDependenciesEnabled] = useState(false)
  const [configEnabled, setConfigEnabled] = useState(false)
  const [showDepInfo, setShowDepInfo] = useState(false)

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

  // Prefill form if plugin is passed in navigation state
  useEffect(() => {
    const plugin = location.state?.plugin
    if (plugin) {
      setFormData({
        id: plugin.id || "",
        name: plugin.name || "",
        description: plugin.description || "",
        moduleFormat: plugin.moduleFormat || "esm",
        url: plugin.url || "",
        code: plugin.sourceCode || plugin.code || "",
        dependencies: plugin.install ? JSON.stringify(plugin.install, null, 2) : "",
        config: plugin.config ? JSON.stringify(plugin.config, null, 2) : "",
      })
      setDependenciesEnabled(!!plugin.install)
      setConfigEnabled(!!plugin.config)
    }
  }, [location.state])

  const handleLoadExample = () => {
    setFormData({
      id: "sample-plugin",
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
          { duration: 10000 }
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
        { duration: 10000 }
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
                  Optional dependencies to install (dynamic installer syntax)
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDepInfo((v) => !v)}
                    title="Dynamic installer syntax info"
                  >
                    <Info className="h-2 w-2" />
                  </Button>
                </p>




                {showDepInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900 mb-2">
                    <div className="font-semibold mb-1">Dynamic Installer: quick guide</div>
                    <div className="mb-2">
                      This syntax configures programmatic npm installs. Use <b>globalOptions</b> to pass flags applied to every install (for example <code>--no-save</code>). Each dependency can include its own <b>options</b>, and set <b>override</b> to true to ignore globalOptions for that dependency. Enable <b>verbose</b> to get detailed logs and set <b>ignoreErrors</b> to true to continue installing even if one package fails.
                    </div>
                    <div>
                      <div className="font-medium mb-1">Detailed example</div>
                      <pre className="bg-blue-100 border rounded p-2 overflow-x-auto text-xs">
                        {`{
  "globalOptions": ["--no-save"],
  "verbose": true,
  "ignoreErrors": false,
  "dependencies": [
    { "name": "eslint@8.0.0", "options": ["--save-dev"] },
    { "name": "lodash@latest", "options": ["-E"] },
    { "name": "axios@latest", "options": ["--save-exact"], "override": true },
    { "name": "typescript", "options": ["--save-optional"] }
  ]
}`}
                      </pre>
                      <div className="mt-2">
                        Quick notes:
                        <ul className="list-disc ml-5">
                          <li><b>globalOptions</b> (here <code>--no-save</code>) are applied to all installs unless a dependency sets <b>override</b>.</li>
                          <li>In the example, <code>axios</code> sets <b>override</b> true → it will install only with its own options.</li>
                          <li><b>verbose</b> produces console logs for each command; <b>ignoreErrors</b> controls whether the installer stops on first failure.</li>
                        </ul>
                      </div>
                      <a
                        href="https://github.com/motero2k/dynamic-installer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline ml-2"
                      >
                        GitHub: dynamic-installer
                      </a>
                    </div>
                  </div>
                )}

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
