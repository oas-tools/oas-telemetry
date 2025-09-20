import { InMemoryDbSpanExporter } from "./custom-implementations/exporters/InMemoryDbSpanExporter.js";
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from "./custom-implementations/wrappers.js";
import { InMemoryDbLogExporter } from "./custom-implementations/exporters/InMemoryDbLogExporter.js";
import { InMemoryDbMetricExporter } from "./custom-implementations/exporters/InMemoryDbMetricExporter.js";
import { DynamicMultiSpanProcessor } from "./custom-implementations/processors/dynamicMultiSpanProcessor.js";
import { DynamicMultiLogRecordProcessor } from "./custom-implementations/processors/dynamicMultiLogProcessor.js";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PluginSpanExporter } from "./custom-implementations/exporters/PluginSpanExporter.js";
import { PluginLogExporter } from "./custom-implementations/exporters/PluginLogExporter.js";
import { PluginMetricExporter } from "./custom-implementations/exporters/PluginMetricExporter.js";

// GLOBAL REGISTRY of telemetry components, used by SDKs and controllers.

export const oasTelemetryResource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'oas-telemetry-service'
});

// TRACES -------------------------------------------------------------------------------------

// This is the main exporter for oas-telemetry spans. (Used by the traces controller)
export const inMemoryDbSpanExporter = new InMemoryDbSpanExporter();

// This allows to add more exporter in the future without changing the code
export const multiSpanExporter = new EnablerMultiSpanExporter();

// This allows the addition of more processors at runtime
export const dynamicMultiSpanProcessor = new DynamicMultiSpanProcessor();

export const pluginSpanExporter = new PluginSpanExporter(); // This exporter sends spans to the plugin module.

// LOGS ----------------------------------------------------------------------------------------

export const inMemoryDbLogExporter = new InMemoryDbLogExporter();

export const multiLogExporter = new EnablerMultiLogExporter();

export const dynamicMultiLogProcessor = new DynamicMultiLogRecordProcessor()

export const pluginLogExporter = new PluginLogExporter(); // This exporter sends logs to the plugin module.

// METRICS -------------------------------------------------------------------------------------
// Metrics follow a different pattern in OpenTelemetry

export const inMemoryDbMetricExporter = new InMemoryDbMetricExporter();

export const pluginMetricExporter = new PluginMetricExporter(); // This exporter sends metrics to the plugin module.

// Readers and their exporters cannot be grouped together in a MultiReader or similar construct
// due to differences in aggregation temporality and aggregation selection.