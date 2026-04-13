import fs from 'fs/promises';
import logger from '../../utils/logger.js';
import { decodeRecordBatchFrame, listSegments, DEFAULT_SEGMENT_PREFIX } from './DiskUtils.js';

export type DiskImporterOptions = {
    directoryPath: string;
    segmentPrefix?: string;
    importBatchSize?: number;
};

export type DiskImportStats = {
    segmentFilesRead: number;
    importedRecords: number;
    failedFrames: number;
};

export class DiskImporter {
    private readonly directoryPath: string;
    private readonly segmentPrefix: string;
    private readonly importBatchSize: number;

    constructor(options: DiskImporterOptions) {
        this.directoryPath = options.directoryPath;
        this.segmentPrefix = options.segmentPrefix || DEFAULT_SEGMENT_PREFIX;
        this.importBatchSize = options.importBatchSize || 500;
    }

    async import(onBatch: (records: any[]) => Promise<void>): Promise<DiskImportStats> {
        const stats: DiskImportStats = {
            segmentFilesRead: 0,
            importedRecords: 0,
            failedFrames: 0,
        };

        const segments = await listSegments(this.directoryPath, this.segmentPrefix);
        if (!segments.length) {
            return stats;
        }

        const importBuffer: any[] = [];
        const flushImportBuffer = async () => {
            if (!importBuffer.length) return;
            const batch = importBuffer.splice(0, importBuffer.length);
            await onBatch(batch);
            stats.importedRecords += batch.length;
        };

        for (const segment of segments) {
            stats.segmentFilesRead += 1;

            let fileBuffer: Buffer;
            try {
                fileBuffer = await fs.readFile(segment.filePath);
            } catch (error: any) {
                logger.warn(`[DiskImporter] Could not read segment ${segment.filePath}: ${error?.message || error}`);
                continue;
            }

            let offset = 0;
            while (offset + 4 <= fileBuffer.length) {
                const frameLength = fileBuffer.readUInt32LE(offset);
                offset += 4;

                if (frameLength <= 0) {
                    stats.failedFrames += 1;
                    logger.warn(`[DiskImporter] Invalid frame length in ${segment.filePath}; stopping segment parse.`);
                    break;
                }

                if (offset + frameLength > fileBuffer.length) {
                    stats.failedFrames += 1;
                    logger.warn(`[DiskImporter] Truncated frame in ${segment.filePath}; stopping segment parse.`);
                    break;
                }

                const framePayload = fileBuffer.subarray(offset, offset + frameLength);
                offset += frameLength;

                try {
                    const decodedSpans = decodeRecordBatchFrame(framePayload);
                    importBuffer.push(...decodedSpans);

                    while (importBuffer.length >= this.importBatchSize) {
                        const batch = importBuffer.splice(0, this.importBatchSize);
                        await onBatch(batch);
                        stats.importedRecords += batch.length;
                    }
                } catch (error: any) {
                    stats.failedFrames += 1;
                    logger.warn(`[DiskImporter] Failed to decode frame from ${segment.filePath}: ${error?.message || error}`);
                }
            }

            if (offset !== fileBuffer.length) {
                logger.warn(`[DiskImporter] Segment ${segment.filePath} has trailing or incomplete bytes.`);
            }
        }

        await flushImportBuffer();
        return stats;
    }
}
