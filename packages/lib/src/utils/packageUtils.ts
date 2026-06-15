import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

/**
 * Recursively search upwards for the library's package.json file.
 */
export function findPackageJson(startDir: string): string | null {
    let dir = startDir;
    while (true) {
        const file = join(dir, 'package.json');
        if (existsSync(file)) {
            try {
                const content = JSON.parse(readFileSync(file, 'utf8'));
                if (content.name === '@oas-tools/oas-telemetry') {
                    return file;
                }
            } catch (e) {
                // Ignore parsing/read errors and continue upwards
            }
        }
        const parent = dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return null;
}

const fallbackVersion = '0.8.0';

/**
 * Dynamically resolves the package version of the library.
 * Expects the caller's import.meta.url or equivalent to be passed.
 */
export function getPackageVersion(moduleUrl: string): string {
    try {
        const isCjs = typeof __filename !== 'undefined' && typeof __dirname !== 'undefined';
        // @ts-ignore -- import.meta does not exist in CJS build
        const currentDir = isCjs ? __dirname : dirname(fileURLToPath(moduleUrl));
        const packageJsonPath = findPackageJson(currentDir);
        if (packageJsonPath) {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.version == null) {
            logger.warn(`[packageUtils] Valid package.json found at ${packageJsonPath} does not have a version field, using fallback version (${fallbackVersion}).`);
            return fallbackVersion;
          }
          return packageJson.version;
        } else {
            logger.warn(`[packageUtils] Could not find package.json for @oas-tools/oas-telemetry, using fallback version (${fallbackVersion}).`);
            return fallbackVersion;
        }
    } catch (e: any) {
        logger.warn(`[packageUtils] Failed to read package.json, falling back to default version (${fallbackVersion}). Error: ${e.message}`);
        return fallbackVersion;
    }
}
