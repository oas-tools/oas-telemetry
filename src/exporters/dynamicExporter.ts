import { ConsoleExporter } from "./consoleExporter.js";


/**
 * DynamicExporter is a class that can be used to dynamically change the exporter used by OpenTelemetry.
 * This is useful when you want to change the exporter at runtime.
 * Links start, stop and export methods to the Real exporter.
 */
export class DynamicExporter {

    exporter;
    /** 
     * @returns {Array<PluginResource>} Returns the list of plugins registered in the exporter
     */
    getPlugins() {
        return this.exporter.plugins;
    }

    /**
     * Registers a plugin in the exporter
     * @param {PluginResource} pluginResource The plugin to be registered
     * @returns {void}
     */
    pushPlugin(pluginResource) {
        if (!this.exporter.plugins) {
            this.exporter.plugins = [];
        }
        this.exporter.plugins.push(pluginResource);
    }
    activatePlugin(pluginId) {
        let plugins = this.exporter.plugins;
        if (plugins) {
            // plugin.active = true;
            plugins.forEach(plugin => {
                if (plugin.id === pluginId) {
                    plugin.active = true;
                }
            });
        }
    }


    constructor() {
        let defaultExporter = new ConsoleExporter();
        this.exporter = defaultExporter;
        this.export = (readableSpans, resultCallback) => defaultExporter.export(readableSpans, resultCallback);
        this.shutdown = () => defaultExporter.shutdown();
        this.forceFlush = () => defaultExporter.forceFlush();
    }

    changeExporter(newExporter) {
        this.exporter = newExporter;
        // OpenTelemetry methods
        this.export = (readableSpans, resultCallback) => newExporter.export(readableSpans, resultCallback);
        this.shutdown = () => newExporter.shutdown();
        this.forceFlush = () => newExporter.forceFlush();
        // Other methods should be called directly from the exporter: globalOasTlmConfig.dynamicExporter.exporter.method()
    }

}

export default DynamicExporter;