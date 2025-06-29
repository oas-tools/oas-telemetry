import { Router } from 'express';
import {
    listMetrics,
    findMetrics,
    resetMetrics,
    insertMetricsToDb,
    startMetrics,
    stopMetrics,
    statusMetrics,
    setRetentionTimeMetrics
} from './metricsController.js';

export const getMetricsRoutes = () => {
    const router = Router();

    // Metrics Control
    router.post('/start', startMetrics);
    router.post('/stop', stopMetrics);
    router.get('/status', statusMetrics);
    router.post('/reset', resetMetrics);
    router.post('/retention-time', setRetentionTimeMetrics);

    router.get('/', listMetrics);
    router.post('/', insertMetricsToDb);
    router.post('/find', findMetrics);

    return router;
};

export default getMetricsRoutes;
