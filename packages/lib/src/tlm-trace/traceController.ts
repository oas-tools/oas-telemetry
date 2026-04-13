import { Request, Response } from 'express';
import { inMemoryDbSpanExporter } from '../telemetry/telemetryRegistry.js';
import { convertRegexRecursively } from '../utils/regexUtils.js';
import { importTracesToMemory, sanitizeTraceRecords } from './traceService.js';
import { gzipSync } from 'zlib';

export const startTraces = (_req: Request, res: Response) => {
    inMemoryDbSpanExporter.enable();
    res.send('Traces started');
};

export const stopTraces = (_req: Request, res: Response) => {
    inMemoryDbSpanExporter.disable();
    res.send('Traces stopped');
};

export const statusTraces = (_req: Request, res: Response) => {
    const isRunning = inMemoryDbSpanExporter.isEnabled() || false;
    res.send({ active: isRunning });
};

export const resetTraces = (_req: Request, res: Response) => {
    inMemoryDbSpanExporter.reset();
    res.send('Traces reset');
};

export const listTraces = async (_req: Request, res: Response) => {
    try {
        const spans = inMemoryDbSpanExporter.getFinishedSpans();
        res.send({ spansCount: spans.length, spans: spans });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list traces data' });
    }
};

export const findTraces = async (req: Request, res: Response) => {
    const body = req.body || {};
    const findQuery = body.query || {};
    const limit = parseInt(body.limit) || 50;
    const sortOrder = body.sort || null;

    let processedQuery;
    try {
        processedQuery = convertRegexRecursively(findQuery);
    } catch (error: any) {
        console.error(error.message);
        res.status(400).send({ error: error.message });
        return; // Exit if invalid regex was encountered
    }

    try {
        const findConfig = {
            query: processedQuery,
            limit,
            sortOrder
        };
        const docs = await inMemoryDbSpanExporter.find(findConfig);

        res.send({
            spansCount: docs.length,
            spans: docs,
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).send({ spansCount: 0, spans: [], error: err.message });
    }
};

export const insertTracesToDb = async (req: Request, res: Response) => {
    const jsonContent = (req.body || {}).spans;
    const resetData = req.query.reset === 'true';
    if (!Array.isArray(jsonContent)) {
        res.status(400).send({ error: 'Invalid data format.' });
        return;
    }

    const cleanedTraces = sanitizeTraceRecords(jsonContent);

    try {
        let message = '';
        await importTracesToMemory(cleanedTraces, { reset: resetData });

        if (resetData) {
            message += 'Traces Database reset. ';
        }

        message += `Inserted ${cleanedTraces.length} traces.`;
        res.send({ message, InsertedTracesCount: cleanedTraces.length });
    } catch (err: any) {
        console.error(err);
        res.status(500).send({ error: 'Failed to reset and insert data', details: err.message });
    }
};

export const importTraces = async (req: Request, res: Response) => {
    const resetData = req.query.reset === 'true';
    const body = req.body || {};
    const importedSpans = Array.isArray(body) ? body : body.spans;

    try {
        if (!Array.isArray(importedSpans)) {
            res.status(400).send({ error: 'Invalid data format. Expected an array in request body or body.spans.' });
            return;
        }

        const cleanedTraces = sanitizeTraceRecords(importedSpans);

        let message = '';
        await importTracesToMemory(cleanedTraces, { reset: resetData });

        if (resetData) {
            message += 'Traces Database reset. ';
        }

        message += `Imported ${cleanedTraces.length} traces.`;
        res.send({ message, ImportedTracesCount: cleanedTraces.length });
    } catch (err: any) {
        console.error('Import failed:', err);
        res.status(400).send({ error: 'Failed to import traces', details: err.message });
    }
};

export const setTraceRetentionTime = (req: Request, res: Response) => {
    const retentionTimeInSeconds = (req.body || {}).retentionTimeInSeconds;
    if (typeof retentionTimeInSeconds !== 'number' || retentionTimeInSeconds <= 0) {
        res.status(400).send({ error: 'Invalid retention time. Must be a positive number.' });
        return;
    }

    inMemoryDbSpanExporter.retentionTimeInSeconds = retentionTimeInSeconds;
    res.send({ message: `Retention time set to ${retentionTimeInSeconds} seconds.` });
};

export const getTraceRetentionTime = (_req: Request, res: Response) => {
    const retentionTimeInSeconds = inMemoryDbSpanExporter.retentionTimeInSeconds || 0;
    res.send({ retentionTimeInSeconds: retentionTimeInSeconds });
};

export const exportTraces = async (req: Request, res: Response) => {
    try {
        const findConfig = {
            query: {},
            sortOrder: { startTime: -1 }
        };
        const docs = await inMemoryDbSpanExporter.find(findConfig);

        const responseBody = { spansCount: docs.length, spans: docs };
        const payload = JSON.stringify(responseBody);
        const payloadSize = Buffer.byteLength(payload, 'utf-8');
        const acceptsGzip = String(req.headers['accept-encoding'] || '').includes('gzip');

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="traces-${timestamp}.json"`);
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
        console.error('Failed to export traces:', err);
        res.status(500).send({ error: 'Failed to export traces', details: err.message });
    }
};