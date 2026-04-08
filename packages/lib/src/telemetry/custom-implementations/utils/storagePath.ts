import fs from 'fs';
import path from 'path';
import { bootEnvVariables } from '../../../config/bootConfig.js';
/**
 * Get storage path for disk-based persistence
 * Returns null if storage is in-memory (when OASTLM_BOOT_STORAGE_PATH is empty or not set)
 * 
 * Environment variables (BOOT - set at startup):
 * - OASTLM_BOOT_STORAGE_PATH: empty or not set = in-memory, else = disk path
 *   Examples:
 *   - OASTLM_BOOT_STORAGE_PATH="" (or not set) -> in-memory
 *   - OASTLM_BOOT_STORAGE_PATH="data/telemetry" -> disk at ./data/telemetry
 *   - OASTLM_BOOT_STORAGE_PATH="/var/lib/telemetry" -> disk at /var/lib/telemetry
 */
export function getStoragePath(name: 'traces' | 'logs' | 'metrics'): string | null {
    // If storage path is empty, use in-memory
    if (!bootEnvVariables.OASTLM_BOOT_STORAGE_PATH) {
        console.warn(`BOOT STORAGE: No storage path configured for ${name}. Using in-memory storage. To enable disk storage, set OASTLM_BOOT_STORAGE_PATH environment variable.`);
        return null;
    }

    const filePath = path.join(bootEnvVariables.OASTLM_BOOT_STORAGE_PATH, `${name}.db`);
    
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        console.warn(`Failed to create storage directory for ${name}`, error);
        return null;
    }
    
    return filePath;
}
