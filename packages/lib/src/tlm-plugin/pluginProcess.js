// pluginProcess.js
// Runs inside a child process, isolated from the main app

// @ts-expect-error no types
import { importFromString, requireFromString } from "import-from-string";
import { installDependencies } from "dynamic-installer";

let plugin;
const log = (...args) => {
  console.log(`[PluginProcess:${process.pid}]`, ...args);
};

process.on("message", async (msg) => {
  if (msg.type === "load") {
    try {
      const pluginResource = normalizePluginResource(msg.pluginResource);

      if (pluginResource.install && Array.isArray(pluginResource.install.dependencies) && pluginResource.install.dependencies.length > 0) {
        log("Installing dependencies for plugin: " + pluginResource.name);
        const dependenciesStatus = await installDependencies(pluginResource.install);
        console.dir(dependenciesStatus);
        if (!dependenciesStatus.success) {
          const detailsFailed = dependenciesStatus.details.filter(detail => detail.success === false);
          if (pluginResource.install.ignoreErrors === true) {
            log(`Warning: Error installing dependencies: ${JSON.stringify(detailsFailed)}. Continuing as ignoreErrors is true.`);
          } else {
            process.send?.({ event: "error", error: `Error installing dependencies: ${JSON.stringify(detailsFailed)}` });
            return;
          }
        }
      }

      let module;
      if (pluginResource?.moduleFormat?.toLowerCase() === "esm") {
        module = await importFromString(pluginResource.sourceCode);
      } else {
        module = await requireFromString(pluginResource.sourceCode);
      }

      plugin = module.default?.plugin ?? module.plugin;
      if (!plugin) throw new Error("Plugin must export a valid 'plugin' object");

      for (const fn of ["load", "isConfigured"]) {
        if (typeof plugin[fn] !== "function") {
          throw new Error(`Plugin is missing required function "${fn}"`);
        }
      }

      await plugin.load(pluginResource.config);

      if (!plugin.isConfigured()) {
        throw new Error("Plugin could not be configured");
      }

      process.send?.({ event: "loaded", name: pluginResource.name || pluginResource.id || "unknown" });
    } catch (err) {
      process.send?.({ event: "error", error: err.message });
      process.exit(1);
    }
  }

  // Forward log/metric/trace calls
  if (msg.type === "newLog" && plugin?.newLog) {
    plugin.newLog(msg.payload);
  }

  if (msg.type === "newMetric" && plugin?.newMetric) {
    plugin.newMetric(msg.payload);
  }

  if (msg.type === "newTrace" && plugin?.newTrace) {
    plugin.newTrace(msg.payload);
  }

  if (msg.type === "unload") {
    if (plugin && typeof plugin.unload === "function") {
      await plugin.unload();
    }
    process.send?.({ event: "unloaded" });
    process.exit(0);
  }
});

function normalizePluginResource(raw) {
  let resource = raw;

  // case: received as stringified JSON
  if (typeof raw === "string") {
    try {
      resource = JSON.parse(raw);
    } catch (err) {
      throw new Error("Invalid pluginResource JSON: " + err.message);
    }
  }

  // normalize install
  if (typeof resource.install === "string") {
    try {
      resource.install = JSON.parse(resource.install);
    } catch (err) {
      throw new Error("Invalid install JSON: " + err.message);
    }
  }

  // normalize config
  if (typeof resource.config === "string") {
    try {
      resource.config = JSON.parse(resource.config);
    } catch (err) {
      throw new Error("Invalid config JSON: " + err.message);
    }
  }

  return resource;
}
