import { InMemoryDbSpanExporter } from "./custom-implementations/exporters/InMemoryDbSpanExporter.js";
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from "./custom-implementations/wrappers.js";
import { InMemoryDbLogExporter } from "./custom-implementations/exporters/InMemoryDbLogExporter.js";
import { InMemoryDbMetricExporter } from "./custom-implementations/exporters/InMemoryDbMetricExporter.js";
import { DynamicMultiSpanProcessor } from "./custom-implementations/processors/dynamicMultiSpanProcessor.js";
import { DynamicMultiLogRecordProcessor } from "./custom-implementations/processors/dynamicMultiLogProcessor.js";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { bootEnvVariables } from "../config/bootConfig.js";

// GLOBAL REGISTRY of telemetry components, used by SDKs and controllers.

export const oasTelemetryResource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: bootEnvVariables.OASTLM_BOOT_SERVICE_NAME
});

// TRACES -------------------------------------------------------------------------------------

// This is the main exporter for oas-telemetry spans. (Used by the traces controller)
export const inMemoryDbSpanExporter = new InMemoryDbSpanExporter();

// This allows to add more exporter in the future without changing the code
export const multiSpanExporter = new EnablerMultiSpanExporter();

// This allows the addition of more processors at runtime
export const dynamicMultiSpanProcessor = new DynamicMultiSpanProcessor();

// LOGS ----------------------------------------------------------------------------------------

export const inMemoryDbLogExporter = new InMemoryDbLogExporter();

export const multiLogExporter = new EnablerMultiLogExporter();

export const dynamicMultiLogProcessor = new DynamicMultiLogRecordProcessor()

  // Override console methods to emit logs via OpenTelemetry, like an instrumentation
export const originalConsoleMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

// METRICS -------------------------------------------------------------------------------------
// Metrics follow a different pattern in OpenTelemetry

export const inMemoryDbMetricExporter = new InMemoryDbMetricExporter();


// Readers and their exporters cannot be grouped together in a MultiReader or similar construct
// due to differences in aggregation temporality and aggregation selection.