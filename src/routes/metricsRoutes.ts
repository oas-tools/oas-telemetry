import { Router } from 'express';
import {
    listMetrics,
    findMetrics,
    resetMetrics
} from '../controllers/metricsController.js';

export const metricsRoutes = Router();

// Metrics Control
metricsRoutes.get('/', listMetrics);
metricsRoutes.post('/find', findMetrics);
metricsRoutes.get('/reset', resetMetrics);

export default metricsRoutes;
