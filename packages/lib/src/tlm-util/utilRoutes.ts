import { Router } from 'express';
import { specLoader, heapStats } from './utilController.js';

export const utilsRoutes = Router();

utilsRoutes.get('/spec', specLoader);
utilsRoutes.get('/heapStats', heapStats);
utilsRoutes.get('/generateLog', (req, res) => {
    const log = req.query.log || 'Default log message';
    console.log('Generated log:', log);
    res.send({ message: 'Log generated', log: log });
});
utilsRoutes.get('/wait/:seconds?', async (req, res) => {
    const seconds = parseInt(req.params.seconds ?? "1", 10);
    const waitTime = isNaN(seconds) ? 1 : seconds;
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    res.send({ waited: waitTime });
});

export default utilsRoutes;