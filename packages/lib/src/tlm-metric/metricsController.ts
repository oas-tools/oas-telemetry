import { Request, Response } from 'express';
import { inMemoryDbMetricExporter } from '../telemetry/telemetryRegistry.js';

/**
 * Parse NDJSON import data
 * Each line must be a valid JSON object
 * @param body - Request body (raw string)
 * @returns Array of metric objects
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
        const { scopeMetrics, from, to, format } = req.body;

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

/**
 * Check data consistency between rawDataDB and queried data
 * Compares raw exports with findMetrics(format=otel) without filters
 */
export const checkMetricsConsistency = async (req: Request, res: Response) => {
    try {
        // Get raw exported data
        const rawData = inMemoryDbMetricExporter.rawDataDB;

        // Query all data with OTEL format
        const response = inMemoryDbMetricExporter.find({
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

export const exportMetrics = (req: Request, res: Response) => {
    try {
        const ndjsonData = inMemoryDbMetricExporter.exportToNDJSON();

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Content-Disposition', `attachment; filename="metrics-${timestamp}.ndjson"`);
        res.setHeader('Transfer-Encoding', 'chunked');

        res.write(ndjsonData);
        res.end();
    } catch (err: any) {
        console.error('Failed to export metrics:', err);
        res.status(500).send({ error: 'Failed to export metrics', details: err.message });
    }
};

export const importMetrics = async (req: Request, res: Response) => {
    const resetData = req.query.reset === 'true';
    const format = (req.query.format || 'raw') as 'raw' | 'otel';

    try {
        // Parse NDJSON format
        const metricsArray = parseImportData(req.body);

        if (metricsArray.length === 0) {
            res.status(400).send({ error: 'No valid metrics found in import data' });
            return;
        }

        let message = '';
        if (resetData) {
            inMemoryDbMetricExporter.reset();
            message += 'Metrics Database reset. ';
        }

        // Use the same insert logic as insertMetricsToDb, respecting raw vs otel format
        if (format === 'otel') {
            inMemoryDbMetricExporter.insertOtel(metricsArray);
        } else {
            inMemoryDbMetricExporter.insertRaw(metricsArray);
        }

        message += `Imported ${metricsArray.length} metrics (format: ${format}).`;
        res.send({ message, ImportedMetricsCount: metricsArray.length, format });
    } catch (err: any) {
        console.error('Import failed:', err);
        res.status(400).send({ error: 'Failed to import metrics', details: err.message });
    }
};
