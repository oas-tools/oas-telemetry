import { NextFunction, Request, Response } from 'express';
import { OasTlmConfig } from '../config/config.types.js';

/**
 * Generic guard for toggleable modules (AI, plugins, future ones).
 * Keeps the module's router mounted at all times so disabled and enabled
 * states behave identically from the outside (same 404 shape), instead of
 * some modules 404ing via Express (route not mounted) and others just
 * silently working regardless of their "enabled" flag.
 */
export function requireModuleEnabled(moduleName: string, isEnabled: (config: OasTlmConfig) => boolean) {
    return (oasTlmConfig: OasTlmConfig) =>
        (req: Request, res: Response, next: NextFunction) => {
            if (!isEnabled(oasTlmConfig)) {
                res.status(404).json({
                    enabled: false,
                    module: moduleName,
                    message: `${moduleName} module is disabled`,
                });
                return;
            }
            next();
        };
}
