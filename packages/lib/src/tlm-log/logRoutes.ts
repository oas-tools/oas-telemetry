import { Router } from 'express';
import {
    startLogs,
    stopLogs,
    statusLogs,
    resetLogs,
    findLogs,
    insertLogsToDb,
    importLogs,
    setLogRetentionTime,
    getLogRetentionTime,
    exportLogs
} from './logController.js';

export const getLogRoutes = () => {
    const router = Router();

    // Exporter Control & Data Actions
    router.post('/exporters/in-memory-exporter/start', startLogs);
    router.post('/exporters/in-memory-exporter/stop', stopLogs);
    router.get('/exporters/in-memory-exporter/status', statusLogs);
    router.post('/exporters/in-memory-exporter/reset', resetLogs);

    router.get('/exporters/in-memory-exporter/data', findLogs);
    router.post('/exporters/in-memory-exporter/data', insertLogsToDb);
    router.delete('/exporters/in-memory-exporter/data', resetLogs);

    router.get('/exporters/in-memory-exporter/retention-time', getLogRetentionTime);
    router.post('/exporters/in-memory-exporter/retention-time', setLogRetentionTime);

    router.get('/exporters/in-memory-exporter/export', exportLogs);
    router.post('/exporters/in-memory-exporter/import', importLogs);

    router.post('/exporters/in-memory-exporter/data/find', findLogs);

    return router;
};

export default getLogRoutes;
