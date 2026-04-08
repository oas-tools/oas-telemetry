import { Request, Response } from 'express';
import { InMemoryDbSpanExporter } from '../telemetry/custom-implementations/exporters/InMemoryDbSpanExporter.js';
import { inMemoryDbSpanExporter } from '../telemetry/telemetryRegistry.js';
import { convertRegexRecursively } from '../utils/regexUtils.js';

/**
 * Parse import data from NDJSON or JSON format
 * @param contentType - Content-Type header
 * @param body - Request body (string for NDJSON, object for JSON)
 * @returns Array of span objects
 */
function parseImportData(body: any): any[] {
    if (typeof body !== 'string') {
        throw new Error('Import must be NDJSON format (plain text with one JSON object per line)');
    }

    const lines = body.split('\n').filter((line: string) => line.trim());
    return lines.map((line: string, index: number) => {
        try {
            return JSON.parse(line);
        } catch {
            console.error(`Failed to parse NDJSON line ${index + 1}: ${line}`);
            throw new Error(`Invalid JSON on line ${index + 1}`);
        }
    });
}

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

export const importTraces = async (req: Request, res: Response) => {
    const resetData = req.query.reset === 'true';

    try {
        // Parse NDJSON format
        const spans = parseImportData(req.body);

        if (spans.length === 0) {
            res.status(400).send({ error: 'No valid traces found in import data' });
            return;
        }

        const cleanedTraces = spans.map((trace: any) => {
             
            const { _id, ...rest } = trace; // Remove _id if it exists
            return rest;
        });

        let message = '';
        if (resetData) {
            (inMemoryDbSpanExporter as InMemoryDbSpanExporter).reset();
            message += 'Traces Database reset. ';
        }

        await new Promise((resolve, reject) => {
            (inMemoryDbSpanExporter as InMemoryDbSpanExporter).insert(cleanedTraces, (err: any, newDocs: any[]) => {
                if (err) {
                    console.error('Error importing traces:', err);
                    return reject(err);
                }
                resolve(newDocs);
            });
        });

        message += `Imported ${cleanedTraces.length} traces.`;
        res.send({ message, ImportedTracesCount: cleanedTraces.length });
    } catch (err: any) {
        console.error('Import failed:', err);
        res.status(400).send({ error: 'Failed to import traces', details: err.message });
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

export const exportTraces = async (req: Request, res: Response) => {
    try {
        const findConfig = {
            query: {},
            sortOrder: { startTime: -1 }
        };
        const docs = await inMemoryDbSpanExporter.find(findConfig);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Content-Disposition', `attachment; filename="traces-${timestamp}.ndjson"`);
        res.setHeader('Transfer-Encoding', 'chunked');

        // Stream as NDJSON (one JSON object per line)
        docs.forEach(doc => {
            res.write(JSON.stringify(doc) + '\n');
        });
        res.end();
    } catch (err: any) {
        console.error('Failed to export traces:', err);
        res.status(500).send({ error: 'Failed to export traces', details: err.message });
    }
};