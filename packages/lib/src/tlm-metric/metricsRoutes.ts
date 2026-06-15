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
    exportMetrics,
    importMetrics,
    getExportInterval,
    setExportInterval,
    getIgnoredMetrics,
    addIgnoredMetrics,
    removeIgnoredMetrics,
} from './metricsController.js';

export const getMetricsRoutes = () => {
    const router = Router();

    // Exporter Control & Data Actions
    router.post('/exporters/in-memory-exporter/start', startMetrics);
    router.post('/exporters/in-memory-exporter/stop', stopMetrics);
    router.get('/exporters/in-memory-exporter/status', statusMetrics);
    router.post('/exporters/in-memory-exporter/reset', resetMetrics);

    router.get('/exporters/in-memory-exporter/data', findMetrics);
    router.post('/exporters/in-memory-exporter/data', insertMetricsToDb);
    router.delete('/exporters/in-memory-exporter/data', resetMetrics);

    router.get('/exporters/in-memory-exporter/retention-time', getMetricRetentionTime);
    router.post('/exporters/in-memory-exporter/retention-time', setMetricRetentionTime);

    router.get('/exporters/in-memory-exporter/export', exportMetrics);
    router.post('/exporters/in-memory-exporter/import', importMetrics);

    router.post('/exporters/in-memory-exporter/data/find', findMetrics);
    router.get('/stats', getMetricsStats);

    // Dynamic metrics endpoints
    router.get('/export-interval', getExportInterval);
    router.post('/export-interval', setExportInterval);
    router.get('/ignored', getIgnoredMetrics);
    router.post('/ignored', addIgnoredMetrics);
    router.delete('/ignored', removeIgnoredMetrics);

    return router;
};

export default getMetricsRoutes;
