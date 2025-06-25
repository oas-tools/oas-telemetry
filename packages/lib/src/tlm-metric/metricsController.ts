import { Request, Response } from 'express';
import { globalOasTlmConfig } from '../config.js';

export const listMetrics = async (req: Request, res: Response) => {
    try {
        const metrics = globalOasTlmConfig.metricsExporter.getFinishedMetrics();
        res.send({ metricsCount: metrics.length, metrics: metrics });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list metrics data' });
    }
}

export const findMetrics = (req: Request, res: Response) => {
    const body = req.body;
    const search = body?.search ? body.search : {};
    globalOasTlmConfig.metricsExporter.find(search, (err: any, docs: any) => {
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
    globalOasTlmConfig.metricsExporter.reset();
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
            globalOasTlmConfig.metricsExporter.reset();
            message += 'Metrics Database reset. ';
        }

        await new Promise((resolve, reject) => {
            globalOasTlmConfig.metricsExporter.insert(cleanedMetrics, (err: any, newDocs: any[]) => {
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
    globalOasTlmConfig.metricsExporter.start();
    res.send('Metrics collection started');
};

export const stopMetrics = (req: Request, res: Response) => {
    globalOasTlmConfig.metricsExporter.stop();
    res.send('Metrics collection stopped');
};

export const statusMetrics = (req: Request, res: Response) => {
    const isRunning = globalOasTlmConfig.metricsExporter.isRunning() || false;
    res.send({ active: isRunning });
};
