import { MetricReader, PushMetricExporter, MetricProducer, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { ExportResultCode, globalErrorHandler, internal } from '@opentelemetry/core';
import { diag } from '@opentelemetry/api';

export interface DynamicPeriodicMetricReaderOptions {
    exporter: PushMetricExporter;
    exportIntervalMillis?: number;
    exportTimeoutMillis?: number;
    metricProducers?: MetricProducer[];
}

export class DynamicPeriodicMetricReader extends MetricReader {
    private _interval?: NodeJS.Timeout | number;
    private _exporter: PushMetricExporter;
    private _exportInterval: number;
    private _exportTimeout: number;

    constructor(options: DynamicPeriodicMetricReaderOptions) {
        const { exporter, exportIntervalMillis = 60000, metricProducers } = options;
        const exportTimeoutMillis = options.exportTimeoutMillis ?? 30000;
        super({
            aggregationSelector: exporter.selectAggregation?.bind(exporter),
            aggregationTemporalitySelector: exporter.selectAggregationTemporality?.bind(exporter),
            metricProducers,
        });
        if (exportIntervalMillis <= 0) {
            throw new Error('exportIntervalMillis must be greater than 0');
        }
        if (exportTimeoutMillis <= 0) {
            throw new Error('exportTimeoutMillis must be greater than 0');
        }
        this._exportInterval = exportIntervalMillis;
        this._exportTimeout = exportTimeoutMillis;
        this._exporter = exporter;
    }

    async _runOnce(): Promise<void> {
        try {
            // Promise-based timeout wrapper to mirror callWithTimeout
            await Promise.race([
                this._doRun(),
                new Promise<void>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), this._exportTimeout)
                )
            ]);
        } catch (err: any) {
            if (err.message === 'Timeout') {
                diag.error(`Export took longer than ${this._exportTimeout} milliseconds and timed out.`);
                return;
            }
            globalErrorHandler(err);
        }
    }

    async _doRun(): Promise<void> {
        const { resourceMetrics, errors } = await this.collect({
            timeoutMillis: this._exportTimeout,
        });
        if (errors.length > 0) {
            diag.error('DynamicPeriodicMetricReader: metrics collection errors', ...errors);
        }
        if (resourceMetrics.resource.asyncAttributesPending) {
            try {
                await resourceMetrics.resource.waitForAsyncAttributes?.();
            } catch (e: any) {
                diag.debug('Error while resolving async portion of resource: ', e);
                globalErrorHandler(e);
            }
        }
        if (resourceMetrics.scopeMetrics.length === 0) {
            return;
        }

        // Use the official internal._export helper
        const result = await internal._export(this._exporter, resourceMetrics);
        if (result.code !== ExportResultCode.SUCCESS) {
            throw new Error(`DynamicPeriodicMetricReader: metrics export failed (error ${result.error})`);
        }
    }

    onInitialized(): void {
        this._startTimer();
    }

    private _startTimer() {
        this._stopTimer();
        this._interval = setInterval(() => {
            void this._runOnce();
        }, this._exportInterval);
        if (this._interval && typeof this._interval !== 'number') {
            this._interval.unref();
        }
    }

    private _stopTimer() {
        if (this._interval) {
            clearInterval(this._interval as any);
            this._interval = undefined;
        }
    }

    async onForceFlush(): Promise<void> {
        await this._runOnce();
        await this._exporter.forceFlush?.();
    }

    async onShutdown(): Promise<void> {
        this._stopTimer();
        await this.onForceFlush();
        await this._exporter.shutdown();
    }

    getInterval(): number {
        return this._exportInterval;
    }

    setInterval(exportIntervalMillis: number): void {
        if (exportIntervalMillis <= 0) {
            throw new Error('exportIntervalMillis must be greater than 0');
        }
        this._exportInterval = exportIntervalMillis;
        this._startTimer();
    }
}
