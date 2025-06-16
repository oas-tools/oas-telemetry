import './openTelemetry.js';
import { globalOasTlmConfig } from './config.js';
import cookieParser from 'cookie-parser';
import { Router, json } from 'express';
import { authMiddleware } from './middleware/authMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import { telemetryRoutes } from './routes/telemetryRoutes.js';
import { InMemoryExporter } from './exporters/InMemoryDbExporter.js';
import metricsRoutes from './routes/metricsRoutes.js';
import { OasTlmInputConfig } from '@types';
import logger from './utils/logger.js';
import cors from 'cors';
import uiRoutes from './routes/uiRoutes.js';


/**
 * Returns the Oas Telemetry middleware. The parameters are the same as `globalOasTlmConfig`.
 * All parameters are optional. However, either `spec` or `specFileName` must be provided to enable endpoint filtering.
 * 
 * @param {Object} oasTlmInputConfig Configuration object.
 * @param {string} [oasTlmInputConfig.baseURL="/telemetry"] The base URL for the telemetry routes.
 * @param {Object} [oasTlmInputConfig.spec] The OpenAPI spec object.
 * @param {string} [oasTlmInputConfig.specFileName] Alternative to `spec`: the path to the OpenAPI spec file.
 * @param {boolean} [oasTlmInputConfig.autoActivate=true] Whether to start telemetry automatically on load.
 * @param {boolean} [oasTlmInputConfig.authEnabled=true] Whether to enable authentication middleware.
 * @param {number} [oasTlmInputConfig.apiKeyMaxAge=1800000] The maximum age of the API key in milliseconds.
 * @param {string} [oasTlmInputConfig.defaultApiKey] The default API key to use.
 * @param {OasTlmExporter} [oasTlmInputConfig.exporter=InMemoryExporter] The exporter to use. Must implement the `OasTlmExporter` interface.
 * @returns {Router} The middleware router for Oas Telemetry.
 */
export default function oasTelemetry(oasTlmInputConfig: OasTlmInputConfig): Router {
    const router = Router();

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

    if (process.env.OASTLM_MODULE_DISABLED === 'true') {
        return router;
    };

    if (oasTlmInputConfig) {
        logger.info("User provided config");
        // Override global config with user provided config
        for (const key in globalOasTlmConfig) {
            globalOasTlmConfig[key] = oasTlmInputConfig[key] ?? globalOasTlmConfig[key];
        }
    }

    logger.info("baseURL: ", globalOasTlmConfig.baseURL);
    globalOasTlmConfig.dynamicSpanExporter.changeExporter(globalOasTlmConfig.exporter ?? new InMemoryExporter());

    if (globalOasTlmConfig.spec)
        logger.info(`Spec content provided`);
    else {
        if (globalOasTlmConfig.specFileName != "")
            logger.info(`Spec file used for telemetry: ${globalOasTlmConfig.specFileName}`);
        else {
            console.error("No spec available !");
        }
    }

    let allAuthMiddlewares = getWrappedMiddlewares(() => globalOasTlmConfig.authEnabled, [cookieParser(), authRoutes, authMiddleware]);
    const baseURL = globalOasTlmConfig.baseURL;
    router.use(baseURL, allAuthMiddlewares);
    router.use(baseURL + "/oas-telemetry-ui", uiRoutes);
    router.use(baseURL, telemetryRoutes);
    router.use(baseURL + "/metrics", metricsRoutes);

    router.get(baseURL, (req, res) => {
        //redirect to the UI
        res.redirect(baseURL + "/oas-telemetry-ui");
    });

    if (globalOasTlmConfig.autoActivate) {
        globalOasTlmConfig.dynamicSpanExporter.exporter?.start();
    }

    return router;
}


/**
 * @typedef OasTlmExporter
 * Represents an exporter that processes and manages telemetry data.
 * Any custom exporter must implement these methods.
 * 
 * @method {void} start() Starts the exporter, allowing it to process data.
 * @method {void} stop() Stops the exporter and halts data processing.
 * @method {void} reset() Resets the internal state of the exporter (e.g., clears buffers or data stores).
 * @method {boolean} isRunning() Returns whether the exporter is actively processing data.
 * @method {Array} getFinishedSpans() Retrieves the collected spans from the exporter.
 * @method {any} export(ReadableSpan, SpanExporterResultCallback) Exports spans.
 * @method {Promise<void>} shutdown() Gracefully shuts down the exporter, flushing data if necessary.
 * @method {Promise<void>} forceFlush() Exports any pending data that has not yet been processed.
 * @property {Array} plugins An array of plugins that can be activated by the exporter.
 */

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