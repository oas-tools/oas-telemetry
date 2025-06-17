import { Router } from 'express';
import {
    startTelemetry,
    stopTelemetry,
    statusTelemetry,
    resetTelemetry,
    listTelemetry,
    findTelemetry
} from './traceController.js';

export const traceRoutes = Router();


traceRoutes.get('/', listTelemetry);
traceRoutes.post('/find', findTelemetry);

// Telemetry Control
traceRoutes.get('/start', startTelemetry);
traceRoutes.get('/stop', stopTelemetry);
traceRoutes.get('/status', statusTelemetry);
traceRoutes.get('/reset', resetTelemetry);


export default traceRoutes;