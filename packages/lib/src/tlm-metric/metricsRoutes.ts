import { Router } from 'express';
import {
    resetMetrics,
    insertMetricsToDb,
    startMetrics,
    stopMetrics,
    statusMetrics,
    setMetricRetentionTime,
    getMetricRetentionTime,
    getMetricsStats,
    findMetrics,
    getScopeMetricsInfo
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

    // Optimized endpoints (no data loading)
    router.get('/scope-metrics-info', getScopeMetricsInfo);
    router.get('/stats', getMetricsStats);
    
    // Query endpoints
    router.post('/find', findMetrics);
    router.post('/', insertMetricsToDb);

    return router;
};

export default getMetricsRoutes;
