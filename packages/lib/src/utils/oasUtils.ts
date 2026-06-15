import { existsSync, readFileSync } from 'fs';
import yaml from 'js-yaml';
import logger from './logger.js';

/**
 * Loads the API specification from config.
 */
export function loadApiSpec(config: any): any {
    if (config.general?.specFileName && existsSync(config.general.specFileName)) {
        try {
            const data = readFileSync(config.general.specFileName, 'utf8');
            if (config.general.specFileName.endsWith('.yaml') || config.general.specFileName.endsWith('.yml')) {
                return yaml.load(data);
            }
            return JSON.parse(data);
        } catch (e: any) {
            logger.warn(`[oasUtils] Failed to load spec file: ${e.message}`);
        }
    }
    if (config.general?.spec) {
        try {
            return JSON.parse(config.general.spec);
        } catch (ej) {
            try {
                return yaml.load(config.general.spec);
            } catch (ey: any) {
                logger.warn(`[oasUtils] Failed to parse spec string: ${ey.message}`);
            }
        }
    }
    return null;
}

/**
 * Normalizes an OpenAPI spec path by replacing parameter placeholders with '{}'
 * e.g., "/api/v1/pets/{petName}" -> "/api/v1/pets/{}"
 */
export function normalizeSpecPath(path: string): string {
    return path.replace(/{[^}]+}/g, '{}');
}

/**
 * Normalizes an Express route path by replacing parameter placeholders with '{}'
 * e.g., "/api/v1/pets/:name" -> "/api/v1/pets/{}"
 */
export function normalizeExpressPath(path: string): string {
    return path.replace(/:[^/]+/g, '{}');
}
