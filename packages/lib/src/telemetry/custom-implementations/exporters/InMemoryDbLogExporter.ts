import { ExportResult, hrTimeToMicroseconds } from '@opentelemetry/core';
import { ExportResultCode } from '@opentelemetry/core';
import { ReadableLogRecord, LogRecordExporter } from '@opentelemetry/sdk-logs';
import Datastore from '@seald-io/nedb';
import MiniSearch from 'minisearch';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';
import { Enabler } from '../Wrappers.js';
import logger from '../../../utils/logger.js';

export class InMemoryDbLogExporter  extends Enabler implements LogRecordExporter {

    private _db: Datastore;
    private _miniSearch: MiniSearch;
    private _retentionTimeInSeconds: number;


    constructor(retentionTimeInSeconds: number = 3600) {
        super();
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        this._db = new Datastore({ timestampData: true });
        this._db.ensureIndex({ fieldName: 'createdAt' });
        this._miniSearch = new MiniSearch({
            fields: ['body'],
            storeFields: ['_id'],
            idField: '_id',
        });
        this._startCleanupJob();
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

        if (!this.isEnabled()) {
            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
        }

        const logsToInsert = logs.map(logRecord => {
            // Remove circular references first, then apply nesting, then export info
            const formattedLog = this._formatLogRecord(logRecord);
            const cleanedLog = removeCircularRefs(formattedLog);
            const nestedLog = applyNesting(cleanedLog);
            return nestedLog;
        });

        this._insertLogs(logsToInsert, resultCallback);
        
    }

    reset(): void {
        this._db = new Datastore();
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
    }


    find(query: any, messageSearch: string | null, callback: (err: any, docs: any) => void): void {
        if (messageSearch) {
            const searchResults = this._miniSearch.search(messageSearch);
            const ids: string[] = searchResults.map((result: any) => result._id as string);
            logger.debug(`MiniSearch found ${ids.length} results for search term "${messageSearch}"`, { depth: 3 });
            // Add MiniSearch results to the query
            query._id = { $in: ids };
        }

        this._db.find(query, callback);
    }

    insert(data: any[], callback: (err: any, newDocs: any[]) => void): void {
        this._insertLogs(data, (result: ExportResult) => {
            if (result.code === ExportResultCode.SUCCESS) {
                this._db.find({}, (err: any, docs: any[]) => {
                    if (err) {
                        logger.debug(err);
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
        return this._db.getAllData();
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
            timestamp: hrTimeToMicroseconds(logRecord.hrTime) || Date.now(),
            traceId: logRecord.spanContext?.traceId,
            spanId: logRecord.spanContext?.spanId,
            traceFlags: logRecord.spanContext?.traceFlags,
            severityText: logRecord.severityText,
            severityNumber: logRecord.severityNumber,
            body: logRecord.body,
            attributes: logRecord.attributes,
        };
    }

    public set retentionTimeInSeconds(retentionTimeInSeconds: number) {
        this._retentionTimeInSeconds = retentionTimeInSeconds;
        logger.info(`InMemoryDbLogExporter retention time set to ${this._retentionTimeInSeconds} seconds`);
    }

    private  _insertLogs(logsToInsert: any[], resultCallback: (result: ExportResult) => void) {
        this._db.insert(logsToInsert, (err: any, newDocs: any[]) => {
            if (err) {
                console.dir(err);
                resultCallback({ code: ExportResultCode.FAILED });
                return;
            }
            // console.dir(newDocs, { depth: 3 });
            newDocs.forEach((doc: any) => this._miniSearch.add(doc));
            resultCallback({ code: ExportResultCode.SUCCESS });
        });
        return;
    }

    private _startCleanupJob() {
        const interval = 1000;

        setInterval(() => {
            const expirationDate = new Date(Date.now() - this._retentionTimeInSeconds * 1000);

            this._db.remove(
                { createdAt: { $lt: expirationDate } },
                { multi: true },
                (err, numRemoved) => {
                    if (err) {
                        logger.error('Error in TTL cleanup:', err);
                    } else if (numRemoved > 0) {
                        logger.debug(`TTL cleanup: removed ${numRemoved} expired logs`);
                    }
                }
            );
        }, interval);
    }
}
