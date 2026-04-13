import { ExportResult, ExportResultCode, hrTimeToMicroseconds } from '@opentelemetry/core';
import { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';
import { Enabler } from '../wrappers.js';
import { DiskWriter } from '../../persistence/DiskWriter.js';
import logger from '../../../utils/logger.js';

export type DiskLogExporterOptions = {
    directoryPath: string;
    flushIntervalMs?: number;
    batchSize?: number;
    maxSegmentBytes?: number;
};

export class DiskLogExporter extends Enabler implements LogRecordExporter {
    private readonly writer: DiskWriter;
    private readonly flushIntervalMs: number;
    private readonly batchSize: number;

    private queuedLogs: any[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private flushing = false;

    constructor(options: DiskLogExporterOptions) {
        super();
        this.flushIntervalMs = options.flushIntervalMs || 1000;
        this.batchSize = options.batchSize || 500;
        this.writer = new DiskWriter({
            directoryPath: options.directoryPath,
            segmentPrefix: 'logs',
            maxSegmentBytes: options.maxSegmentBytes,
        });
    }

    export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
        if (!this.isEnabled()) {
            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
        }

        try {
            const serializableLogs = logs
                .map((logRecord) => this.formatLogRecord(logRecord))
                .map((log) => removeCircularRefs(log))
                .map((log) => applyNesting(log));

            if (serializableLogs.length > 0) {
                this.queuedLogs.push(...serializableLogs);
                if (this.queuedLogs.length >= this.batchSize) {
                    void this.flushPending();
                } else {
                    this.scheduleFlush();
                }
            }

            resultCallback({ code: ExportResultCode.SUCCESS });
        } catch (error: any) {
            logger.error(`[DiskLogExporter] Failed to queue logs: ${error?.message || error}`);
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
        if (this.queuedLogs.length === 0) return;

        this.flushing = true;
        try {
            while (this.queuedLogs.length > 0) {
                if (!forceAll && this.queuedLogs.length < this.batchSize) {
                    this.scheduleFlush();
                    break;
                }

                const size = forceAll ? this.queuedLogs.length : this.batchSize;
                const batch = this.queuedLogs.splice(0, size);
                await this.writer.appendRecords(batch);
            }
        } catch (error: any) {
            logger.error(`[DiskLogExporter] Failed writing logs to disk: ${error?.message || error}`);
        } finally {
            this.flushing = false;
        }
    }

    private formatLogRecord(logRecord: ReadableLogRecord) {
        return {
            resource: {
                attributes: logRecord.resource.attributes,
            },
            instrumentationScope: logRecord.instrumentationScope,
            timestamp: hrTimeToMicroseconds(logRecord.hrTime) ?? Date.now(),
            observedTimestamp: hrTimeToMicroseconds(logRecord.hrTimeObserved) ?? Date.now(),
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
