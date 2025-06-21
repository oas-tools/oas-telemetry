import { Router } from 'express';
import { listLogs, findLogs, resetLogs } from './logController.js';

export const logRoutes = Router();

logRoutes.get('/', listLogs);
logRoutes.post('/find', findLogs);
logRoutes.get('/reset', resetLogs);

export default logRoutes;
