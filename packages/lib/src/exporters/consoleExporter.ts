import { OasTlmExporter } from "../types";

export class ConsoleExporter implements OasTlmExporter {

    // PLUGIN SYSTEM -----------------------------------------------------------
    plugins = [];

    // OPEN TELEMETRY EXPORTER INTERFACE ---------------------------------------
    export(readableSpans: any, resultCallback: any) {
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

    find(search: any, callback: any) {
        console.log("Getting finished spans");
        callback(null, []);
        return [];
    }

    getFinishedSpans(): any[] {
        return [];
    }
}