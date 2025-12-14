import { Request, Response } from 'express';
import { inMemoryDbMetricExporter } from '../telemetry/telemetryRegistry.js';

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


export const resetMetrics = (req: Request, res: Response) => {
    inMemoryDbMetricExporter.reset();
    res.send('Metrics reset');
}

export const insertMetricsToDb = async (req: Request, res: Response) => {
    try {
        const scopeMetricsData = req.body.scopeMetrics;
        const resetData = req.query.reset === 'true';
        const format = (req.body.format || req.query.format || 'raw') as 'raw' | 'otel';

        if (!Array.isArray(scopeMetricsData)) {
            res.status(400).send({ error: 'Invalid data format. Expected array in body.scopeMetrics' });
            return;
        }

        let message = '';
        if (resetData) {
            inMemoryDbMetricExporter.reset();
            message += 'Metrics Database reset. ';
        }

        // Store samples
        if(format === 'otel') inMemoryDbMetricExporter.insertOtel(scopeMetricsData);
        else inMemoryDbMetricExporter.insertRaw(scopeMetricsData);

        message += `Inserted ${scopeMetricsData.length} scopeMetrics (format: ${format}).`;
        res.send({ 
            message, 
            scopeMetricsCount: scopeMetricsData.length,
            format 
        });
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
 * Find metrics by scope+metric queries with filters (POST /metrics/find)
 * All parameters are optional:
 * - If scopeMetrics is not provided or empty, returns all metrics
 * - If startTime/endTime not provided, returns all available data
 * - format can be 'raw' (default) or 'otel'
 */
export const findMetrics = async (req: Request, res: Response) => {
    try {
        const { scopeMetrics, startTime, endTime, format } = req.body;

        // Validate scopeMetrics structure if provided
        if (scopeMetrics && Array.isArray(scopeMetrics)) {
            for (const query of scopeMetrics) {
                if (!query.metricId || !query.metricId.scope || !query.metricId.scope.name || !query.metricId.metricName) {
                    res.status(400).json({
                        error: 'Each query must have metricId.scope.name and metricId.metricName'
                    });
                    return;
                }
            }
        }

        // Execute query
        const response = inMemoryDbMetricExporter.findMetrics({
            scopeMetrics: scopeMetrics && scopeMetrics.length > 0 ? scopeMetrics : undefined,
            startTime,
            endTime,
            format: format || 'raw'
        });

        res.json({
            format: format || 'raw',
            scopeMetricsCount: response.results.length,
            scopeMetrics: response.results,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to find metrics' });
    }
};

/**
 * Get all scope-metric combinations with metadata (no data)
 */
export const getScopeMetricsInfo = async (req: Request, res: Response) => {
    try {
        const info = inMemoryDbMetricExporter.getScopeMetricsInfo();
        res.json({ scopeMetrics: info });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get scope-metrics info' });
    }
};

/**
 * Check data consistency between rawDataDB and queried data
 * Compares raw exports with findMetrics(format=otel) without filters
 */
export const checkMetricsConsistency = async (req: Request, res: Response) => {
    try {
        // Get raw exported data
        const rawData = inMemoryDbMetricExporter.rawDataDB;

        // Query all data with OTEL format
        const response = inMemoryDbMetricExporter.findMetrics({
            format: 'otel'
        });

        const queriedData = response.results;

        // Compare counts
        const statusCheck = rawData.length === queriedData.length;

        res.json({
            statusCheck,
            raw: rawData,
            queried: queriedData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to check metrics consistency' });
    }
};
