import { globalOasTlmConfig } from '../config.js';
import { Request, Response } from 'express';


export const startTelemetry = (req: Request, res: Response) => {
    globalOasTlmConfig.dynamicSpanExporter.exporter.start();
    res.send('Telemetry started');
};

export const stopTelemetry = (req: Request, res: Response) => {
    globalOasTlmConfig.dynamicSpanExporter.exporter.stop();
    res.send('Telemetry stopped');
};

export const statusTelemetry = (req: Request, res: Response) => {
    const isRunning = globalOasTlmConfig.dynamicSpanExporter.exporter.isRunning() || false;
    res.send({ active: isRunning });
};

export const resetTelemetry = (req: Request, res: Response) => {
    globalOasTlmConfig.dynamicSpanExporter.exporter.reset();
    res.send('Telemetry reset');
};

export const listTelemetry = async (req: Request, res: Response) => {
    try {
        const spans = await globalOasTlmConfig.dynamicSpanExporter.exporter.getFinishedSpans();
        res.send({ spansCount: spans.length, spans: spans });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list telemetry data' });
    }
};

export const findTelemetry = (req: Request, res: Response) => {
    const body = req.body;
    const search = body?.search ? body.search : {};
    if (body?.flags?.containsRegex) {
        try {
            //@ts-expect-error yes
            body.config?.regexIds?.forEach(regexId => {
                if (search[regexId]) search[regexId] = new RegExp(search[regexId]);
            });
        } catch (e) {
            console.error(e);
            res.status(404).send({ spansCount: 0, spans: [], error: e });
            return;
        }
    }
    globalOasTlmConfig.dynamicSpanExporter.exporter.find(search, (err: any, docs: any) => {
        if (err) {
            console.error(err);
            res.status(404).send({ spansCount: 0, spans: [], error: err });
            return;
        }
        const spans = docs;
        res.send({ spansCount: spans.length, spans: spans });
    });
};