import fs from 'fs/promises';
import path from 'path';
import { gzipSync, gunzipSync } from 'zlib';

export const DEFAULT_SEGMENT_PREFIX = 'traces';
export const SEGMENT_EXT = '.oastlm';
export const DEFAULT_MAX_SEGMENT_BYTES = 8 * 1024 * 1024;

export type SegmentFile = {
    index: number;
    filePath: string;
};

export function getSegmentName(index: number, prefix: string = DEFAULT_SEGMENT_PREFIX): string {
    return `${prefix}-${index.toString().padStart(6, '0')}${SEGMENT_EXT}`;
}

export async function listSegments(directoryPath: string, prefix: string = DEFAULT_SEGMENT_PREFIX): Promise<SegmentFile[]> {
    try {
        const files = await fs.readdir(directoryPath);
        const regex = new RegExp(`^${prefix}-(\\d{6})${SEGMENT_EXT.replace('.', '\\.')}$`);

        return files
            .map((name) => {
                const match = name.match(regex);
                if (!match) return null;
                const index = Number.parseInt(match[1], 10);
                return { index, filePath: path.join(directoryPath, name) };
            })
            .filter((value): value is SegmentFile => value !== null)
            .sort((a, b) => a.index - b.index);
    } catch (error: any) {
        if (error?.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

export function encodeRecordBatchFrame(records: any[]): Buffer {
    const lineDelimitedJson = records.map((record) => JSON.stringify(record)).join('\n') + '\n';
    const compressed = gzipSync(Buffer.from(lineDelimitedJson, 'utf-8'));
    const frame = Buffer.allocUnsafe(4 + compressed.length);
    frame.writeUInt32LE(compressed.length, 0);
    compressed.copy(frame, 4);
    return frame;
}

export function decodeRecordBatchFrame(framePayload: Buffer): any[] {
    const decompressed = gunzipSync(framePayload).toString('utf-8');
    const lines = decompressed.split('\n').filter((line) => line.trim().length > 0);

    return lines.map((line, index) => {
        try {
            return JSON.parse(line);
        } catch {
            throw new Error(`Invalid JSON line at index ${index}`);
        }
    });
}
