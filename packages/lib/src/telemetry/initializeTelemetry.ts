import logger from '../utils/logger.js';
import { bootEnvVariables } from '../config/bootConfig.js';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { instrumentations, isBootInitialized, setBootInitialized } from './telemetryRegistry.js';
import { LogsInstrumentation } from './custom-implementations/instrumentations/logsInstrumentation.js';

// THIS INSTRUMENTATIONS NEED TO BE LOADED BEFORE ANYTHING ELSE
// They use monkey-patching to instrument the HTTP server and client.

// THIS FILE MUST BE CALLED BEFORE ANYTHING ELSE

if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
    logger.info('🚫 OASTLM module is disabled, Auto Instrumentations not initialized.');
} else {
    if (!isBootInitialized()) {
        const nodeInstrumentations = getNodeAutoInstrumentations();
        if (!bootEnvVariables.OASTLM_BOOT_AUTOINSTRUMENTATIONS_NODE_DISABLED) {
            instrumentations.push(...nodeInstrumentations);
        }
        if (!bootEnvVariables.OASTLM_BOOT_AUTOINSTRUMENTATIONS_LOGS_DISABLED) {
            instrumentations.push(new LogsInstrumentation());
        }
        setBootInitialized(true);
        logger.info('✅ Auto Instrumentations created successfully');
    }
}