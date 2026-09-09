import { ExportResult, hrTimeToMicroseconds } from '@opentelemetry/core';
import { ExportResultCode } from '@opentelemetry/core';
import { ReadableLogRecord, LogRecordExporter } from '@opentelemetry/sdk-logs';
import Datastore from '@seald-io/nedb';
import MiniSearch from 'minisearch';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';
import { Enabler } from '../wrappers.js';
import logger from '../../../utils/logger.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';

export class InMemoryDbLogExporter extends Enabler implements LogRecordExporter {

    private _db: Datastore | null = null;
    private _miniSearch: MiniSearch | null = null;
    private _retentionTimeInSeconds: number;
    private _initialized = false;


    constructor(retentionTimeInSeconds: number = 3600) {
        super();
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        this._startCleanupJob();
    }

    private _ensureInitialized(): void {
        if (this._initialized) return;
        this._initialized = true;
        
        this._db = new Datastore();
        this._db.ensureIndex({ fieldName: 'timestamp' });
        this._miniSearch = new MiniSearch({
            fields: ['body'],
            storeFields: ['_id'],
            idField: '_id',
        });

        logger.info(`[InMemoryDbLogExporter] In-memory storage created`);
    }

    public initializeStorage(): void {
        this._ensureInitialized();
    }
    /*
    * SUPER WARNING:
    * Do NOT use console.log, console.error, or any logger inside this class's export function.
    * Doing so will cause an infinite loop.
    * Only console.dir is allowed, as it is not tracked by our log export implementation.
    */
    /**
     * Export logs.
     * @param logs
     * @param resultCallback
     */
    public export(
        logs: ReadableLogRecord[],
        resultCallback: (result: ExportResult) => void
    ) {
        this._ensureInitialized();

        const logsToInsert = logs.map(logRecord => {
            // Remove circular references first, then apply nesting, then export info
            const formattedLog = this._formatLogRecord(logRecord);
            const cleanedLog = removeCircularRefs(formattedLog);
            const nestedLog = applyNesting(cleanedLog);
            return nestedLog;
        });
        logsToInsert.forEach(log => {
            pluginService.broadcastLog(log);
        });
        // ENABLED only affect storage not plugin broadcasting
        if (this.isEnabled()) {
            this._insertLogs(logsToInsert, resultCallback);
        }
        resultCallback({ code: ExportResultCode.SUCCESS });

    }

    reset(): void {
        this._ensureInitialized();
        // Remove all logs from the in-memory database.
        this._db!.remove({}, { multi: true }, (err) => {
            if (err) {
                logger.error(`[InMemoryDbLogExporter] Error during reset: ${err.message}`);
            } else {
                logger.info(`[InMemoryDbLogExporter] Reset - all logs cleared`);
            }
        });
        // Clear mini search index
        this._miniSearch = new MiniSearch({
            fields: ['body'],
            storeFields: ['_id'],
            idField: '_id',
        });
    }

    /**
     * Shutdown the exporter.
     */
    public async shutdown(): Promise<void> {
        this._db = null as any;
        this._miniSearch = null as any;
        this._initialized = false;
    }


    async find(findConfig: { query: any, messageSearch: string | null, limit?: number, sortOrder?: any }): Promise<any[]> {
        this._ensureInitialized();
        const { query, messageSearch, limit, sortOrder } = findConfig;
        const finalQuery = { ...query };
        const effectiveSortOrder = sortOrder || { timestamp: -1 };

        if (messageSearch) {
            const searchResults = this._miniSearch!.search(messageSearch, { prefix: true, fuzzy: 0.2 });
            const ids: string[] = searchResults.map((result: any) => result._id as string);
            logger.debug(`[InMemoryDbLogExporter] MiniSearch found ${ids.length} results for search term "${messageSearch}"`, { depth: 3 });
            finalQuery._id = { $in: ids };
        }

        const docs = await new Promise<any[]>((resolve, reject) => {
            let query_exec = this._db!.find(finalQuery)
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

    insert(data: any[], callback: (err: any, newDocs: any[]) => void): void {
        this._insertLogs(data, (result: ExportResult) => {
            if (result.code === ExportResultCode.SUCCESS) {
                this._db!.find({}, (err: any, docs: any[]) => {
                    if (err) {
                        logger.debug('[InMemoryDbLogExporter] Error fetching inserted logs', err);
                        callback(err, []);
                        return;
                    }
                    callback(null, docs);
                });
            } else {
                callback(new Error('Failed to insert logs'), []);
            }
        });
    }

    getFinishedLogs(): any[] {
        this._ensureInitialized();
        return this._db!.getAllData();
    }

    /**
     *  @copyright The OpenTelemetry Authors
     *  @license Apache-2.0
     * converts logRecord info into more readable format
     * @param logRecord
     */
    private _formatLogRecord(logRecord: ReadableLogRecord) {
        return {
            resource: {
                attributes: logRecord.resource.attributes,
            },
            instrumentationScope: logRecord.instrumentationScope,
            timestamp: hrTimeToMicroseconds(logRecord.hrTime) ?? Date.now(),
            observedTimestamp: hrTimeToMicroseconds(logRecord.hrTimeObserved) ?? Date.now(),
            traceId: logRecord.spanContext?.traceId,
            spanId: logRecord.spanContext?.spanId,
            traceFlags: logRecord.spanContext?.traceFlags,
            severityText: logRecord.severityText,
            severityNumber: logRecord.severityNumber,
            body: logRecord.body,
            attributes: logRecord.attributes,
            createdAt: Date.now(),
        };
    }

    public set retentionTimeInSeconds(retentionTimeInSeconds: number) {
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        logger.info(`[InMemoryDbLogExporter] Retention time set to ${this._retentionTimeInSeconds} seconds`);
    }

    public get retentionTimeInSeconds(): number {
        return this._retentionTimeInSeconds;
    }

    private _insertLogs(logsToInsert: any[], resultCallback: (result: ExportResult) => void) {
        if (!this._db) return resultCallback({ code: ExportResultCode.FAILED });

        logsToInsert = logsToInsert.map((log) => ({
            ...log,
            createdAt: typeof log.createdAt === 'number' ? log.createdAt : Date.now(),
        }));
        
        this._db.insert(logsToInsert, (err: any, newDocs: any[]) => {
            if (err) {
                console.dir(err);
                resultCallback({ code: ExportResultCode.FAILED });
                return;
            }
            // console.dir(newDocs, { depth: 3 });
            newDocs.forEach((doc: any) => this._miniSearch?.add(doc));
            resultCallback({ code: ExportResultCode.SUCCESS });
        });
        return;
    }

    private _startCleanupJob() {
        const interval = 1000;

        setInterval(() => {
            if (!this._db) return; // Safety check
            const expirationTime = Date.now() - this._retentionTimeInSeconds * 1000;

            this._db.remove(
                { createdAt: { $lt: expirationTime } },
                { multi: true },
                (err, numRemoved) => {
                    if (err) {
                        logger.error('[InMemoryDbLogExporter] Error in TTL cleanup:', err);
                    } else if (numRemoved > 0) {
                        logger.debug(`[InMemoryDbLogExporter] TTL cleanup removed ${numRemoved} expired logs`);
                    }
                }
            );
        }, interval);
    }
}
