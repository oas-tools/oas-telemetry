import './instrumentation/index.js';
import { globalOasTlmConfig } from './config.js';
import { Router } from 'express';
import { InMemoryExporter } from './exporters/InMemoryDbExporter.js';
import { OasTlmInputConfig } from './types/index.js';
import logger from './utils/logger.js';
import { configureRoutes } from './tlmRoutes.js';

/**
 * Returns the Oas Telemetry middleware. The parameters are the same as `globalOasTlmConfig`.
 * All parameters are optional. However, either `spec` or `specFileName` must be provided to enable endpoint filtering.
 */
export default function oasTelemetry(oasTlmInputConfig: OasTlmInputConfig): Router {
    const router = Router();

    if (process.env.OASTLM_MODULE_DISABLED === 'true') {
        return router;
    }
    
    if (oasTlmInputConfig) {
        logger.info("User provided config");
        // Override global config with user provided config
        for (const key in globalOasTlmConfig) {
            globalOasTlmConfig[key] = oasTlmInputConfig[key] ?? globalOasTlmConfig[key];
        }
    }
    
    logger.info("baseURL: ", globalOasTlmConfig.baseURL);
    globalOasTlmConfig.dynamicSpanExporter.changeExporter(globalOasTlmConfig.exporter ?? new InMemoryExporter());
    
    if (globalOasTlmConfig.spec)
        logger.info(`Spec content provided`);
    else {
        if (globalOasTlmConfig.specFileName != "")
            logger.info(`Spec file used for telemetry: ${globalOasTlmConfig.specFileName}`);
        else {
            console.error("No spec available !");
        }
    }
    
    if (globalOasTlmConfig.autoActivate) {
        globalOasTlmConfig.dynamicSpanExporter.exporter?.start();
    }

    configureRoutes(router);

    return router;
}