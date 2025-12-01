import "./config/bootConfig.js";
import './telemetry/initializeTelemetry.js';
import { Router } from 'express';
import { UserConfig } from './config/config.types.js';
import { Meter, Tracer } from '@opentelemetry/api';
import { Logger } from '@opentelemetry/api-logs';

/**
 * Returns the OAS-Telemetry middleware (Express Router).
 * All parameters are optional. However, either `spec` or `specFileName` must be provided to enable endpoint filtering.
 *
 * @example
 * import oasTelemetry, { getMeter, getTracer, getLogger } from 'oas-telemetry';
 * const router = oasTelemetry(config);
 * app.use(router);
 *
 * // Create custom metrics
 * const meter = getMeter('my-app');
 * const counter = meter.createCounter('requests_total');
 * counter.add(1);
 */
declare function oasTelemetry(oasTlmInputConfig?: UserConfig): Router;

/**
 * Get a Meter instance for creating custom metrics.
 * @param name - The name of the instrumentation scope
 * @param version - Optional version of the instrumentation scope
 */
declare function getMeter(name: string, version?: string): Meter;

/**
 * Get a Tracer instance for creating custom spans and traces.
 * @param name - The name of the instrumentation scope
 * @param version - Optional version of the instrumentation scope
 */
declare function getTracer(name: string, version?: string): Tracer;

/**
 * Get a Logger instance for creating custom logs.
 * @param name - The name of the instrumentation scope
 * @param version - Optional version of the instrumentation scope
 */
declare function getLogger(name: string, version?: string): Logger;

export = oasTelemetry;
export { getMeter, getTracer, getLogger };