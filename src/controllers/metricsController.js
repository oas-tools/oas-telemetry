import { globalOasTlmConfig } from '../config.js';

export const listMetrics = async (req, res) => {
    try {
        const metrics = await globalOasTlmConfig.metricsExporter.getFinishedMetrics();
        res.send({ metricsCount: metrics.length, metrics: metrics });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list metrics data' });
    }
}

export const findMetrics = (req, res) => {
    const body = req.body;
    const search = body?.search ? body.search : {};
    globalOasTlmConfig.metricsExporter.find(search, (err, docs) => {
        if (err) {
            console.error(err);
            res.status(404).send({ metricsCount: 0, metrics: [], error: err });
            return;
        }
        const metrics = docs;
        res.send({ metricsCount: metrics.length, metrics: metrics });
    });
}

export const resetMetrics = (req, res) => {
    globalOasTlmConfig.metricsExporter.reset();
    res.send('Metrics reset');
}
