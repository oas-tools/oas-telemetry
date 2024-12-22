import './openTelemetry.js';
import { globalOasTlmConfig } from './config.js';
import cookieParser from 'cookie-parser';
import { Router, json } from 'express';
import { authMiddleware } from './middleware/authMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import { telemetryRoutes } from './routes/telemetryRoutes.js';
import { InMemoryExporter } from './exporters/InMemoryDbExporter.js';


let dbglog = () => { };

if (process.env.OTDEBUG == "true")
    dbglog = console.log;

/**
 * Returns the Oas Telemetry middleware. The parameters are the same as `globalOasTlmConfig`.
 * All parameters are optional. However, either `spec` or `specFileName` must be provided to enable endpoint filtering.
 * 
 * @param {Object} OasTlmConfig Configuration object.
 * @param {string} [OasTlmConfig.baseURL="/telemetry"] The base URL for the telemetry routes.
 * @param {Object} [OasTlmConfig.spec] The OpenAPI spec object.
 * @param {string} [OasTlmConfig.specFileName] Alternative to `spec`: the path to the OpenAPI spec file.
 * @param {boolean} [OasTlmConfig.autoActivate=true] Whether to start telemetry automatically on load.
 * @param {boolean} [OasTlmConfig.authEnabled=true] Whether to enable authentication middleware.
 * @param {number} [OasTlmConfig.apiKeyMaxAge=1800000] The maximum age of the API key in milliseconds.
 * @param {string} [OasTlmConfig.defaultApiKey] The default API key to use.
 * @param {OasTlmExporter} [OasTlmConfig.exporter=InMemoryExporter] The exporter to use. Must implement the `OasTlmExporter` interface.
 * @returns {Router} The middleware router for Oas Telemetry.
 */
export default function oasTelemetry(OasTlmConfig) {
    const router = Router();
    if (process.env.OASTLM_MODULE_DISABLED === 'true') {
        return router; 
    };
    if (OasTlmConfig) {
        console.log("User provided config");
        // Global = user-provided || default, for each key
        for (const key in globalOasTlmConfig) {
            globalOasTlmConfig[key] = OasTlmConfig[key] ?? globalOasTlmConfig[key];
        }
    }
    console.log("baseURL: ", globalOasTlmConfig.baseURL);
    globalOasTlmConfig.dynamicExporter.changeExporter( OasTlmConfig.exporter ?? new InMemoryExporter() );

    if (globalOasTlmConfig.spec)
        dbglog(`Spec content provided`);
    else {
        if (globalOasTlmConfig.specFileName != "")
            dbglog(`Spec file used for telemetry: ${globalOasTlmConfig.specFileName}`);
        else {
            console.error("No spec available !");
        }
    }
    let allAuthMiddlewares = getWrappedMiddlewares(() => globalOasTlmConfig.authEnabled, [cookieParser(),authRoutes,authMiddleware]);
    const baseURL = globalOasTlmConfig.baseURL;
    router.use(json());
    router.use(baseURL, allAuthMiddlewares);
    router.use(baseURL, telemetryRoutes);

    if (globalOasTlmConfig.autoActivate) {
        globalOasTlmConfig.dynamicExporter.exporter?.start();
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
function getWrappedMiddlewares(conditionCallback, middlewares) {
    return middlewares.map(middleware => {
        return function (req, res, next) {
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