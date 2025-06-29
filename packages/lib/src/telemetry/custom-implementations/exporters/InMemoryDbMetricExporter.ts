import { ExportResultCode } from '@opentelemetry/core';
import dataStore from '@seald-io/nedb';
import { applyNesting } from '../utils/circular.js';
import { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { Enabler } from '../Wrappers.js';
import logger from '../../../utils/logger.js';

export class InMemoryDbMetricExporter extends Enabler implements PushMetricExporter{

    private _metrics: dataStore<Record<string, any>>;
    private _retentionTimeInSeconds: number;

    constructor(retentionTimeInSeconds: number = 3600) {
        super();
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        this._metrics = new dataStore({ timestampData: true });
        this._metrics.ensureIndex({ fieldName: 'createdAt' });
        this._startCleanupJob();
    }

    export(metrics: ResourceMetrics, resultCallback: any) {
        try {
            if (this.isEnabled()) {
                const scopeMetrics = metrics?.scopeMetrics;
                const cleanMetrics = applyNesting(scopeMetrics);
                this._metrics.insert(cleanMetrics, (err: any, _newDoc: any) => {
                    if (err) {
                        logger.error('Insertion Error:', err);
                        return;
                    }
                });
            }
            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            logger.error('Error exporting metrics\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting metrics\n' + error.message + '\n' + error.stack),
            });
        }
    }


    shutdown() {
        this._enabled = false;
        this._metrics = new dataStore();
        return this.forceFlush();
    }

    forceFlush() {
        return Promise.resolve();
    }

    find(search: any, callback: any) {
        this._metrics.find(search, callback);
    }

    reset() {
        this._metrics = new dataStore();
    }

    getFinishedMetrics() {
        return this._metrics.getAllData();
    }

    /**
     * Inserts metrics into the in-memory database.
     * @param metrics - The metrics to insert.
     * @param callback - The callback to execute after insertion.
     */
    insert(metrics: any[], callback: (err: any, newDocs: any[]) => void): void {
        this._metrics.insert(metrics, callback);
    }

    public set retentionTimeInSeconds(retentionTimeInSeconds: number) {
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        logger.info(`InMemoryDbMetricExporter retention time set to ${this._retentionTimeInSeconds} seconds`);
    }

    private _startCleanupJob() {
        const interval = 1000;

        setInterval(() => {
            const expirationDate = new Date(Date.now() - this._retentionTimeInSeconds * 1000);

            this._metrics.remove(
                { createdAt: { $lt: expirationDate } },
                { multi: true },
                (err, numRemoved) => {
                    if (err) {
                        logger.error('Error in TTL cleanup:', err);
                    } else if (numRemoved > 0) {
                        logger.debug(`TTL cleanup: removed ${numRemoved} expired metrics`);
                    }
                }
            );
        }, interval);
    }
}

