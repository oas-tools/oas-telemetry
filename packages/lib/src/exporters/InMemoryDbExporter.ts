import { ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { OasTlmExporter, PluginResource } from '../types/index.js';
//import in memory database
import dataStore from '@seald-io/nedb';
import logger from '../utils/logger.js';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';


export class InMemoryExporter implements OasTlmExporter {
    private _spans: dataStore<Record<string, any>>;
    private _stopped: boolean;


    constructor() {
        this._spans = new dataStore();
        this._stopped = true;
    };

    // Overrided by dynamic exporter
    plugins: PluginResource[] = [];


    export(readableSpans: ReadableSpan[], resultCallback: (arg0: { code: ExportResultCode; error?: Error; }) => void) {
        try {
            if (!this._stopped) {
                // Prepare spans to be inserted into the in-memory database (remove circular references and convert to nested objects)
                const cleanSpans = readableSpans
                    .map(nestedSpan => removeCircularRefs(nestedSpan))// to avoid JSON parsing error
                    .map(span => applyNesting(span))// to avoid dot notation in keys (neDB does not support dot notation in keys)
                    .filter(span => !span?.attributes?.http?.target?.includes("/telemetry"));// to avoid telemetry spans
                // Insert spans into the in-memory database
                this._spans.insert(cleanSpans, (err: any, _newDoc: any) => {
                    // p = {name, plugin
                    this.plugins.forEach((pluginResource, i) => {
                        cleanSpans.forEach((span) => {
                            logger.debug(`Sending span <${span._id}> to plugin (Plugin #${i}) <${pluginResource.name}>`);
                            logger.debug(`Span: \n<${JSON.stringify(span, null, 2)}`);
                            //TODO: This should be called newSpan instead of newTrace
                            pluginResource.plugin.newTrace(span);
                        });
                    });
                    if (err) {
                        console.error(err);
                        return;
                    }
                });

            }
            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            console.error('Error exporting spans\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting spans\n' + error.message + '\n' + error.stack),
            })
        }
    };
    start() {
        this._stopped = false;
    };
    stop() {
        this._stopped = true;
    };

    isRunning() {
        return !this._stopped;
    };
    shutdown() {
        this._stopped = true;
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

}

