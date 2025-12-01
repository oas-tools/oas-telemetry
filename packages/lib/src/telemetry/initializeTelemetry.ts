import logger from '../utils/logger.js';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { bootEnvVariables } from '../config/bootConfig.js';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { instrumentations, isBootInitialized, setBootInitialized } from './telemetryRegistry.js';
import { LogsInstrumentation } from './custom-implementations/instrumentations/logsInstrumentation.js';

// THIS INSTRUMENTATIONS NEED TO BE LOADED BEFORE ANYTHING ELSE
// They use monkey-patching to instrument the HTTP server and client.

// THIS FILE MUST BE CALLED BEFORE ANYTHING ELSE

if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
    logger.info('🚫 OASTLM module is disabled, Providers not initialized.');
} else {
    if (!isBootInitialized()) {
        logger.info('📦 Registering Auto Instrumentations');
        const nodeInstrumentations = getNodeAutoInstrumentations();
        if (!bootEnvVariables.OASTLM_BOOT_AUTOINSTRUMENTATIONS_NODE_DISABLED) {
            instrumentations.push(...nodeInstrumentations);
        }
        if (!bootEnvVariables.OASTLM_BOOT_AUTOINSTRUMENTATIONS_LOGS_DISABLED) {
            instrumentations.push(new LogsInstrumentation());
        }
        registerInstrumentations({
            instrumentations: instrumentations,
        });
        setBootInitialized(true);
        logger.info('✅ Auto Instrumentations registered successfully');
    }
}