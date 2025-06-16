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
                this._metrics.insert(metrics, (err, newDoc) => {
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

function convertToNestedObject(obj: any) {
    const result = {};

    for (const key in obj) {
        const keys = key.split('.');
        let temp: any = result;

        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];

            if (i === keys.length - 1) {
                // Last key, set the value
                temp[currentKey] = obj[key];
            } else {
                // Intermediate key, ensure the object exists
                if (!temp[currentKey]) {
                    temp[currentKey] = {};
                }
                temp = temp[currentKey];
            }
        }
    }

    return result;
}

/**
 * Applies nesting to all dot-separated keys within an object.
 * 
 * @param {Object} obj - The object to apply nesting to.
 * @returns {Object} - The transformed object with nested structures.
 */
function applyNesting(obj: any) {


    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = applyNesting(obj[key]);
        }
    }


    return obj;
}

