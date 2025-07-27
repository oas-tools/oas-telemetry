import { ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import dataStore from '@seald-io/nedb';
import logger from '../../../utils/logger.js';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';
import { Enabler } from '../wrappers.js';


export class InMemoryDbSpanExporter extends Enabler implements SpanExporter {
    private _spans: dataStore<Record<string, any>>;
    private _baseUrl = '/telemetry'; // Default base URL, can be overridden by the config
    private _retentionTimeInSeconds: number;

    constructor(retentionTimeInSeconds: number = 3600) {
        super();
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        this._spans = new dataStore({ timestampData: true});
        this._spans.ensureIndex({ fieldName: 'createdAt'});
        this._startCleanupJob();

    };

    public set baseUrl(baseUrl: string) {
        this._baseUrl = baseUrl;
    }
    public set retentionTimeInSeconds(retentionTimeInSeconds: number) {
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        logger.info(`InMemoryDbSpanExporter retention time set to ${this._retentionTimeInSeconds} seconds`);
    }

    export(readableSpans: ReadableSpan[], resultCallback: (arg0: { code: ExportResultCode; error?: Error; }) => void) {
        logger.debug('InMemoryDbSpanExporter.export called with spans: ', readableSpans.length);
        try {
            if (!this.isEnabled()) {
                logger.debug('InMemoryDbSpanExporter is not enabled. Skipping export.');
                return resultCallback({ code: ExportResultCode.SUCCESS });
            }
            // Prepare spans to be inserted into the in-memory database (remove circular references and convert to nested objects)
            const cleanSpans = readableSpans
                .map(nestedSpan => removeCircularRefs(nestedSpan)) // to avoid JSON parsing error
                .map(span => applyNesting(span)) // to avoid dot notation in keys (neDB does not support dot notation in keys)
                .filter(span => {
                    const target = span?.attributes?.http?.target;                        // Exclude spans where target includes 'telemetry' but NOT 'telemetry/utils'
                    if (target && target.includes(this._baseUrl)) {
                        return target.includes(this._baseUrl + '/utils');
                    }
                    return true;
                });
            // Insert spans into the in-memory database
            this._spans.insert(cleanSpans, (err: any, _newDoc: any) => {
                if (err) {
                    logger.error(err);
                    return;
                }
            });

            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            logger.error('Error exporting spans\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting spans\n' + error.message + '\n' + error.stack),
            })
        }
    };

    shutdown() {
        this._spans = new dataStore();
        return this.forceFlush();
    };
    /**
     * Exports any pending spans in the exporter
     */
    forceFlush() {
        return Promise.resolve();
    };
    //err,docs
    find(search: any, callback: any) {
        this._spans.find(search, callback);
    }
    reset() {
        this._spans = new dataStore();
    };
    getFinishedSpans() {
        return this._spans.getAllData();
    };
    /**
     * Inserts spans into the in-memory database.
     * @param spans - The spans to insert.
     * @param callback - The callback to execute after insertion.
     */
    insert(spans: any[], callback: (err: any, newDocs: any[]) => void): void {
        this._spans.insert(spans, callback);
    }

    _startCleanupJob() {
        const interval = 1000;

        setInterval(() => {
            const expirationDate = new Date(Date.now() - this._retentionTimeInSeconds * 1000);

            this._spans.remove(
                { createdAt: { $lt: expirationDate } },
                { multi: true },
                (err, numRemoved) => {
                    if (err) {
                        logger.error('Error in TTL cleanup:', err);
                    } else if (numRemoved > 0) {
                        logger.debug(`TTL cleanup: removed ${numRemoved} expired spans`);
                    }
                }
            );
        }, interval);
    }

}

