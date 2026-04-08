import { ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import dataStore from '@seald-io/nedb';
import logger from '../../../utils/logger.js';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';
import { Enabler } from '../wrappers.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';
import { getStoragePath } from '../utils/storagePath.js';


export class InMemoryDbSpanExporter extends Enabler implements SpanExporter {
    private _spans: dataStore<Record<string, any>> | null = null;
    private _baseUrl = '/telemetry'; // Default base URL, can be overridden by the config
    private _retentionTimeInSeconds: number;
    private _storagePath: string | null = null;
    private _initialized = false;

    constructor(retentionTimeInSeconds: number = 3600) {
        super();
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        this._storagePath = getStoragePath('traces');
        this._startCleanupJob();
    };

    private _ensureInitialized(): void {
        if (this._initialized) return;
        this._initialized = true;
        
        this._spans = new dataStore(this._storagePath ? { filename: this._storagePath, timestampData: true, autoload: true } : { timestampData: true });
        this._spans.ensureIndex({ fieldName: 'createdAt' });
        
        if (this._storagePath) {
            logger.info(`[SpanExporter] Disk storage enabled at: ${this._storagePath}`);
        } else {
            logger.info(`[SpanExporter] Using in-memory storage`);
        }
    }

    public set baseUrl(baseUrl: string) {
        this._baseUrl = baseUrl;
    }
    public set retentionTimeInSeconds(retentionTimeInSeconds: number) {
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        logger.info(`InMemoryDbSpanExporter retention time set to ${this._retentionTimeInSeconds} seconds`);
    }

    public get retentionTimeInSeconds(): number {
        return this._retentionTimeInSeconds;
    }

    export(readableSpans: ReadableSpan[], resultCallback: (arg0: { code: ExportResultCode; error?: Error; }) => void) {
        this._ensureInitialized();
        logger.debug('InMemoryDbSpanExporter.export called with spans: ', readableSpans.length);
        try {
            // Prepare spans to be inserted into the in-memory database (remove circular references and convert to nested objects)
            const cleanSpans = readableSpans
                .map(nestedSpan => removeCircularRefs(nestedSpan)) // to avoid JSON parsing error
                .map(span => applyNesting(span)) // to avoid dot notation in keys (neDB does not support dot notation in keys)
                .filter(span => {
                    const target = span?.attributes?.http?.target;
                    // Exclude spans where target includes 'telemetry' but NOT 'telemetry/utils/generate-log' or 'telemetry/utils/generate-wait'
                    if (target && target.includes(this._baseUrl)) {
                        return (target.includes("generate"))
                    }
                    return true;
                });

            cleanSpans.forEach(span => {
                pluginService.broadcastTrace(span);
            });

            // 
            if (this.isEnabled()) {
                // Insert spans into the in-memory database
                if (this._spans) {
                    this._spans.insert(cleanSpans, (err: any, _newDoc: any) => {
                        if (err) {
                            logger.error(err);
                            return;
                        }
                    });
                }
            }
            return resultCallback({ code: ExportResultCode.SUCCESS });

        } catch (error: any) {
            logger.error('Error exporting spans\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting spans\n' + error.message + '\n' + error.stack),
            })
        }
    };

    shutdown() {
        this._spans = null as any;
        return this.forceFlush();
    };

    reset() {
        this._ensureInitialized();
        // Remove all spans from database but keep persistence enabled
        this._spans!.remove({}, { multi: true }, (err) => {
            if (err) {
                logger.error(`[SpanExporter] Error during reset: ${err.message}`);
            } else {
                logger.info(`[SpanExporter] Reset - all spans cleared`);
            }
        });
    }
    /**
     * Exports any pending spans in the exporter
     */
    forceFlush() {
        return Promise.resolve();
    };

    async find(findConfig: { query: any, limit?: number, sortOrder?: any }): Promise<any[]> {
        this._ensureInitialized();
        const { query, limit, sortOrder } = findConfig;
        const effectiveSortOrder = sortOrder || { timestamp: -1 };

        const docs = await new Promise<any[]>((resolve, reject) => {
            let query_exec = this._spans!.find(query)
                .sort(effectiveSortOrder);
            
            // Only apply limit if provided
            if (limit !== undefined) {
                query_exec = query_exec.limit(limit);
            }
            
            query_exec.exec((err: any, docs: any[]) => {
                if (err) reject(err);
                else resolve(docs);
            });
        });
        return docs;
    }

    getFinishedSpans() {
        this._ensureInitialized();
        if (!this._spans) return [];
        return this._spans.getAllData();
    };
    /**
     * Inserts spans into the in-memory database.
     * @param spans - The spans to insert.
     * @param callback - The callback to execute after insertion.
     */
    insert(spans: any[], callback: (err: any, newDocs: any[]) => void): void {
        this._ensureInitialized();
        if (!this._spans) {
            return callback(new Error('Spans database not initialized'), []);
        }
        this._spans.insert(spans, callback);
    }

    _startCleanupJob() {
        const interval = 1000;

        setInterval(() => {
            if (!this._spans) return; // Safety check - not initialized yet
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

