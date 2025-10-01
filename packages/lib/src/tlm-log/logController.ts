import { Request, Response } from 'express';
import { inMemoryDbLogExporter } from '../telemetry/telemetryRegistry.js';
import logger from '../utils/logger.js';
import { convertRegexRecursively } from '../utils/regexUtils.js';

export const findLogs = async (req: Request, res: Response) => {
    const body = req.body || {};
    const messageSearch = body.textSearch || null;
    const findQuery = body.query || {};
    const limit = parseInt(body.limit) || 50;
    const sortOrder = body.sort || null;

    logger.debug(`findLogs called with query: ${JSON.stringify(findQuery)} and search: ${messageSearch}`, { depth: 3 });

    let processedQuery;
    try {
        processedQuery = convertRegexRecursively(findQuery);
    } catch (error: any) {
        logger.error(error.message);
        res.status(400).send({ error: error.message });
        return; // Exit if invalid regex was encountered
    }

    try {
        // Use findConfig object
        const findConfig = {
            query: processedQuery,
            messageSearch,
            limit,
            sortOrder
        };
        const docs = await inMemoryDbLogExporter.find(findConfig);

        res.send({
            items: docs,
        });
    } catch (err: any) {
        logger.error(err);
        res.status(500).send({ error: 'Failed to find logs', details: err.message });
    }
};

export const resetLogs = (req: Request, res: Response) => {
    inMemoryDbLogExporter.reset();
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
            inMemoryDbLogExporter.reset();
            message += 'Logs Database reset. ';
        }

        await new Promise((resolve, reject) => {
            inMemoryDbLogExporter.insert(cleanedLogs, (err: any, newDocs: any[]) => {
                if (err) {
                    logger.error('Error inserting logs:', err);
                    return reject(err);
                }
                resolve(newDocs);
            });
        });

        message += `Inserted ${cleanedLogs.length} logs.`;
        res.send({ message, InsertedLogsCount: cleanedLogs.length });
    } catch (err: any) {
        logger.error(err);
        res.status(500).send({ error: 'Failed to reset and insert data', details: err.message });
    }
};

export const startLogs = (req: Request, res: Response) => {
    inMemoryDbLogExporter.enable();
    res.send('Log collection started');
};

export const stopLogs = (req: Request, res: Response) => {
    inMemoryDbLogExporter.disable();
    res.send('Log collection stopped');
};

export const statusLogs = (req: Request, res: Response) => {
    const isRunning = inMemoryDbLogExporter.isEnabled() || false;
    res.send({ active: isRunning });
};

export const setLogRetentionTime = (req: Request, res: Response) => {
    const retentionTime = req.body.retentionTime;
    if (typeof retentionTime !== 'number' || retentionTime <= 0) {
        res.status(400).send({ error: 'Invalid retention time. Must be a positive number.' });
        return;
    }

    inMemoryDbLogExporter.retentionTimeInSeconds = retentionTime;
    res.send({ message: `Retention time set to ${retentionTime} seconds.` });
};

export const getLogRetentionTime = (req: Request, res: Response) => {
    const retentionTime = inMemoryDbLogExporter.retentionTimeInSeconds || 0;
    res.send({ retentionTimeInSeconds: retentionTime });
};