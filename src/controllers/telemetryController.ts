import v8 from 'v8';
import { globalOasTlmConfig } from '../config.js';


export const startTelemetry = (req, res) => {
    globalOasTlmConfig.dynamicExporter.exporter.start();
    res.send('Telemetry started');
}

export const stopTelemetry = (req, res) => {
    globalOasTlmConfig.dynamicExporter.exporter.stop();
    res.send('Telemetry stopped');
}

export const statusTelemetry = (req, res) => {
    const isRunning = globalOasTlmConfig.dynamicExporter.exporter.isRunning() || false;
    res.send({ active: isRunning });
}

export const resetTelemetry = (req, res) => {
    globalOasTlmConfig.dynamicExporter.exporter.reset();
    res.send('Telemetry reset');
}

export const listTelemetry = async (req, res) => {
    try {
        const spans = await globalOasTlmConfig.dynamicExporter.exporter.getFinishedSpans();
        res.send({ spansCount: spans.length, spans: spans });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list telemetry data' });
    }
}

export const heapStats = (req, res) => {
    var heapStats = v8.getHeapStatistics();
    var roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
        map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
        return map;
    }, {});
    roundedHeapStats['units'] = 'MB';
    res.send(roundedHeapStats);
}

export const findTelemetry = (req, res) => {
    const body = req.body;
    const search = body?.search ? body.search : {};
    if (body?.flags?.containsRegex) {
        try {
            body.config?.regexIds?.forEach(regexId => {
                if(search[regexId]) search[regexId] = new RegExp(search[regexId]);
            });
        } catch (e) {
            console.error(e);
            res.status(404).send({ spansCount: 0, spans: [], error: e });
            return;
        }
    }
        globalOasTlmConfig.dynamicExporter.exporter.find(search,(err, docs) => {
            if (err) {
                console.error(err);
                res.status(404).send({ spansCount: 0, spans: [], error: err });
                return;
            }
            const spans = docs;
            res.send({ spansCount: spans.length, spans: spans });
        });
    
}