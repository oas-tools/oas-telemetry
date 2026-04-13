import { ScopeMetrics } from '@opentelemetry/sdk-metrics';
import { inMemoryDbMetricExporter } from '../telemetry/telemetryRegistry.js';

export type MetricImportFormat = 'raw' | 'otel';

export function sanitizeMetricRecords(records: any[]): any[] {
    return records.map((record: any) => {
        const { _id, ...rest } = record;
        return rest;
    });
}

export function importMetricsToMemory(records: any[], options?: { reset?: boolean; format?: MetricImportFormat }): number {
    if (options?.reset) {
        inMemoryDbMetricExporter.reset();
    }

    if (!records.length) {
        return 0;
    }

    if ((options?.format || 'raw') === 'otel') {
        inMemoryDbMetricExporter.insertOtel(records as ScopeMetrics[]);
    } else {
        inMemoryDbMetricExporter.insertRaw(records);
    }

    return records.length;
}
