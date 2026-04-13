import { Request, Response } from 'express';
import { inMemoryDbLogExporter } from '../telemetry/telemetryRegistry.js';
import logger from '../utils/logger.js';
import { convertRegexRecursively } from '../utils/regexUtils.js';
import { importLogsToMemory, sanitizeLogRecords } from './logService.js';
import { gzipSync } from 'zlib';

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
    const jsonContent = (req.body || {}).logs;
    const resetData = req.query.reset === 'true';
    if (!Array.isArray(jsonContent)) {
        res.status(400).send({ error: 'Invalid data format.' });
        return;
    }

    const cleanedLogs = sanitizeLogRecords(jsonContent);

    try {
        let message = '';
        await importLogsToMemory(cleanedLogs, { reset: resetData });

        if (resetData) {
            message += 'Logs Database reset. ';
        }

        message += `Inserted ${cleanedLogs.length} logs.`;
        res.send({ message, InsertedLogsCount: cleanedLogs.length });
    } catch (err: any) {
        logger.error(err);
        res.status(500).send({ error: 'Failed to reset and insert data', details: err.message });
    }
};

export const importLogs = async (req: Request, res: Response) => {
    const resetData = req.query.reset === 'true';
    const body = req.body || {};
    const importedLogs = Array.isArray(body) ? body : body.logs;

    try {
        if (!Array.isArray(importedLogs)) {
            res.status(400).send({ error: 'Invalid data format. Expected an array in request body or body.logs.' });
            return;
        }

        const cleanedLogs = sanitizeLogRecords(importedLogs);

        let message = '';
        await importLogsToMemory(cleanedLogs, { reset: resetData });

        if (resetData) {
            message += 'Logs Database reset. ';
        }

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
    const retentionTimeInSeconds = (req.body || {}).retentionTimeInSeconds;
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
        const findConfig = {
            query: {},
            messageSearch: null,
            sortOrder: { timestamp: -1 }
        };
        const docs = await inMemoryDbLogExporter.find(findConfig);

        const responseBody = { logsCount: docs.length, logs: docs };
        const payload = JSON.stringify(responseBody);
        const payloadSize = Buffer.byteLength(payload, 'utf-8');
        const acceptsGzip = String(req.headers['accept-encoding'] || '').includes('gzip');

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="logs-${timestamp}.json"`);
        res.setHeader('Vary', 'Accept-Encoding');

        if (acceptsGzip && payloadSize > 64 * 1024) {
            const compressed = gzipSync(payload);
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Length', compressed.length.toString());
            res.end(compressed);
            return;
        }

        res.setHeader('Content-Length', payloadSize.toString());
        res.end(payload);
    } catch (err: any) {
        logger.error('Failed to export logs:', err);
        res.status(500).send({ error: 'Failed to export logs', details: err.message });
    }
};