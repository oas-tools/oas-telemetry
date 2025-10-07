import "./config/bootConfig.js"; // Load environment variables before any other imports
import './telemetry/initializeTelemetry.js';// Initialize OpenTelemetry instrumentation
import logger from './utils/logger.js';
import { getConfig } from './config/config.js';
import { Router } from 'express';
import { configureRoutes } from './routesManager.js';
import { UserConfig } from './config/config.types.js';
import { configureTelemetry } from './telemetry/telemetryConfigurator.js';
import { bootEnvVariables } from "./config/bootConfig.js";
// WARN: If changed the API, also change in packages/lib/src/types/cjs-index.d.ts (used for CJS compilation)
/**
 * Returns the OAS-Telemetry middleware.
 * All parameters are optional. However, either `spec` or `specFileName` must be provided to enable endpoint filtering.
 */
export default function oasTelemetry(oasTlmInputConfig?: UserConfig): Router {
    const router = Router();

    // This environment variable cannot be set via the config object,
    // as it is required to disable OpenTelemetry SDK initialization,
    // which occurs during the first import at the top of this file.
    if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
        return router;
    }
    const oasTlmConfig = getConfig(oasTlmInputConfig);

    logger.info("BaseUrl: ", oasTlmConfig.general.baseUrl);
    if (!oasTlmConfig.general.spec && !oasTlmConfig.general.specFileName)
        logger.warn("No spec provided, endpoint filtering will not be available. Please provide either `spec` or `specFileName` in the configuration.");

    configureTelemetry(oasTlmConfig);

    configureRoutes(router, oasTlmConfig);
    
    return router;
}

