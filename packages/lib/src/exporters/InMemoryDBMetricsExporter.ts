import { ExportResultCode } from '@opentelemetry/core';
import dataStore from '@seald-io/nedb';

export class InMemoryDBMetricsExporter {

    private _metrics: dataStore<Record<string, any>>;
    private _stopped: boolean;

    constructor() {
        this._metrics = new dataStore();
        this._stopped = false;
    }

    export(metrics: any, resultCallback: any) {
        try {
            if (!this._stopped) {
                // metrics = metrics?.scopeMetrics;
                // const cleanMetrics = metrics.map(metric => applyNesting(metric));
                this._metrics.insert(metrics, (err: any, _newDoc: any) => {
                    if (err) {
                        console.error('Insertion Error:', err);
                        return;
                    }
                });
            }
            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            console.error('Error exporting metrics\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting metrics\n' + error.message + '\n' + error.stack),
            });
        }
    }

    start() {
        this._stopped = false;
    }

    stop() {
        this._stopped = true;
    }

    isRunning() {
        return !this._stopped;
    }

    shutdown() {
        this._stopped = true;
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
}

