import { Router } from 'express';
import { specLoader, heapStats } from './utilController.js';

export const utilsRoutes = Router();

utilsRoutes.get('/spec', specLoader);
utilsRoutes.get('/heapStats', heapStats);


export default utilsRoutes;