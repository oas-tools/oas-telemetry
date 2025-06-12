import { OasTlmExporter, PluginResource } from "../types/index.js";
import { ConsoleExporter } from "./consoleExporter.js";
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';


/**
 * DynamicExporter is a class that can be used to dynamically change the exporter used by OpenTelemetry.
 * This is useful when you want to change the exporter at runtime.
 * Links start, stop and export methods to the Real exporter.
 */
export class DynamicExporter implements SpanExporter {

    exporter: OasTlmExporter;
    export;
    shutdown;
    forceFlush;
    /** 
     * Returns the list of plugins registered in the exporter
     */
    getPlugins(): Array<PluginResource> {
        return this.exporter.plugins;
    }

    /**
     * Registers a plugin in the exporter
     */
    pushPlugin(pluginResource: PluginResource) {
        if (!this.exporter.plugins) {
            this.exporter.plugins = [];
        }
        this.exporter.plugins.push(pluginResource);
    }
    activatePlugin(pluginId: string) {
        let plugins = this.exporter.plugins;
        if (plugins) {
            // plugin.active = true;
            plugins.forEach((plugin: PluginResource) => {
                if (plugin.id === pluginId) {
                    plugin.active = true;
                }
            });
        }
    }


    constructor() {
        let defaultExporter = new ConsoleExporter();
        this.exporter = defaultExporter;
        this.export = (readableSpans: any, resultCallback: any) => defaultExporter.export(readableSpans, resultCallback);
        this.shutdown = () => defaultExporter.shutdown();
        this.forceFlush = () => defaultExporter.forceFlush();
    }

    changeExporter(newExporter: OasTlmExporter) {
        this.exporter = newExporter;
        // OpenTelemetry methods
        this.export = (readableSpan: any, resultCallback: any) => newExporter.export(readableSpan, resultCallback);
        this.shutdown = () => newExporter.shutdown();
        this.forceFlush = () => newExporter.forceFlush();
        // Other methods should be called directly from the exporter: globalOasTlmConfig.dynamicSpanExporter.exporter.method()
    }

}

export default DynamicExporter;