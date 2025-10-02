import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
if (process.env.NODE_ENV !== 'test') {
    dotenv.config();
}

// This variables can NOT be configured via oasTelemetry(config)
// They are used at the import of the library
export const bootEnvVariables = {
    OASTLM_BOOT_ENV: process.env.OASTLM_BOOT_ENV || process.env.NODE_ENV || 'production',
    OASTLM_BOOT_MODULE_DISABLED: process.env.OASTLM_BOOT_MODULE_DISABLED === 'true',
    OASTLM_BOOT_LOG_LEVEL: process.env.OASTLM_BOOT_LOG_LEVEL || 'INFO',
    OASTLM_BOOT_SERVICE_NAME: process.env.OASTLM_BOOT_SERVICE_NAME || `SERVICE-${randomUUID().slice(0, 8).toUpperCase()}`,
};

