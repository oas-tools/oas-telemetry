import { Router, json } from "express";
import logger from "./utils/logger.js";
import cors from 'cors';
import { globalOasTlmConfig } from "./config.js"
import metricsRoutes from "./tlm-metric/metricsRoutes.js";
import cookieParser from 'cookie-parser';
import authRoutes from './tlm-auth/authRoutes.js';
import uiRoutes from './tlm-ui/uiRoutes.js';
import traceRoutes from "./tlm-trace/traceRoutes.js";
import { authMiddleware } from "./tlm-auth/authMiddleware.js";
import utilsRoutes from "./tlm-util/utilRoutes.js";

export const configureRoutes = (router: Router) => {
    if (process.env.OAS_TLM_ENV === 'development') {
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
        return json()(req, res, next);
    });

    const allAuthMiddlewares = getWrappedMiddlewares(() => globalOasTlmConfig.authEnabled, [cookieParser(), authRoutes, authMiddleware]);
    const baseURL = globalOasTlmConfig.baseURL;

    router.use(baseURL, allAuthMiddlewares);
    // WARNING: This path must be the same as the one used in the UI package App.tsx "oas-telemetry-ui"
    router.use(baseURL + "/oas-telemetry-ui", uiRoutes);
    router.use(baseURL + "/traces", traceRoutes);
    router.use(baseURL + "/metrics", metricsRoutes);

    router.use(baseURL + "/utils", utilsRoutes);

    //redirect to the UI when accessing the base URL
    router.get(baseURL, (req, res) => {
        res.redirect(baseURL + "/oas-telemetry-ui");
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