import logger from '../utils/logger.js';
import { bootEnvVariables } from '../config/bootConfig.js';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { instrumentations, isBootInitialized, setBootInitialized } from './telemetryRegistry.js';
import { LogsInstrumentation } from './custom-implementations/instrumentations/logsInstrumentation.js';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';

// THIS INSTRUMENTATIONS NEED TO BE LOADED BEFORE ANYTHING ELSE
// They use monkey-patching to instrument the HTTP server and client.

// THIS FILE MUST BE CALLED BEFORE ANYTHING ELSE

if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
    logger.info('🚫 OASTLM module is disabled, Auto Instrumentations not initialized.');
} else {
    if (!isBootInitialized()) {
        // Only HTTP instrumentation por ahora
        const httpInstrumentation = new HttpInstrumentation({
            // Ignore internal telemetry routes
            ignoreIncomingRequestHook: (req) => {
                const url = req.url || '';
                const path = url.split('?')[0]; // Remove query params
                
                // Ignore all baseUrl routes except those with 'generate'
                if (path.includes(bootEnvVariables.OASTLM_BOOT_BASE_URL)) {
                    return !path.includes('generate');
                }
                return false;
            }
        });
        if (!bootEnvVariables.OASTLM_BOOT_AUTOINSTRUMENTATIONS_NODE_DISABLED) {
            instrumentations.push(httpInstrumentation, new RuntimeNodeInstrumentation());
        }
        if (!bootEnvVariables.OASTLM_BOOT_AUTOINSTRUMENTATIONS_LOGS_DISABLED) {
            instrumentations.push(new LogsInstrumentation());
        }
        setBootInitialized(true);
        logger.info('✅ Auto Instrumentations created successfully');
    }
}