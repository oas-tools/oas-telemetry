import { Router, json } from "express";
import logger from "./utils/logger.js";
import cors from 'cors';
import { getTraceRoutes } from "./tlm-trace/traceRoutes.js";
import { getMetricsRoutes } from "./tlm-metric/metricsRoutes.js";
import { getLogRoutes } from "./tlm-log/logRoutes.js";
import cookieParser from 'cookie-parser';
import { getAuthRoutes } from './tlm-auth/authRoutes.js';
import { getUIRoutes } from './tlm-ui/uiRoutes.js';
import { getAuthMiddleware } from "./tlm-auth/authMiddleware.js";
import { getUtilsRoutes } from "./tlm-util/utilRoutes.js";
import { getAIRoutes } from "./tlm-ai/aiRoutes.js";
import { OasTlmConfig } from "./config/config.types.js";
import { bootEnvVariables } from "./config/bootConfig.js";
import { getPluginRoutes } from "./tlm-plugin/pluginRoutes.js";

export const configureRoutes = (router: Router, oasTlmConfig: OasTlmConfig) => {
    if (bootEnvVariables.OASTLM_BOOT_ENV === 'development') {
        logger.info("Running in development mode, enabling CORS for all origins");
        router.use(cors({
            origin: '*', // Permitir todas las solicitudes en desarrollo
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }));
    }

    router.use((req, res, next) => {
        if (req.body !== undefined) {
            return next(); // Already parsed, no need to parse again.
        }
        return json({ limit: '10mb' })(req, res, next);
    });

    const allAuthMiddlewares = getWrappedMiddlewares(
        () => oasTlmConfig.auth.enabled,
        [cookieParser(), getAuthRoutes(oasTlmConfig), getAuthMiddleware(oasTlmConfig)]
    );
    const baseUrl = oasTlmConfig.general.baseUrl;

    router.use(baseUrl, allAuthMiddlewares);
    router.use(baseUrl + "/traces", getTraceRoutes());
    router.use(baseUrl + "/metrics", getMetricsRoutes());
    router.use(baseUrl + "/logs", getLogRoutes());
    router.use(
        baseUrl + "/ai",
        getWrappedMiddlewares(
            () => oasTlmConfig.ai.openAIKey !== null,
            [getAIRoutes(oasTlmConfig)]
        )
    );

    // WARNING: This path must be the same as the one used in the UI package App.tsx "oas-telemetry-ui"
    router.use(baseUrl + "/oas-telemetry-ui", getUIRoutes());

    router.use(baseUrl + "/utils", getUtilsRoutes(oasTlmConfig));
    router.use(baseUrl + "/plugins", getPluginRoutes());


    router.get(baseUrl + '/health', (_req, res) => {
        res.status(200).send({ status: 'OK' });
    });
    //redirect to the UI when accessing the base URL
    router.get(baseUrl, (req, res) => {
        res.redirect(baseUrl + "/oas-telemetry-ui");
    });
}

/**
 * This function wraps the provided middleware functions with a condition callback.
 * If the condition callback returns true, the middleware/router will be executed.
 * If the condition callback returns false, the middleware/router will be skipped.
 * 
 * @callback {function} conditionCallback A callback function that returns a boolean to determine if the middleware should be used.
 * @param {Array} middlewares An array of middleware or routers to be wrapped.
 * @returns {Array} An array of wrapped middleware functions.
 */
function getWrappedMiddlewares(conditionCallback: { (): boolean; (): any; }, middlewares: any[]) {
    return middlewares.map(middleware => {
        return function (req: any, res: any, next: () => void) {
            if (conditionCallback()) {
                if (typeof middleware === 'function') {
                    // look for handle property, if it exists, it's a router. If not call middleware
                    if (middleware.handle) {
                        middleware.handle(req, res, next);
                    } else {
                        middleware(req, res, next);
                    }
                }
            } else {
                next();
            }
        };
    }
    );
}