import { Router, text } from 'express';
import {
    startTraces,
    stopTraces,
    statusTraces,
    resetTraces,
    listTraces,
    findTraces,
    insertTracesToDb,
    importTraces,
    setTraceRetentionTime,
    getTraceRetentionTime,
    exportTraces
} from './traceController.js';

export const getTraceRoutes = () => {
    const router = Router();

    // Telemetry Control
    router.post('/start', startTraces);
    router.post('/stop', stopTraces);
    router.get('/status', statusTraces);
    router.post('/reset', resetTraces);

    router.get('/export', exportTraces);
    // Use text middleware for import to handle NDJSON format
    router.post('/import', text({ type: 'application/x-ndjson', limit: '500mb' }), importTraces);
    router.get('/', listTraces);
    router.post('/', insertTracesToDb);
    router.post('/find', findTraces);
    router.post('/retention-time', setTraceRetentionTime);
    router.get('/retention-time', getTraceRetentionTime);

    return router;
};

export default getTraceRoutes;