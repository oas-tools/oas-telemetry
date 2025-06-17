import { Request, Response } from 'express';
import { globalOasTlmConfig } from '../config.js';

export const listMetrics = async (req: Request, res: Response) => {
    try {
        const metrics = await globalOasTlmConfig.metricsExporter.getFinishedMetrics();
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
