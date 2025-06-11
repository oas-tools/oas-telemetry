import { Router } from 'express';
import { mainPage, detailPage , specLoader, apiPage} from '../controllers/uiController.js';
import {
    startTelemetry,
    stopTelemetry,
    statusTelemetry,
    resetTelemetry,
    listTelemetry,
    heapStats,
    findTelemetry
} from '../controllers/telemetryController.js';
import { listPlugins, registerPlugin } from '../controllers/pluginController.js';

export const telemetryRoutes = Router();




// Main Pages
telemetryRoutes.get('/', mainPage);
telemetryRoutes.get('/detail/*', detailPage);
telemetryRoutes.get('/spec', specLoader);
telemetryRoutes.get('/api', apiPage);

// Telemetry Control
telemetryRoutes.get('/start', startTelemetry);
telemetryRoutes.get('/stop', stopTelemetry);
telemetryRoutes.get('/status', statusTelemetry);
telemetryRoutes.get('/reset', resetTelemetry);
telemetryRoutes.get('/list', listTelemetry);
telemetryRoutes.post('/find', findTelemetry);
telemetryRoutes.get('/heapStats', heapStats);

// Plugins
telemetryRoutes.get('/plugins', listPlugins);
telemetryRoutes.post('/plugins', registerPlugin);

export default telemetryRoutes;