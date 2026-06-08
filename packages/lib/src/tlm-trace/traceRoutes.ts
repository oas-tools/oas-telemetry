import { Router } from 'express';
import { getTraceById } from './traceController.js';

export const getTraceRoutes = () => {
    const router = Router();

    // Actual trace routes (under /traces)
    router.get('/:traceId', getTraceById);

    return router;
};

export default getTraceRoutes;