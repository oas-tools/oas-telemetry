import { ExportResult, hrTimeToMicroseconds } from '@opentelemetry/core';
import { ExportResultCode } from '@opentelemetry/core';
import { ReadableLogRecord, LogRecordExporter } from '@opentelemetry/sdk-logs';
import { removeCircularRefs, applyNesting } from '../utils/circular.js';
import Datastore from '@seald-io/nedb';
import MiniSearch from 'minisearch';

export class InMemoryLogRecordExporter implements LogRecordExporter {

    private _db: Datastore;
    private _miniSearch: MiniSearch;

    constructor() {
        this._db = new Datastore();
        this._miniSearch = new MiniSearch({
            fields: ['body'],
            storeFields: ['_id'],
            idField: '_id',
        });
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
        const logsToInsert = logs.map(logRecord => {
            // Remove circular references first, then apply nesting, then export info
            const formattedLog = this._formatLogRecord(logRecord);
            const cleanedLog = removeCircularRefs(formattedLog);
            const nestedLog = applyNesting(cleanedLog);
            return nestedLog;
        });

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
            console.dir(`MiniSearch found ${ids.length} results for search term "${messageSearch}"`, { depth: 3 });
            // Add MiniSearch results to the query
            query._id = { $in: ids };
        }

        this._db.find(query, callback);
    }


    getFinishedSpans(): any[] {
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
}