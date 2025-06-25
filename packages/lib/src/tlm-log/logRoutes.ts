import { Router } from 'express';
import {
    startLogs,
    stopLogs,
    statusLogs,
    resetLogs,
    listLogs,
    findLogs,
    insertLogsToDb
} from './logController.js';

export const logRoutes = Router();

// Logs Control
logRoutes.get('/start', startLogs);
logRoutes.get('/stop', stopLogs);
logRoutes.get('/status', statusLogs);
logRoutes.get('/reset', resetLogs);

logRoutes.get('/', listLogs);
logRoutes.post('/', insertLogsToDb);
logRoutes.post('/find', findLogs);

export default logRoutes;
