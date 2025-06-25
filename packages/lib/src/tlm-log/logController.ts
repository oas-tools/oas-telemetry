import { globalOasTlmConfig } from '../config.js';
import { Request, Response } from 'express';

export const listLogs = async (req: Request, res: Response) => {
    try {
        const logs = globalOasTlmConfig.logExporter.getFinishedLogs();
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
    } catch (err: any) {
        console.error(err);
        res.status(500).send({ error: 'Failed to find logs', details: err.message });
    }
};

export const resetLogs = (req: Request, res: Response) => {
    globalOasTlmConfig.logExporter.reset();
    res.send('Logs reset');
};


export const insertLogsToDb = async (req: Request, res: Response) => {
    const jsonContent = req.body.logs;
    const resetData = req.query.reset === 'true';
    if (!Array.isArray(jsonContent)) {
        res.status(400).send({ error: 'Invalid data format. Expected an array of JSON objects.' });
        return;
    }

    const cleanedLogs = jsonContent.map((log: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = log; // Remove _id if it exists
        return rest; // Return the cleaned log object
    });

    try {
        let message = '';
        if (resetData) {
            globalOasTlmConfig.logExporter.reset();
            message += 'Logs Database reset. ';
        }

        await new Promise((resolve, reject) => {
            globalOasTlmConfig.logExporter.insert(cleanedLogs, (err: any, newDocs: any[]) => {
                if (err) {
                    console.error('Error inserting logs:', err);
                    return reject(err);
                }
                resolve(newDocs);
            });
        });

        message += `Inserted ${cleanedLogs.length} logs.`;
        res.send({ message, InsertedLogsCount: cleanedLogs.length });
    } catch (err: any) {
        console.error(err);
        res.status(500).send({ error: 'Failed to reset and insert data', details: err.message });
    }
};

export const startLogs = (req: Request, res: Response) => {
    globalOasTlmConfig.logExporter.start();
    res.send('Log collection started');
};

export const stopLogs = (req: Request, res: Response) => {
    globalOasTlmConfig.logExporter.stop();
    res.send('Log collection stopped');
};

export const statusLogs = (req: Request, res: Response) => {
    const isRunning = globalOasTlmConfig.logExporter.isRunning() || false;
    res.send({ active: isRunning });
};


