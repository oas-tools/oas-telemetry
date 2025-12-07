import { Request, Response } from 'express';
import { inMemoryDbMetricExporter } from '../telemetry/telemetryRegistry.js';

export const listMetrics = async (req: Request, res: Response) => {
    try {
        // Support query params: ?format=raw&metricKeys=X,Y,Z&instrumentation=Y&startTimeNs=Z&endTimeNs=W&labels={...}
        const format = (req.query.format as 'otel' | 'raw') || 'raw'; // Default to raw for efficiency
        const metricKeyParam = req.query.metricKeys as string | undefined;
        // Support multiple metric keys separated by comma
        const metricKeys = metricKeyParam ? metricKeyParam.split(',').map(n => n.trim()) : undefined;
        const instrumentation = req.query.instrumentation as string | undefined;
        const startTimeNs = req.query.startTimeNs ? Number(req.query.startTimeNs) : undefined;
        const endTimeNs = req.query.endTimeNs ? Number(req.query.endTimeNs) : undefined;
        let labels: Record<string, any> | undefined;
        
        if (req.query.labels) {
            try {
                labels = JSON.parse(req.query.labels as string);
            } catch (e) {
                res.status(400).send({ error: 'Invalid labels JSON format' });
                return;
            }
        }

        const query: any = { format };
        if (metricKeys) query.metricKeys = metricKeys;
        if (instrumentation) query.instrumentation = instrumentation;
        if (startTimeNs) query.startTimeNs = startTimeNs;
        if (endTimeNs) query.endTimeNs = endTimeNs;
        if (labels) query.labels = labels;

        // Use find() with query options if filters are present
        if (metricKeys || instrumentation || startTimeNs || endTimeNs || labels) {
            inMemoryDbMetricExporter.find(query, (err: any, docs: any) => {
                if (err) {
                    console.error(err);
                    res.status(500).send({ error: err.message || 'Failed to find metrics' });
                    return;
                }
                res.send({ metricsCount: docs.length, metrics: docs, format });
            });
        } else {
            // No filters, get all metrics
            const data = inMemoryDbMetricExporter.getFinishedMetrics(format);
            res.send({ metricsCount: data.result.length, metrics: data.result, format: data.format });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to list metrics data' });
    }
}

export const getMetricsStats = async (req: Request, res: Response) => {
    try {
        res.send(inMemoryDbMetricExporter.rawDataDB);
        return;
        const stats = inMemoryDbMetricExporter.getStats();
        res.send(stats);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to get metrics stats' });
    }
}

// Removed findMetrics - use listMetrics with query params instead

export const resetMetrics = (req: Request, res: Response) => {
    inMemoryDbMetricExporter.reset();
    res.send('Metrics reset');
}

export const insertMetricsToDb = async (req: Request, res: Response) => {
    const jsonContent = req.body.metrics;
    const resetData = req.query.reset === 'true';
    const format = (req.body.format || req.query.format || 'raw') as 'raw' | 'otel';
    
    if (!Array.isArray(jsonContent)) {
        res.status(400).send({ error: 'Invalid data format. Expected array in body.metrics' });
        return;
    }

    try {
        let message = '';
        if (resetData) {
            inMemoryDbMetricExporter.reset();
            message += 'Metrics Database reset. ';
        }

        // Convert to OTEL internal format based on input format
        let scopeMetrics: any[];
        
        if (format === 'raw') {
            // Raw format: [{metricKey, metadata, series: [{labels, samples}]}]
            // Convert to OTEL internal format
            scopeMetrics = jsonContent.map((rawMetric: any) => {
                const { metricKey, metadata, series } = rawMetric;
                const [instrumentation, name] = metricKey.split(':');
                
                // Convert series to dataPoints
                const dataPoints: any[] = [];
                series.forEach((s: any) => {
                    s.samples.forEach((sample: any) => {
                        const timeNs = sample.timestamp;
                        const startSec = Math.floor(timeNs / 1_000_000_000);
                        const startNano = timeNs % 1_000_000_000;
                        
                        dataPoints.push({
                            attributes: s.labels,
                            startTime: [startSec, startNano],
                            endTime: [startSec, startNano],
                            value: sample.value
                        });
                    });
                });
                
                return {
                    scope: { name: instrumentation, version: metadata.scope?.version },
                    metrics: [{
                        descriptor: metadata.descriptor || { name, type: 'unknown' },
                        aggregationTemporality: metadata.aggregationTemporality,
                        dataPointType: metadata.dataPointType,
                        isMonotonic: metadata.isMonotonic,
                        dataPoints
                    }]
                };
            });
        } else {
            // OTEL format: already in scopeMetrics format
            scopeMetrics = jsonContent.map((metric: any) => {
                const { _id, ...rest } = metric;
                return rest;
            });
        }

        await new Promise((resolve, reject) => {
            inMemoryDbMetricExporter.insert(scopeMetrics, (err: any, newDocs: any[]) => {
                if (err) {
                    console.error('Error inserting metrics:', err);
                    return reject(err);
                }
                resolve(newDocs);
            });
        });

        message += `Inserted ${jsonContent.length} metrics (format: ${format}).`;
        res.send({ message, InsertedMetricsCount: jsonContent.length, format });
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
    const retentionTimeInSeconds = req.body.retentionTimeInSeconds;
    if (typeof retentionTimeInSeconds !== 'number' || retentionTimeInSeconds <= 0) {
        res.status(400).send({ error: 'Invalid retention time. Must be a positive number.' });
        return;
    }

    inMemoryDbMetricExporter.retentionTimeInSeconds = retentionTimeInSeconds;
    res.send({ message: `Retention time set to ${retentionTimeInSeconds} seconds.` });
};

export const getMetricRetentionTime = (req: Request, res: Response) => {
    const retentionTimeInSeconds = inMemoryDbMetricExporter.retentionTimeInSeconds || 0;
    res.send({ retentionTimeInSeconds: retentionTimeInSeconds });
};

/**
 * Get list of unique metric names (optimized endpoint)
 * Optional query param: ?instrumentation=X to filter by instrumentation
 */
export const getMetricNames = async (req: Request, res: Response) => {
    try {
        const instrumentation = req.query.instrumentation as string | undefined;
        const names = inMemoryDbMetricExporter.getMetricNames(instrumentation);
        res.send({ names });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to get metric names' });
    }
};

/**
 * Get list of unique instrumentations
 */
export const getInstrumentations = async (req: Request, res: Response) => {
    try {
        const instrumentations = inMemoryDbMetricExporter.getInstrumentations();
        res.send({ instrumentations });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to get instrumentations' });
    }
};

/**
 * Get list of unique label keys (optimized, doesn't load data)
 */
export const getLabelKeys = async (req: Request, res: Response) => {
    try {
        const labelKeys = inMemoryDbMetricExporter.getLabelKeys();
        res.send({ labelKeys });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to get label keys' });
    }
};
