import { globalOasTlmConfig } from '../config.js';
import { Request, Response } from 'express';

export const listLogs = async (req: Request, res: Response) => {
    try {
        const logs = globalOasTlmConfig.logExporter.getFinishedSpans();
        res.send({ logsCount: logs.length, logs: logs });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list log data' });
    }
};

export const findLogs = async (req: Request, res: Response) => {
    const body = req.body;
    const messageSearch = body?.search || null; // Search term for MiniSearch
    const findQuery = body?.find || {}; // Query for NeDB
    console.dir(`findLogs called with query: ${JSON.stringify(findQuery)} and search ${messageSearch}`, { depth: 3 });

    try {
        const results = await new Promise((resolve, reject) => {
            globalOasTlmConfig.logExporter.find(findQuery, messageSearch, (err: any, docs: any) => {
                if (err) return reject(err);
                resolve(docs);
            });
        });

        const typedResults = results as any[];
        res.send({ logsCount: typedResults.length, logs: typedResults });
    } catch (err:any) {
        console.error(err);
        res.status(500).send({ error: 'Failed to find logs', details: err.message });
    }
};

export const resetLogs = (req: Request, res: Response) => {
    globalOasTlmConfig.logExporter.reset();
    res.send('Logs reset');
};
