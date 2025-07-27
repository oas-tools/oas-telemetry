import { InMemoryDbSpanExporter } from "./custom-implementations/exporters/InMemoryDbSpanExporter.js";
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from "./custom-implementations/wrappers.js";
import { InMemoryDbLogExporter } from "./custom-implementations/exporters/InMemoryDbLogExporter.js";
import { InMemoryDbMetricExporter } from "./custom-implementations/exporters/InMemoryDbMetricExporter.js";
import { DynamicMultiSpanProcessor } from "./custom-implementations/processors/dynamicMultiSpanProcessor.js";
import { DynamicMultiLogRecordProcessor } from "./custom-implementations/processors/dynamicMultiLogProcessor.js";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PluginSpanExporter } from "./custom-implementations/exporters/PluginSpanExporter.js";

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

export const pluginSpanExporter = new PluginSpanExporter(); // Used for plugins, can be extended with more exporters

// LOGS ----------------------------------------------------------------------------------------

export const inMemoryDbLogExporter = new InMemoryDbLogExporter();

export const multiLogExporter = new EnablerMultiLogExporter();

export const dynamicMultiLogProcessor = new DynamicMultiLogRecordProcessor()

// METRICS -------------------------------------------------------------------------------------
// Metrics follow a different pattern in OpenTelemetry

export const inMemoryDbMetricExporter = new InMemoryDbMetricExporter();

// Readers and their exporters cannot be grouped together in a MultiReader or similar construct
// due to differences in aggregation temporality and aggregation selection.