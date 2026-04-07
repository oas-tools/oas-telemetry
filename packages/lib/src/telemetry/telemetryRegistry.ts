import { InMemoryDbSpanExporter } from "./custom-implementations/exporters/InMemoryDbSpanExporter.js";
import { EnablerMultiLogExporter, EnablerMultiSpanExporter } from "./custom-implementations/wrappers.js";
import { InMemoryDbLogExporter } from "./custom-implementations/exporters/InMemoryDbLogExporter.js";
import { InMemoryDbMetricExporter } from "./custom-implementations/exporters/InMemoryDbMetricExporter.js";
import { DynamicMultiSpanProcessor } from "./custom-implementations/processors/dynamicMultiSpanProcessor.js";
import { DynamicMultiLogRecordProcessor } from "./custom-implementations/processors/dynamicMultiLogProcessor.js";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { bootEnvVariables } from "../config/bootConfig.js";
import logger from '../utils/logger.js';
import { metrics, trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { Meter, Tracer } from "@opentelemetry/api";
import { Logger } from "@opentelemetry/api-logs";
import { type Instrumentation } from "@opentelemetry/instrumentation";

// GLOBAL REGISTRY of telemetry components, used by SDKs and controllers.
let _bootInitialized = false;
let _telemetryConfigured = false;
let _router: any = undefined;


let _getMeter: ((name: string, version?: string, options?: any) => Meter) | undefined = undefined;
let _getTracer: ((name: string, version?: string, options?: any) => Tracer) | undefined = undefined;
let _getLogger: ((name: string, version?: string, options?: any) => Logger) | undefined = undefined;

export function isBootInitialized() { return _bootInitialized; }
export function setBootInitialized(v: boolean) { _bootInitialized = v; }
export function isTelemetryConfigured() { return _telemetryConfigured; }
export function setTelemetryConfigured(v: boolean) { _telemetryConfigured = v; }
export function setTelemetryRouter(router: any) { _router = router; }
export function getTelemetryRouter() { return _router; }



export function setGetMeter(fn: (name: string, version?: string, options?: any) => Meter) { _getMeter = fn; }
export function setGetTracer(fn: (name: string, version?: string, options?: any) => Tracer) { _getTracer = fn; }
export function setGetLogger(fn: (name: string, version?: string, options?: any) => Logger) { _getLogger = fn; }


/**
 * Get a Meter instance for creating custom metrics.
 * @param name - The name of the instrumentation scope
 * @param version - Optional version of the instrumentation scope
 * @param options - Optional configuration options
 * @return Meter instance
 */
export function getMeter(name: string, version?: string, options: any = {}) {
    if (!_getMeter) {
        if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
            // Use OpenTelemetry API fallback
            logger.warn('getMeter() called but oas-telemetry is DISABLED. Returning OpenTelemetry API\'s default metrics.getMeter(). You must have created and set a MeterProvider as global before using this. If you want oas-telemetry features, enable the module.');
            return metrics.getMeter(name, version, options);
        }
        throw new Error(`[oas-telemetry] getMeter is not configured. Please ensure oasTelemetry() has been called before using getMeter (name: ${name}, version: ${version}).`);
    }
    return _getMeter(name, version, options);
}
/**
 * Get a Tracer instance for creating custom spans and traces.
 * @param name - The name of the instrumentation scope
 * @param version - Optional version of the instrumentation scope
 * @param options - Optional configuration options
 * @return Tracer instance
 */
export function getTracer(name: string, version?: string, options: any = {}) {
    if (!_getTracer) {
        if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
            logger.warn('getTracer() called but oas-telemetry is DISABLED. Returning OpenTelemetry API\'s default trace.getTracer(). You must have created and set a TracerProvider as global before using this. If you want oas-telemetry features, enable the module.');
            return trace.getTracer(name, version);
        }
        throw new Error(`[oas-telemetry] getTracer is not configured. Please ensure oasTelemetry() has been called before using getTracer (name: ${name}, version: ${version}).`);
    }
    return _getTracer(name, version, options);
}
/**
 * Get a Logger instance for creating custom logs.
 * @param name - The name of the instrumentation scope
 * @param version - Optional version of the instrumentation scope
 * @param options - Optional configuration options
 * @return Logger instance
 */
export function getLogger(name: string, version?: string, options: any = {}) {
    if (!_getLogger) {
        if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
            logger.warn('getLogger() called but oas-telemetry is DISABLED. Returning OpenTelemetry API\'s default logs.getLogger(). You must have created and set a LoggerProvider as global before using this. If you want oas-telemetry features, enable the module.');
            return logs.getLogger(name, version);
        }
        throw new Error(`[oas-telemetry] getLogger is not configured. Please ensure oasTelemetry() has been called before using getLogger (name: ${name}, version: ${version}).`);
    }
    return _getLogger(name, version, options);
}

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

// For custom log instrumentation, and lib logging
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

// INSTRUMENTATIONS -----------------------------------------------------------------------

export const instrumentations: Instrumentation[] = []
