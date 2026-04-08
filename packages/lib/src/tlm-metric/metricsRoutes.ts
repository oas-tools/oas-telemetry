import { Router, text } from 'express';
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
    exportMetrics,
    importMetrics,
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
    
    // Export/Import
    router.get('/export', exportMetrics);
    // Use text middleware for import to handle NDJSON format
    router.post('/import', text({ type: 'application/x-ndjson' }), importMetrics);

    // Query endpoints
    router.post('/find', findMetrics);
    router.get('/stats', getMetricsStats);
    router.get('/', findMetrics);
    router.post('/', insertMetricsToDb);

    return router;
};

export default getMetricsRoutes;
