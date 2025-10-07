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
            origin: (origin, callback) => {
                if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));
    }
    const telemetryBaseUrl = oasTlmConfig.general.baseUrl;

    // Sub-router for all telemetry endpoints
    const telemetryRouter = Router();

    // Body parser for JSON requests
    telemetryRouter.use((req, res, next) => {
        if (req.body !== undefined) {
            return next(); // Already parsed, no need to parse again.
        }
        return json({ limit: '10mb' })(req, res, next);
    });

    telemetryRouter.get('/health', (_req, res) => {
        res.status(200).send({ status: 'OK' });
    });

    // Redirect to the UI when accessing the base URL
    telemetryRouter.get('/', (req, res) => {
        res.redirect(`${telemetryBaseUrl}/telemetry-ui/`);
    });

    // WARNING: This path must be the same as the one used in the UI package App.tsx "telemetry-ui"
    telemetryRouter.use("/telemetry-ui", getUIRoutes());

    telemetryRouter.use("/utils", getUtilsRoutes(oasTlmConfig));
    // Auth routes must be registered. If authentication is not enabled, all requests will be allowed.
    // Frontend will use these endpoints;
    telemetryRouter.use(cookieParser());
    // Refresh token uses /auth/refresh path, careful if you change it
    telemetryRouter.use('/auth', getAuthRoutes(oasTlmConfig));
    telemetryRouter.use(getAuthMiddleware(oasTlmConfig));

    telemetryRouter.use("/traces", getTraceRoutes());
    telemetryRouter.use("/metrics", getMetricsRoutes());
    telemetryRouter.use("/logs", getLogRoutes());

    if (oasTlmConfig.ai.openAIKey) {
        telemetryRouter.use("/ai", getAIRoutes(oasTlmConfig));
    }

    telemetryRouter.use("/plugins", getPluginRoutes());

    // Mount the telemetryRouter under telemetryBaseUrl
    router.use(telemetryBaseUrl, telemetryRouter);
}