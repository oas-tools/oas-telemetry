import { Router } from 'express';
import {
    listMetrics,
    findMetrics,
    resetMetrics,
    insertMetricsToDb,
    startMetrics,
    stopMetrics,
    statusMetrics,
    setMetricRetentionTime,
    getMetricRetentionTime
} from './metricsController.js';

export const getMetricsRoutes = () => {
    const router = Router();

    // Metrics Control
    router.post('/start', startMetrics);
    router.post('/stop', stopMetrics);
    router.get('/status', statusMetrics);
    router.post('/reset', resetMetrics);
    router.post('/retention-time', setMetricRetentionTime);
    router.get('/retention-time', getMetricRetentionTime);

    router.get('/', listMetrics);
    router.post('/', insertMetricsToDb);
    router.post('/find', findMetrics);

    return router;
};

export default getMetricsRoutes;
