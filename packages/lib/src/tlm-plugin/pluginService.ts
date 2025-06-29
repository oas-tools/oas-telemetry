import { PluginResource } from '../types/index.js';

class PluginService {
    private plugins: PluginResource[] = [];

    getPlugins() {
        return this.plugins;
    }

    pushPlugin(plugin: PluginResource) {
        this.plugins.push(plugin);
    }

    activatePlugin(plugin: PluginResource) {
        this.plugins.forEach(p => {
            if (p.id === plugin.id) {
                p.active = true;
            }
        });
    }
}

export const pluginService = new PluginService();
