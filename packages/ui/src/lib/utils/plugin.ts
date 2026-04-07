import type { Plugin } from "../types/plugins"

export function getPluginOrigin(plugin: Plugin): "code" | "url" {
  return plugin.code ? "code" : "url"
}

export function exportPluginsToJson(plugins: Plugin[]): string {
  const exportData = plugins.map((plugin) => ({
    id: plugin.id,
    name: plugin.name,
    ...(plugin.url && { url: plugin.url }),
    ...(plugin.code && { code: plugin.code }),
    moduleFormat: plugin.moduleFormat,
    active: plugin.active,
    ...(plugin.install && { install: plugin.install }),
    ...(plugin.config && { config: plugin.config }),
  }))

  return JSON.stringify(exportData, null, 2)
}

export function validatePluginImport(data: any): boolean {
  if (!Array.isArray(data)) return false

  return data.every(
    (plugin) =>
      typeof plugin.id === "string" &&
      typeof plugin.moduleFormat === "string" &&
      ["cjs", "esm"].includes(plugin.moduleFormat) &&
      (plugin.url || plugin.code),
  )
}
