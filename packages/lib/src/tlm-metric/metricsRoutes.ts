import { Router } from 'express';
import {
    listMetrics,
    resetMetrics,
    insertMetricsToDb,
    startMetrics,
    stopMetrics,
    statusMetrics,
    setMetricRetentionTime,
    getMetricRetentionTime,
    getMetricsStats,
    getMetricNames,
    getInstrumentations,
    getLabelKeys
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
    router.get('/names', getMetricNames);
    router.get('/instrumentations', getInstrumentations);
    router.get('/label-keys', getLabelKeys);
    router.get('/stats', getMetricsStats);
    
    // Data endpoints (use GET / with query params for filtering)
    router.get('/', listMetrics);
    router.post('/', insertMetricsToDb);

    return router;
};

export default getMetricsRoutes;
