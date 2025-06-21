import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import logger from '../utils/logger.js';
import { globalOasTlmConfig } from '../config.js';
import { HostMetrics } from '@opentelemetry/host-metrics';

export function initializeMetrics(resource: any) {
    const metricReader = new PeriodicExportingMetricReader({
        // exporter: new ConsoleMetricExporter(),
        exporter: globalOasTlmConfig.metricsExporter,
        exportIntervalMillis: globalOasTlmConfig.metricsExporterInterval
    });

    const meterProvider = new MeterProvider({
        resource: resource,
        readers: [metricReader],
    });

    const hostMetrics = new HostMetrics({ meterProvider });
    hostMetrics.start();

    logger.info('✅ OpenTelemetry Metrics initialized.');
}
