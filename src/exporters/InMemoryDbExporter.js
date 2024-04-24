import { ExportResultCode } from '@opentelemetry/core';

//import in memory database
import dataStore from 'nedb'

export class InMemoryExporter {
    constructor() {
        this._spans = new dataStore();
        this._stopped = false;
    }
    export(readableSpans, resultCallback) {
        try {
            if (!this._stopped) {
                // Remove circular references
                const cleanSpans = readableSpans.map(span => removeCircular(span));

                // Insert spans into the in-memory database
                this._spans.insert(cleanSpans, (err, newDoc) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                });

            }
            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error) {
            console.error('Error exporting spans\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting spans\n' + error.message + '\n' + error.stack),
            })
        }
    }
    start() {
        this._stopped = false;
    }
    stop() {
        this._stopped = true;
    }
    shutdown() {
        this._stopped = true;
        this._spans = new dataStore();
        return this.forceFlush();
    }
    /**
     * Exports any pending spans in the exporter
     */
    forceFlush() {
        return Promise.resolve();
    }
    reset() {
        this._spans = new dataStore();
    }
    getFinishedSpans() {
        return this._spans;
    }
}

function removeCircular(obj) {
    const seen = new WeakMap(); // Used to keep track of visited objects


    // Replacer function to handle circular references
    function replacer(key, value) {
        if (typeof value === "object" && value !== null) {
            // If the object has been visited before, return the name prefixed with "CIRCULAR+"
            if (seen.has(value)) {
                return `CIRCULAR${key}`;
            }
            seen.set(value, key); // Mark the object as visited with its name
        }
        return value;
    }
    
    // Convert the object to a string and then parse it back
    // This will trigger the replacer function to handle circular references
    const jsonString = JSON.stringify(obj, replacer);
    const spanNoDotsInKeys =jsonString.replace(/[^"]*":/g, (match) => {
        // Replace all dots in the key with underscores (e.g. "http.method" -> "http_method")
        const newMatch = match.replace(/\./g,"_dot_")

        return newMatch
    })  
    return JSON.parse(spanNoDotsInKeys);
}