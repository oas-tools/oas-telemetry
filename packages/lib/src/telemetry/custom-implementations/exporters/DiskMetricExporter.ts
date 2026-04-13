import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { removeCircularRefs } from '../utils/circular.js';
import { Enabler } from '../wrappers.js';
import logger from '../../../utils/logger.js';
import { DiskWriter } from '../../persistence/DiskWriter.js';

export type DiskMetricExporterOptions = {
    directoryPath: string;
    flushIntervalMs?: number;
    batchSize?: number;
    maxSegmentBytes?: number;
};

export class DiskMetricExporter extends Enabler implements PushMetricExporter {
    private readonly writer: DiskWriter;
    private readonly flushIntervalMs: number;
    private readonly batchSize: number;

    private queuedScopeMetrics: any[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private flushing = false;

    constructor(options: DiskMetricExporterOptions) {
        super();
        this.flushIntervalMs = options.flushIntervalMs || 1000;
        this.batchSize = options.batchSize || 500;
        this.writer = new DiskWriter({
            directoryPath: options.directoryPath,
            segmentPrefix: 'metrics',
            maxSegmentBytes: options.maxSegmentBytes,
        });
    }

    export(resourceMetrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
        if (!this.isEnabled()) {
            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
        }

        try {
            const scopeMetrics = removeCircularRefs(resourceMetrics.scopeMetrics || []);

            if (Array.isArray(scopeMetrics) && scopeMetrics.length > 0) {
                this.queuedScopeMetrics.push(...scopeMetrics);
                if (this.queuedScopeMetrics.length >= this.batchSize) {
                    void this.flushPending();
                } else {
                    this.scheduleFlush();
                }
            }

            resultCallback({ code: ExportResultCode.SUCCESS });
        } catch (error: any) {
            logger.error(`[DiskMetricExporter] Failed to queue scope metrics: ${error?.message || error}`);
            resultCallback({
                code: ExportResultCode.FAILED,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }

    async shutdown(): Promise<void> {
        this.disable();
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flushPending(true);
        await this.writer.flush();
    }

    async forceFlush(): Promise<void> {
        await this.flushPending(true);
        await this.writer.flush();
    }

    private scheduleFlush(): void {
        if (this.flushTimer) return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flushPending(true);
        }, this.flushIntervalMs);
    }

    private async flushPending(forceAll = false): Promise<void> {
        if (this.flushing) return;
        if (this.queuedScopeMetrics.length === 0) return;

        this.flushing = true;
        try {
            while (this.queuedScopeMetrics.length > 0) {
                if (!forceAll && this.queuedScopeMetrics.length < this.batchSize) {
                    this.scheduleFlush();
                    break;
                }

                const size = forceAll ? this.queuedScopeMetrics.length : this.batchSize;
                const batch = this.queuedScopeMetrics.splice(0, size);
                await this.writer.appendRecords(batch);
            }
        } catch (error: any) {
            logger.error(`[DiskMetricExporter] Failed writing metrics to disk: ${error?.message || error}`);
        } finally {
            this.flushing = false;
        }
    }
}
