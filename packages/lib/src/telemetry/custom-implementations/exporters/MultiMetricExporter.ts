import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';

export class MultiMetricExporter implements PushMetricExporter {
    private readonly exporters: PushMetricExporter[];

    constructor(exporters: PushMetricExporter[]) {
        this.exporters = exporters;
    }

    export(resourceMetrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
        if (!this.exporters.length) {
            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
        }

        let pending = this.exporters.length;
        let failed = false;
        let firstError: Error | undefined;

        this.exporters.forEach((exporter) => {
            try {
                exporter.export(resourceMetrics, (result: ExportResult) => {
                    if (result.code === ExportResultCode.FAILED) {
                        failed = true;
                        if (result.error && !firstError) {
                            firstError = result.error;
                        }
                    }

                    pending -= 1;
                    if (pending === 0) {
                        resultCallback(failed
                            ? { code: ExportResultCode.FAILED, error: firstError }
                            : { code: ExportResultCode.SUCCESS });
                    }
                });
            } catch (error: any) {
                failed = true;
                if (!firstError) {
                    firstError = error instanceof Error ? error : new Error(String(error));
                }

                pending -= 1;
                if (pending === 0) {
                    resultCallback({ code: ExportResultCode.FAILED, error: firstError });
                }
            }
        });
    }

    async shutdown(): Promise<void> {
        await Promise.all(this.exporters.map((exporter) => exporter.shutdown()));
    }

    async forceFlush(): Promise<void> {
        await Promise.all(
            this.exporters
                .map((exporter) => exporter.forceFlush)
                .filter((forceFlush): forceFlush is (() => Promise<void>) => typeof forceFlush === 'function')
                .map((forceFlush) => forceFlush())
        );
    }
}
