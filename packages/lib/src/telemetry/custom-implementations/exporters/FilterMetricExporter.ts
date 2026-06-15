import { ExportResult } from '@opentelemetry/core';
import { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';

export class FilterMetricExporter implements PushMetricExporter {
    private readonly exporter: PushMetricExporter;
    private ignoredMetrics: Set<string> = new Set<string>();

    constructor(exporter: PushMetricExporter) {
        this.exporter = exporter;
    }

    addIgnoredMetric(metric: string): void {
        this.ignoredMetrics.add(metric);
    }

    addIgnoredMetrics(metrics: string[]): void {
        metrics.forEach((metric) => this.ignoredMetrics.add(metric));
    }

    removeIgnoredMetric(metric: string): void {
        this.ignoredMetrics.delete(metric);
    }

    clearIgnoredMetrics(): void {
        this.ignoredMetrics.clear();
    }

    getIgnoredMetrics(): string[] {
        return Array.from(this.ignoredMetrics);
    }

    export(resourceMetrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
        // Filter resourceMetrics.scopeMetrics based on scope.name
        const filteredScopeMetrics = resourceMetrics.scopeMetrics.filter((scopeMetric) => {
            const scopeName = scopeMetric.scope?.name;
            return !scopeName || !this.ignoredMetrics.has(scopeName);
        });

        // We pass the filtered resourceMetrics down to the wrapped exporter.
        const filteredResourceMetrics: ResourceMetrics = {
            resource: resourceMetrics.resource,
            scopeMetrics: filteredScopeMetrics
        };

        this.exporter.export(filteredResourceMetrics, resultCallback);
    }

    async shutdown(): Promise<void> {
        await this.exporter.shutdown();
    }

    async forceFlush(): Promise<void> {
        await this.exporter.forceFlush?.();
    }
}
