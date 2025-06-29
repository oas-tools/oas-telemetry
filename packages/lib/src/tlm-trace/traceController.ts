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

export const findTraces = (req: Request, res: Response) => {
    const body = req.body;
    const query = body?.query ? body.query : {};

    let processedQuery;
    try {
        processedQuery = convertRegexRecursively(query);
    } catch (error: any) {
        console.error(error.message);
        res.status(400).send({ error: error.message });
        return; // Exit if invalid regex was encountered
    }

    inMemoryDbSpanExporter.find(processedQuery, (err: any, docs: any) => {
        if (err) {
            console.error(err);
            res.status(404).send({ spansCount: 0, spans: [], error: err.message });
            return; // Exit the function to prevent further execution
        }
        const spans = docs;
        res.send({ spansCount: spans.length, spans: spans });
    });
};

export const insertTracesToDb = async (req: Request, res: Response) => {
    const jsonContent = req.body.spans;
    const resetData = req.query.reset === 'true';
    if (!Array.isArray(jsonContent)) {
        res.status(400).send({ error: 'Invalid data format. Expected an array of JSON objects.' });
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

export const setRetentionTimeTraces = (req: Request, res: Response) => {
    const retentionTime = req.body.retentionTime;
    if (typeof retentionTime !== 'number' || retentionTime <= 0) {
        res.status(400).send({ error: 'Invalid retention time. Must be a positive number.' });
        return;
    }

    inMemoryDbSpanExporter.retentionTimeInSeconds = retentionTime;
    res.send({ message: `Retention time set to ${retentionTime} seconds.` });
};