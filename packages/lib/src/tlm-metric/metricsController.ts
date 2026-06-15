import { Request, Response } from 'express';
import { inMemoryDbMetricExporter, mainMetricReader, customFilterMetricExporter } from '../telemetry/telemetryRegistry.js';
import { importMetricsToMemory, sanitizeMetricRecords } from './metricsService.js';
import { gzipSync } from 'zlib';

export const getMetricsStats = async (req: Request, res: Response) => {
    try {
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
        const scopeMetricsData = (req.body || {}).scopeMetrics;
        const resetData = req.query.reset === 'true';
        const format = (req.body.format || req.query.format || 'raw') as 'raw' | 'otel';

        if (!Array.isArray(scopeMetricsData)) {
            res.status(400).send({ error: 'Invalid data format. Expected array in body.scopeMetrics' });
            return;
        }

        const cleanedScopeMetrics = sanitizeMetricRecords(scopeMetricsData);

        let message = '';
        importMetricsToMemory(cleanedScopeMetrics, { reset: resetData, format });

        if (resetData) {
            message += 'Metrics Database reset. ';
        }

        message += `Inserted ${cleanedScopeMetrics.length} scopeMetrics (format: ${format}).`;
        res.send({ 
            message, 
            scopeMetricsCount: cleanedScopeMetrics.length,
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
    const retentionTimeInSeconds = (req.body || {}).retentionTimeInSeconds;
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
 * Find metrics by scope+metric queries with filters (POST /metrics/find or GET /metrics)
 * All parameters are optional:
 * - If scopeMetrics is not provided or empty, returns all metrics
 * - If startTime/endTime not provided, returns all available data
 * - format can be 'raw' (default) or 'otel'
 */
export const findMetrics = async (req: Request, res: Response) => {
    try {
        const { scopeMetrics, from, to, format } = req.body || {};

        // Validate scopeMetrics structure if provided
        if (scopeMetrics && Array.isArray(scopeMetrics)) {
            for (const query of scopeMetrics) {
                if (!query.scope || !query.scope.name || !query.descriptor || !query.descriptor.name) {
                    res.status(400).json({
                        error: 'Each query must have scope.name and descriptor.name defined'
                    });
                    return;
                }
            }
        }

        // Execute query
        const response = inMemoryDbMetricExporter.find({
            scopeMetrics: scopeMetrics && scopeMetrics.length > 0 ? scopeMetrics : undefined,
            from,
            to,
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

export const exportMetrics = (req: Request, res: Response) => {
    try {
        const response = inMemoryDbMetricExporter.find({
            format: 'raw'
        });

        const responseBody = {
            format: 'raw',
            scopeMetricsCount: response.results.length,
            scopeMetrics: response.results,
        };
        const payload = JSON.stringify(responseBody);
        const payloadSize = Buffer.byteLength(payload, 'utf-8');
        const acceptsGzip = String(req.headers['accept-encoding'] || '').includes('gzip');

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="metrics-${timestamp}.json"`);
        res.setHeader('Vary', 'Accept-Encoding');

        if (acceptsGzip && payloadSize > 64 * 1024) {
            const compressed = gzipSync(payload);
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Length', compressed.length.toString());
            res.end(compressed);
            return;
        }

        res.setHeader('Content-Length', payloadSize.toString());
        res.end(payload);
    } catch (err: any) {
        console.error('Failed to export metrics:', err);
        res.status(500).send({ error: 'Failed to export metrics', details: err.message });
    }
};

export const importMetrics = async (req: Request, res: Response) => {
    const resetData = req.query.reset === 'true';
    const body = req.body || {};
    const format = (body.format || req.query.format || 'raw') as 'raw' | 'otel';
    const importedScopeMetrics = Array.isArray(body) ? body : body.scopeMetrics;

    try {
        if (!Array.isArray(importedScopeMetrics)) {
            res.status(400).send({ error: 'Invalid data format. Expected an array in request body or body.scopeMetrics.' });
            return;
        }

        const cleanedMetrics = sanitizeMetricRecords(importedScopeMetrics);
        importMetricsToMemory(cleanedMetrics, { reset: resetData, format });

        let message = '';
        if (resetData) {
            message += 'Metrics Database reset. ';
        }

        message += `Imported ${cleanedMetrics.length} metrics (format: ${format}).`;
        res.send({ message, ImportedMetricsCount: cleanedMetrics.length, format });
    } catch (err: any) {
        console.error('Import failed:', err);
        res.status(400).send({ error: 'Failed to import metrics', details: err.message });
    }
};

export const getExportInterval = (req: Request, res: Response) => {
    if (!mainMetricReader) {
        res.status(400).send({ error: 'Metric reader not initialized' });
        return;
    }
    res.send({ exportIntervalMillis: mainMetricReader.getInterval() });
};

export const setExportInterval = (req: Request, res: Response) => {
    if (!mainMetricReader) {
        res.status(400).send({ error: 'Metric reader not initialized' });
        return;
    }
    const exportIntervalMillis = (req.body || {}).exportIntervalMillis;
    if (typeof exportIntervalMillis !== 'number' || exportIntervalMillis <= 0) {
        res.status(400).send({ error: 'Invalid export interval. Must be a positive number.' });
        return;
    }
    mainMetricReader.setInterval(exportIntervalMillis);
    res.send({ message: `Export interval set to ${exportIntervalMillis} milliseconds.`, exportIntervalMillis });
};

export const getIgnoredMetrics = (req: Request, res: Response) => {
    if (!customFilterMetricExporter) {
        res.status(400).send({ error: 'Filter exporter not initialized' });
        return;
    }
    res.send({ ignoredMetrics: customFilterMetricExporter.getIgnoredMetrics() });
};

export const addIgnoredMetrics = (req: Request, res: Response) => {
    if (!customFilterMetricExporter) {
        res.status(400).send({ error: 'Filter exporter not initialized' });
        return;
    }
    const { metric, metrics } = req.body || {};
    if (metric) {
        customFilterMetricExporter.addIgnoredMetric(metric);
    }
    if (Array.isArray(metrics)) {
        customFilterMetricExporter.addIgnoredMetrics(metrics);
    }
    if (!metric && !Array.isArray(metrics)) {
        res.status(400).send({ error: 'Provide a metric or metrics array in the body' });
        return;
    }
    res.send({
        message: 'Metrics added to ignore list',
        ignoredMetrics: customFilterMetricExporter.getIgnoredMetrics()
    });
};

export const removeIgnoredMetrics = (req: Request, res: Response) => {
    if (!customFilterMetricExporter) {
        res.status(400).send({ error: 'Filter exporter not initialized' });
        return;
    }
    const metric = (req.body || {}).metric || (req.query || {}).metric;
    if (metric) {
        customFilterMetricExporter.removeIgnoredMetric(metric as string);
        res.send({
            message: `Metric '${metric}' removed from ignore list`,
            ignoredMetrics: customFilterMetricExporter.getIgnoredMetrics()
        });
    } else {
        customFilterMetricExporter.clearIgnoredMetrics();
        res.send({
            message: 'All metrics cleared from ignore list',
            ignoredMetrics: []
        });
    }
};
