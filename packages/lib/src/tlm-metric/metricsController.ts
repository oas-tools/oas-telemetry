import { Request, Response } from 'express';
import { inMemoryDbMetricExporter } from '../telemetry/telemetryRegistry.js';
import { convertRegexRecursively } from '../utils/regexUtils.js';

export const listMetrics = async (req: Request, res: Response) => {
    try {
        const metrics = inMemoryDbMetricExporter.getFinishedMetrics();
        res.send({ metricsCount: metrics.length, metrics: metrics });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list metrics data' });
    }
}

export const findMetrics = (req: Request, res: Response) => {
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

    inMemoryDbMetricExporter.find(processedQuery, (err: any, docs: any) => {
        if (err) {
            console.error(err);
            res.status(404).send({ metricsCount: 0, metrics: [], error: err });
            return;
        }
        const metrics = docs;
        res.send({ metricsCount: metrics.length, metrics: metrics });
    });
}

export const resetMetrics = (req: Request, res: Response) => {
    inMemoryDbMetricExporter.reset();
    res.send('Metrics reset');
}

export const insertMetricsToDb = async (req: Request, res: Response) => {
    const jsonContent = req.body.metrics;
    const resetData = req.query.reset === 'true';
    if (!Array.isArray(jsonContent)) {
        res.status(400).send({ error: 'Invalid data format. Expected an array of JSON objects.' });
        return;
    }

    const cleanedMetrics = jsonContent.map((metric: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = metric; // Remove _id if it exists
        return rest; // Return the cleaned metric object
    });

    try {
        let message = '';
        if (resetData) {
            inMemoryDbMetricExporter.reset();
            message += 'Metrics Database reset. ';
        }

        await new Promise((resolve, reject) => {
            inMemoryDbMetricExporter.insert(cleanedMetrics, (err: any, newDocs: any[]) => {
                if (err) {
                    console.error('Error inserting metrics:', err);
                    return reject(err);
                }
                resolve(newDocs);
            });
        });

        message += `Inserted ${cleanedMetrics.length} metrics.`;
        res.send({ message, InsertedMetricsCount: cleanedMetrics.length });
    } catch (err: any) {
        console.error(err);
        res.status(500).send({ error: 'Failed to reset and insert data', details: err.message });
    }
};

export const startMetrics = (req: Request, res: Response) => {
    inMemoryDbMetricExporter.enable();
    res.send('Metrics collection started');
};

export const stopMetrics = (req: Request, res: Response) => {
    inMemoryDbMetricExporter.disable();
    res.send('Metrics collection stopped');
};

export const statusMetrics = (req: Request, res: Response) => {
    const isRunning = inMemoryDbMetricExporter.isEnabled() || false;
    res.send({ active: isRunning });
};

export const setMetricRetentionTime = (req: Request, res: Response) => {
    const retentionTime = req.body.retentionTime;
    if (typeof retentionTime !== 'number' || retentionTime <= 0) {
        res.status(400).send({ error: 'Invalid retention time. Must be a positive number.' });
        return;
    }

    inMemoryDbMetricExporter.retentionTimeInSeconds = retentionTime;
    res.send({ message: `Retention time set to ${retentionTime} seconds.` });
};

export const getMetricRetentionTime = (req: Request, res: Response) => {
    const retentionTime = inMemoryDbMetricExporter.retentionTimeInSeconds || 0;
    res.send({ retentionTimeInSeconds: retentionTime });
};
