import { Request, Response } from 'express';
import { inMemoryDbLogExporter } from '../telemetry/telemetryRegistry.js';
import logger from '../utils/logger.js';
import { convertRegexRecursively } from '../utils/regexUtils.js';
import { logs } from '@opentelemetry/api-logs';

/**
 * Parse NDJSON import data
 * Each line must be a valid JSON object
 * @param body - Request body (raw string)
 * @returns Array of log objects
 */
function parseImportData(body: any): any[] {
    if (typeof body !== 'string') {
        throw new Error('Import must be NDJSON format (plain text with one JSON object per line)');
    }

    const lines = body.split('\n').filter((line: string) => line.trim());
    return lines.map((line: string, index: number) => {
        try {
            return JSON.parse(line);
        } catch (e) {
            logger.error(`Failed to parse NDJSON line ${index + 1}: ${line}`);
            throw new Error(`Invalid JSON on line ${index + 1}`);
        }
    });
}

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
            logsCount: docs.length,
            logs: docs,
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
        res.status(400).send({ error: 'Invalid data format.' });
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

export const importLogs = async (req: Request, res: Response) => {
    const resetData = req.query.reset === 'true';

    try {
        // Parse NDJSON format
        const logs = parseImportData(req.body);

        if (logs.length === 0) {
            res.status(400).send({ error: 'No valid logs found in import data' });
            return;
        }

        const cleanedLogs = logs.map((log: any) => {
            const { _id, ...rest } = log; // Remove _id if it exists
            return rest;
        });

        let message = '';
        if (resetData) {
            inMemoryDbLogExporter.reset();
            message += 'Logs Database reset. ';
        }

        await new Promise((resolve, reject) => {
            inMemoryDbLogExporter.insert(cleanedLogs, (err: any, newDocs: any[]) => {
                if (err) {
                    logger.error('Error importing logs:', err);
                    return reject(err);
                }
                resolve(newDocs);
            });
        });

        message += `Imported ${cleanedLogs.length} logs.`;
        res.send({ message, ImportedLogsCount: cleanedLogs.length });
    } catch (err: any) {
        logger.error('Import failed:', err);
        res.status(400).send({ error: 'Failed to import logs', details: err.message });
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
    const retentionTimeInSeconds = req.body.retentionTimeInSeconds;
    if (typeof retentionTimeInSeconds !== 'number' || retentionTimeInSeconds <= 0) {
        res.status(400).send({ error: 'Invalid retention time. Must be a positive number.' });
        return;
    }

    inMemoryDbLogExporter.retentionTimeInSeconds = retentionTimeInSeconds;
    res.send({ message: `Retention time set to ${retentionTimeInSeconds} seconds.` });
};

export const getLogRetentionTime = (req: Request, res: Response) => {
    const retentionTimeInSeconds = inMemoryDbLogExporter.retentionTimeInSeconds || 0;
    res.send({ retentionTimeInSeconds: retentionTimeInSeconds });
};

export const exportLogs = async (req: Request, res: Response) => {
    try {
        // Get ALL logs without practical limit
        const findConfig = {
            query: {},
            messageSearch: null,
            limit: 9999999,
            sortOrder: { timestamp: -1 }
        };
        const docs = await inMemoryDbLogExporter.find(findConfig);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Content-Disposition', `attachment; filename="logs-${timestamp}.ndjson"`);
        res.setHeader('Transfer-Encoding', 'chunked');

        // Stream as NDJSON (one JSON object per line)
        docs.forEach(doc => {
            res.write(JSON.stringify(doc) + '\n');
        });
        res.end();
    } catch (err: any) {
        logger.error('Failed to export logs:', err);
        res.status(500).send({ error: 'Failed to export logs', details: err.message });
    }
};