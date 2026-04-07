import { Request, Response } from 'express';
import { InMemoryDbSpanExporter } from '../telemetry/custom-implementations/exporters/InMemoryDbSpanExporter.js';
import { inMemoryDbSpanExporter } from '../telemetry/telemetryRegistry.js';
import { convertRegexRecursively } from '../utils/regexUtils.js';


export const startTraces = (req: Request, res: Response) => {
    inMemoryDbSpanExporter.enable();
    res.send('Traces started');
};

export const stopTraces = (req: Request, res: Response) => {
    inMemoryDbSpanExporter.disable();
    res.send('Traces stopped');
};

export const statusTraces = (req: Request, res: Response) => {
    const isRunning = inMemoryDbSpanExporter.isEnabled() || false;
    res.send({ active: isRunning });
};

export const resetTraces = (req: Request, res: Response) => {
    inMemoryDbSpanExporter.reset();
    res.send('Traces reset');
};

export const listTraces = async (req: Request, res: Response) => {
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
        // Use findConfig object - identical to logs
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
    const jsonContent = req.body.spans;
    const resetData = req.query.reset === 'true';
    if (!Array.isArray(jsonContent)) {
        res.status(400).send({ error: 'Invalid data format.' });
        return;
    }

    const cleanedTraces = jsonContent.map((trace: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = trace; // Remove _id if it exists
        return rest; // Return the cleaned trace object
    });

    try {
        let message = '';
        if (resetData) {
            (inMemoryDbSpanExporter as InMemoryDbSpanExporter).reset();
            message += 'Traces Database reset. ';
        }

        await new Promise((resolve, reject) => {
            (inMemoryDbSpanExporter as InMemoryDbSpanExporter).insert(cleanedTraces, (err: any, newDocs: any[]) => {
                if (err) {
                    console.error('Error inserting traces:', err);
                    return reject(err);
                }
                resolve(newDocs);
            });
        });

        message += `Inserted ${cleanedTraces.length} traces.`;
        res.send({ message, InsertedTracesCount: cleanedTraces.length });
    } catch (err: any) {
        console.error(err);
        res.status(500).send({ error: 'Failed to reset and insert data', details: err.message });
    }
};

export const setTraceRetentionTime = (req: Request, res: Response) => {
    const retentionTimeInSeconds = req.body.retentionTimeInSeconds;
    if (typeof retentionTimeInSeconds !== 'number' || retentionTimeInSeconds <= 0) {
        res.status(400).send({ error: 'Invalid retention time. Must be a positive number.' });
        return;
    }

    inMemoryDbSpanExporter.retentionTimeInSeconds = retentionTimeInSeconds;
    res.send({ message: `Retention time set to ${retentionTimeInSeconds} seconds.` });
};

export const getTraceRetentionTime = (req: Request, res: Response) => {
    const retentionTimeInSeconds = inMemoryDbSpanExporter.retentionTimeInSeconds || 0;
    res.send({ retentionTimeInSeconds: retentionTimeInSeconds });
};