import fs from 'fs/promises';
import path from 'path';
import {
    encodeRecordBatchFrame,
    getSegmentName,
    listSegments,
    DEFAULT_MAX_SEGMENT_BYTES,
    DEFAULT_SEGMENT_PREFIX,
} from './DiskUtils.js';

export type DiskWriterOptions = {
    directoryPath: string;
    segmentPrefix?: string;
    maxSegmentBytes?: number;
};

export class DiskWriter {
    private readonly directoryPath: string;
    private readonly segmentPrefix: string;
    private readonly maxSegmentBytes: number;

    private initialized = false;
    private currentSegmentIndex = 0;
    private currentSegmentPath = '';
    private currentSegmentSize = 0;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(options: DiskWriterOptions) {
        this.directoryPath = path.resolve(options.directoryPath);
        this.segmentPrefix = options.segmentPrefix || DEFAULT_SEGMENT_PREFIX;
        this.maxSegmentBytes = options.maxSegmentBytes || DEFAULT_MAX_SEGMENT_BYTES;
    }

    async appendRecords(records: any[]): Promise<void> {
        if (!records.length) return;

        const frame = encodeRecordBatchFrame(records);
        this.writeQueue = this.writeQueue.then(() => this.appendFrame(frame));
        return this.writeQueue;
    }

    async flush(): Promise<void> {
        await this.writeQueue;
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return;

        await fs.mkdir(this.directoryPath, { recursive: true });
        const segments = await listSegments(this.directoryPath, this.segmentPrefix);

        if (segments.length === 0) {
            this.currentSegmentIndex = 0;
            this.currentSegmentPath = path.join(
                this.directoryPath,
                getSegmentName(this.currentSegmentIndex, this.segmentPrefix)
            );
            this.currentSegmentSize = 0;
        } else {
            const lastSegment = segments[segments.length - 1];
            this.currentSegmentIndex = lastSegment.index;
            this.currentSegmentPath = lastSegment.filePath;
            this.currentSegmentSize = (await fs.stat(lastSegment.filePath)).size;
        }

        this.initialized = true;
    }

    private async rotateSegment(): Promise<void> {
        this.currentSegmentIndex += 1;
        this.currentSegmentPath = path.join(
            this.directoryPath,
            getSegmentName(this.currentSegmentIndex, this.segmentPrefix)
        );
        this.currentSegmentSize = 0;
    }

    private async appendFrame(frame: Buffer): Promise<void> {
        await this.ensureInitialized();

        if (this.currentSegmentSize > 0 && this.currentSegmentSize + frame.length > this.maxSegmentBytes) {
            await this.rotateSegment();
        }

        await fs.appendFile(this.currentSegmentPath, frame);
        this.currentSegmentSize += frame.length;
    }
}
