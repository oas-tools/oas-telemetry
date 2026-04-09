import { Router } from 'express';
import { specLoader, heapStats, getOasTelemetrySpec } from './utilController.js';
import { OasTlmConfig } from '../config/config.types.js';

export const getUtilsRoutes = (oasTlmConfig: OasTlmConfig) => {
    const router = Router();

    router.get('/spec', (req, res) => specLoader(req, res, oasTlmConfig));
    router.get('/oas-telemetry-spec', (req, res) => getOasTelemetrySpec(req, res));
    router.get('/heapStats', heapStats);
    //This route is NOT ignored by the spanExporter (includes "generate")
    router.post('/generate-log', async (req, res) => {
        const log = req.body.log || 'Default log message';
        const repeat = parseInt(req.body.repeat as string) || 1;
        const method = (req.body.method as string)?.toLowerCase() || 'log';
        if (!['log', 'warn', 'error', 'info', 'debug'].includes(method)) {
            res.status(400).send({ error: 'Invalid method. Use log, warn, error, info, or debug.' });
            return;
        }
        res.send({ message: 'Log generated', log: log });
        for (let i = 0; i < repeat; i++) {
            (console as any)[method](log);
            await new Promise(resolve => setTimeout(resolve, 50)); // Slight delay between logs
        }
    });

    // This route is NOT ignored by the spanExporter (includes "generate")
    router.post('/generate-mock-logs', async (req, res) => {
        const count = parseInt(req.body.count as string) || 50;
        generateMockLogs(count);
        res.send({ message: 'Started generating mock logs' });
    });
    // This route is NOT ignored by the spanExporter
    router.get('/generate-wait', async (req, res) => {
        const seconds = parseInt(req.query.seconds as string ?? "1", 10);
        const waitTime = isNaN(seconds) ? 1 : seconds;
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        res.send({ waited: waitTime });
    });
    return router;
};

const generateMockLogs = async (count: number) => {
    const methodMessages: Record<string, string[]> = {
        log: ['User logged in', 'Data fetched successfully'],
        warn: ['Warning: Disk space low', 'Warning: High memory usage'],
        error: ['Error connecting to database', 'Error: Invalid credentials'],
        info: ['Info: Scheduled job started', 'Info: Configuration loaded'],
        debug: ['Debugging mode enabled', 'Debug: Variable x = 42'],
    };
    const methods = Object.keys(methodMessages);
    for (let i = 0; i < count; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Slight delay between logs
        const method = methods[Math.floor(Math.random() * methods.length)];
        const messages = methodMessages[method];
        const message = messages[Math.floor(Math.random() * messages.length)];
        (console as any)[method](`[${new Date().toISOString()}][MOCK LOG][${method.toUpperCase()}] -${i + 1}- ${message}`);
    }
}