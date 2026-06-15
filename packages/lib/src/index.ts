import "./config/bootConfig.js"; // Load environment variables before any other imports
import './telemetry/initializeTelemetry.js'; // Initialize OpenTelemetry instrumentation
import logger from './utils/logger.js';
import { getConfig } from './config/config.js';
import { Router } from 'express';
import { configureRoutes } from './routesManager.js';
import { UserConfig } from './config/config.types.js';
import { configureTelemetry } from './telemetry/telemetryConfigurator.js';
import { isTelemetryConfigured, setTelemetryRouter, getTelemetryRouter } from './telemetry/telemetryRegistry.js';
import { bootEnvVariables } from "./config/bootConfig.js";

/**
 * Returns the OAS-Telemetry middleware.
 * All parameters are optional. However, either `spec` or `specFileName` must be provided to enable endpoint filtering.
 */
function oasTelemetry(oasTlmInputConfig?: UserConfig) {
    if (isTelemetryConfigured()) {
        return getTelemetryRouter();
    }
    const router = Router();
    if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
        setTelemetryRouter(router);
        return router;
    }
    const oasTlmConfig = getConfig(oasTlmInputConfig);
    logger.info("BaseUrl: ", bootEnvVariables.OASTLM_BOOT_BASE_URL);
    configureTelemetry(oasTlmConfig);
    configureRoutes(router, oasTlmConfig);
    setTelemetryRouter(router);
    return router;
}

export { oasTelemetry };
export { DynamicPeriodicMetricReader } from './telemetry/custom-implementations/metrics/DynamicPeriodicMetricReader.js';
export { FilterMetricExporter } from './telemetry/custom-implementations/exporters/FilterMetricExporter.js';