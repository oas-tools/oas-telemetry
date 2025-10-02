import { PluginResource } from "../types/index.js";
import logger from "../utils/logger.js";

class PluginService {
  private plugins: PluginResource[] = [];
  public enabled: boolean = false;

  getPlugins() {
    return this.plugins;
  }

  pushPlugin(plugin: PluginResource) {
    this.plugins.push(plugin);
  }

  activatePlugin(pluginId: string) {
    const plugin = this.plugins.find((p) => p.id === pluginId);
    if (plugin) {
      plugin.active = true;
    }
  }

  deactivatePlugin(pluginId: string) {
    const plugin = this.plugins.find((p) => p.id === pluginId);
    if (plugin) {
      plugin.active = false;
    }
  }

  deletePlugin(pluginId: string) {
    const plugin = this.plugins.find((p) => p.id === pluginId);
    if (plugin?.process && !plugin.process.killed) {
      plugin.process.kill(1);
    }
    this.plugins = this.plugins.filter((p) => p.id !== pluginId);
  }

  private broadcastToPlugins(
    type: "newMetric" | "newLog" | "newTrace",
    payload: any
  ) {
    if (!this.enabled) return;
    this.plugins.forEach((plugin, i) => {
      if (!plugin.active) return;

      if (plugin.process) {
        if (plugin.process.connected) {
          try {
            plugin.process.send({ type, payload });
            logger.debug(
              `Sent ${type} to child-process plugin <${plugin.name}> (#${i})`
            );
          } catch (err) {
            logger.error(
              `Failed to send ${type} to plugin <${plugin.name}> (#${i}):`,
              err
            );
          }
        } else {
          logger.warn(
            `Plugin <${plugin.name}> (#${i}) is not connected. Skipping ${type}.`
          );
        }
      } else {
        logger.debug(
          `Plugin <${plugin.name}> does not implement ${type}. Skipping.`
        );
      }
    });
  }

  /**
   * Broadcast a new metric to all active plugins
   */
  broadcastMetric(metric: any) {
    this.broadcastToPlugins("newMetric", metric);
  }

  /**
   * Broadcast a new log to all active plugins
   */
  broadcastLog(log: any) {
    this.broadcastToPlugins("newLog", log);
  }

  /**
   * Broadcast a new trace to all active plugins
   * TODO: rename to span (trace is the whole trace, span is a single unit of work within a trace)
   */
  broadcastTrace(trace: any) {
    this.broadcastToPlugins("newTrace", trace);
  }
}

export const pluginService = new PluginService();
