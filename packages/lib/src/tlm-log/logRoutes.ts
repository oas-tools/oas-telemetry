import { Router, text } from 'express';
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

    // Logs Control
    router.post('/start', startLogs);
    router.post('/stop', stopLogs);
    router.get('/status', statusLogs);
    router.post('/reset', resetLogs);
    router.post('/retention-time', setLogRetentionTime);
    router.get('/retention-time', getLogRetentionTime);

    router.get('/export', exportLogs);
    // Use text middleware for import to handle NDJSON format
    router.post('/import', text({ type: 'application/x-ndjson' }), importLogs);
    router.get('/', findLogs);
    router.post('/', insertLogsToDb);
    router.post('/find', findLogs);

    return router;
};

export default getLogRoutes;
