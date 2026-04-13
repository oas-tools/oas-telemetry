import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import logger from '../../../utils/logger.js';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';
import { DiskWriter } from '../../persistence/DiskWriter.js';
import { Enabler } from '../wrappers.js';

export type DiskTraceExporterOptions = {
    directoryPath: string;
    flushIntervalMs?: number;
    batchSize?: number;
    maxSegmentBytes?: number;
};

export class DiskTraceExporter extends Enabler implements SpanExporter {
    private readonly writer: DiskWriter;
    private readonly flushIntervalMs: number;
    private readonly batchSize: number;

    private queuedSpans: any[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private flushing = false;

    constructor(options: DiskTraceExporterOptions) {
        super();
        this.flushIntervalMs = options.flushIntervalMs || 1000;
        this.batchSize = options.batchSize || 500;
        this.writer = new DiskWriter({
            directoryPath: options.directoryPath,
            segmentPrefix: 'traces',
            maxSegmentBytes: options.maxSegmentBytes,
        });
    }

    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
        if (!this.isEnabled()) {
            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
        }

        try {
            const serializableSpans = spans
                .map((span) => removeCircularRefs(span))
                .map((span) => applyNesting(span));

            if (serializableSpans.length > 0) {
                this.queuedSpans.push(...serializableSpans);
                if (this.queuedSpans.length >= this.batchSize) {
                    void this.flushPending();
                } else {
                    this.scheduleFlush();
                }
            }

            resultCallback({ code: ExportResultCode.SUCCESS });
        } catch (error: any) {
            logger.error(`[DiskTraceExporter] Failed to queue spans: ${error?.message || error}`);
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
        if (this.queuedSpans.length === 0) return;

        this.flushing = true;
        try {
            while (this.queuedSpans.length > 0) {
                if (!forceAll && this.queuedSpans.length < this.batchSize) {
                    this.scheduleFlush();
                    break;
                }

                const size = forceAll ? this.queuedSpans.length : this.batchSize;
                const batch = this.queuedSpans.splice(0, size);
                await this.writer.appendRecords(batch);
            }
        } catch (error: any) {
            logger.error(`[DiskTraceExporter] Failed writing spans to disk: ${error?.message || error}`);
        } finally {
            this.flushing = false;
        }
    }
}
