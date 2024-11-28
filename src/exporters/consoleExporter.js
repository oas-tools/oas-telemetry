export class ConsoleExporter {

    // PLUGIN SYSTEM -----------------------------------------------------------
    plugins = [];

    // OPEN TELEMETRY EXPORTER INTERFACE ---------------------------------------
    export(readableSpans, resultCallback) {
        console.log('ConsoleExporter | Received spans: ', readableSpans.length);
        setTimeout(() => resultCallback({ code: 0 }), 0);
    }

    shutdown() {
        return this.forceFlush();
    }

    forceFlush() {
        return Promise.resolve();
    }

    // OAS-TOOLS OAS-TELEMETRY EXPORTER INTERFACE ---------------------------------------

    start() {
        console.log("Exporter started");
    }

    stop() {
        console.log("Exporter stopped");
    }

    reset() {
        console.log("Exporter reset");
    }

    isRunning() {
        return true;
    }

    find(search, callback) {
        console.log("Getting finished spans");
        callback(null, []);
        return [];
    }

    async getFinishedSpans() {
        return [];
    }
}