import { Router } from 'express';
import {
    startLogs,
    stopLogs,
    statusLogs,
    resetLogs,
    listLogs,
    findLogs,
    insertLogsToDb,
    setRetentionTimeLogs
} from './logController.js';

export const getLogRoutes = () => {
    const router = Router();

    // Logs Control
    router.post('/start', startLogs);
    router.post('/stop', stopLogs);
    router.get('/status', statusLogs);
    router.post('/reset', resetLogs);
    router.post('/retention-time', setRetentionTimeLogs);

    router.get('/', listLogs);
    router.post('/', insertLogsToDb);
    router.post('/find', findLogs);

    return router;
};

export default getLogRoutes;
