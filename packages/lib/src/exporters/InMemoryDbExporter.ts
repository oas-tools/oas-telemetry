import { ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { OasTlmExporter, PluginResource } from '../types/index.js';
//import in memory database
import dataStore from '@seald-io/nedb';
import logger from '../utils/logger.js';


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

function removeCircularRefs(obj: any): any {
    // const seen = new WeakMap(); // Used to keep track of visited objects


    // Replacer function to handle circular references
    function replacer(key: string, value: any) {
        if (key === "_spanProcessor") {
            return "oas-telemetry skips this field to avoid circular reference";
        }
        // GENERIC CIRCULAR REFERENCE HANDLING
        // if (typeof value === "object" && value !== null) {
        //     // If the object has been visited before, return the name prefixed with "CIRCULAR+"
        //     if (seen.has(value)) {
        //         return `CIRCULAR${key}`;
        //     }
        //     seen.set(value, key); // Mark the object as visited with its name
        // }
        return value;
    }

    // Convert the object to a string and then parse it back
    // This will trigger the replacer function to handle circular references
    const jsonString = JSON.stringify(obj, replacer);
    return JSON.parse(jsonString);
}

/**
 * Recursively converts dot-separated keys in an object to nested objects.
 * 
 * @param {any} obj - The object to process.
 * @returns {any} - The object with all dot-separated keys converted to nested objects.
 * @example
 * // Input:
 * // {
 * //   "http.method": "GET",
 * //   "http.url": "http://example.com",
 * //   "nested.obj.key": "value"
 * // }
 * // Output:
 * // {
 * //   "http": {
 * //     "method": "GET",
 * //     "url": "http://example.com"
 * //   },
 * //   "nested": {
 * //     "obj": {
 * //       "key": "value"
 * //     }
 * //   }
 * // }
 */
function convertToNestedObject(obj: any): any {
    const result: any = {};

    for (const key in obj) {
        const keys = key.split('.');
        let temp = result;

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
 */
function applyNesting(obj: any): any {
    // Recursively apply convertToNestedObject to each level of the object
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = applyNesting(obj[key]);
        }
    }

    return convertToNestedObject(obj);
}