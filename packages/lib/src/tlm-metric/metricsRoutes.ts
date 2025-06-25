import { Router } from 'express';
import {
    listMetrics,
    findMetrics,
    resetMetrics,
    insertMetricsToDb,
    startMetrics,
    stopMetrics,
    statusMetrics
} from './metricsController.js';

export const metricsRoutes = Router();

// Metrics Control
metricsRoutes.get('/', listMetrics);
metricsRoutes.post('/', insertMetricsToDb);
metricsRoutes.post('/find', findMetrics);
metricsRoutes.get('/reset', resetMetrics);
metricsRoutes.get('/start', startMetrics);
metricsRoutes.get('/stop', stopMetrics);
metricsRoutes.get('/status', statusMetrics);

export default metricsRoutes;
