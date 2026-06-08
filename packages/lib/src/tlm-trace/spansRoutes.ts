import { Router } from 'express';
import {
    startTraces,
    stopTraces,
    statusTraces,
    resetTraces,
    findTraces,
    insertTracesToDb,
    importTraces,
    setTraceRetentionTime,
    getTraceRetentionTime,
    exportTraces
} from './traceController.js';

export const getSpansRoutes = () => {
    const router = Router();

    // Exporter Control & Data Actions
    router.post('/exporters/in-memory-exporter/start', startTraces);
    router.post('/exporters/in-memory-exporter/stop', stopTraces);
    router.get('/exporters/in-memory-exporter/status', statusTraces);
    router.post('/exporters/in-memory-exporter/reset', resetTraces);

    router.get('/exporters/in-memory-exporter/data', findTraces);
    router.post('/exporters/in-memory-exporter/data', insertTracesToDb);
    router.delete('/exporters/in-memory-exporter/data', resetTraces);

    router.get('/exporters/in-memory-exporter/retention-time', getTraceRetentionTime);
    router.post('/exporters/in-memory-exporter/retention-time', setTraceRetentionTime);

    router.get('/exporters/in-memory-exporter/export', exportTraces);
    router.post('/exporters/in-memory-exporter/import', importTraces);

    router.post('/exporters/in-memory-exporter/data/find', findTraces);

    return router;
};

export default getSpansRoutes;
