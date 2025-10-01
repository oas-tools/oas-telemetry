import { Router } from 'express';
import { specLoader, heapStats, getOasTelemetrySpec } from './utilController.js';
import { OasTlmConfig } from '../config/config.types.js';

export const getUtilsRoutes = (oasTlmConfig: OasTlmConfig) => {
    const router = Router();

    router.get('/spec', (req, res) => specLoader(req, res, oasTlmConfig));
    router.get('/oas-telemetry-spec', (req, res) => getOasTelemetrySpec(req, res));
    router.get('/heapStats', heapStats);
    router.get('/generate-log', async (req, res) => {
        const log = req.query.log || 'Default log message';
        const repeat = parseInt(req.query.repeat as string) || 1;
        const method = (req.query.method as string)?.toLowerCase() || 'log';
        if (!['log', 'warn', 'error', 'info', 'debug'].includes(method)) {
            res.status(400).send({ error: 'Invalid method. Use log, warn, error, info, or debug.' });
            return;
        }
        res.send({ message: 'Log generated', log: log });
        for (let i = 0; i < repeat; i++) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Slight delay between logs
            (console as any)[method](`[${new Date().toISOString()}][${method.toUpperCase()}] -${i + 1}- ${log}`);
        }
    });
    
    router.get('/generate-mock-logs', async (req, res) => {
        const count = parseInt(req.query.count as string) || 50;
        generateMockLogs(count);
        res.send({ message: 'Started generating mock logs' });
    });

    router.get('/wait/:seconds?', async (req, res) => {
        const seconds = parseInt(req.params.seconds ?? "1", 10);
        const waitTime = isNaN(seconds) ? 1 : seconds;
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        res.send({ waited: waitTime });
    });
    return router;
};

const generateMockLogs = async (count: number) => {
    const methods = ['log', 'warn', 'error', 'info', 'debug'];
    for (let i = 0; i < count; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Slight delay between logs
        const messages = ['User logged in', 'Data fetched successfully', 'Error connecting to database', 'Warning: Disk space low', 'Debugging mode enabled'];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const method = methods[Math.floor(Math.random() * methods.length)];
        (console as any)[method](`[${new Date().toISOString()}][${method.toUpperCase()}] -${i + 1}- ${message}`);
    }
}