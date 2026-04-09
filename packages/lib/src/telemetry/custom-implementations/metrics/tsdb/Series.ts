/**
 * Series: Time-series storage with metadata and chunks
 * One series per unique metric+labels combination
 */

import { Chunk } from './Chunk.js';
import { MetricMetadata, LabelSet, HistogramValue } from './types.js';

export class Series {
    private readonly labelSet: LabelSet;
    private readonly metadata: MetricMetadata;
    private readonly chunks: Chunk[] = [];
    private readonly maxChunks: number;
    private readonly chunkSize: number;
    private readonly isHistogram: boolean;

    constructor(
        labelSet: LabelSet,
        metadata: MetricMetadata,
        chunkSize: number = 120,
        maxChunks: number = 60 // ~1 hour at 1min intervals with 120 samples/chunk
    ) {
        this.labelSet = labelSet;
        this.metadata = metadata;
        this.chunkSize = chunkSize;
        this.maxChunks = maxChunks;
        this.isHistogram = metadata.dataPointType === 0; // HISTOGRAM = 0
    }

    /**
     * Append a sample to the series
     */
    append(startTime: number, endTime: number, value: number | HistogramValue): void {
        // Get or create current chunk
        let currentChunk = this.chunks[this.chunks.length - 1];

        if (!currentChunk || currentChunk.isFull()) {
            // Create new chunk
            currentChunk = new Chunk(this.chunkSize, this.isHistogram);
            this.chunks.push(currentChunk);

            // Enforce max chunks limit (circular buffer behavior)
            if (this.chunks.length > this.maxChunks) {
                this.chunks.shift(); // Remove oldest chunk
            }
        }

        currentChunk.append(startTime, endTime, value);
    }


    /**
     * Query slices with options object. Example:
     *   querySlices({ startTime, endTime, includeStartTimes: true })
     *   includeStartTimes defaults to false.
     *   If both startTime and endTime are undefined, returns all data (no time filtering).
     */
    querySlices(options?: {
        startTime?: number;
        endTime?: number;
        includeStartTimes?: boolean;
    }): {
        startTimes?: Float64Array;
        endTimes: Float64Array;
        values: Float64Array | (HistogramValue | null)[];
    } {
        const start = options?.startTime ?? 0;
        const end = options?.endTime ?? Number.MAX_VALUE;
        const includeStartTimes = options?.includeStartTimes ?? false;

        let totalLength = 0;
        for (const chunk of this.chunks) {
            if (!chunk.overlaps(start, end)) continue;
            const slice = chunk.getSlices(start, end);
            totalLength += slice.startTimes.length;
        }

        if (totalLength === 0) {
            const empty: any = {
                endTimes: new Float64Array(0),
                values: this.isHistogram ? [] : new Float64Array(0),
            };
            if (includeStartTimes) {
                empty.startTimes = new Float64Array(0);
            }
            return empty;
        }

        let resultStart: Float64Array | undefined;
        if (includeStartTimes) {
            resultStart = new Float64Array(totalLength);
        }
        const resultEnd = new Float64Array(totalLength);

        const resultValues = this.isHistogram
            ? new Array<HistogramValue | null>(totalLength)
            : new Float64Array(totalLength);

        let offset = 0;

        for (const chunk of this.chunks) {
            if (!chunk.overlaps(start, end)) continue;

            const slice = chunk.getSlices(start, end);
            const len = slice.startTimes.length;
            if (len === 0) continue;

            // Copy start and end times
            if (includeStartTimes && resultStart) {
                resultStart.set(slice.startTimes, offset);
            }
            resultEnd.set(slice.endTimes, offset);

            // Copy values (different type depending on metric)
            if (this.isHistogram) {
                (resultValues as (HistogramValue | null)[]).splice(
                    offset,
                    len,
                    ...(slice.values as (HistogramValue | null)[])
                );
            } else {
                (resultValues as Float64Array).set(
                    slice.values as Float64Array,
                    offset
                );
            }

            offset += len;
        }

        const result: any = {
            endTimes: resultEnd,
            values: resultValues
        };
        if (includeStartTimes && resultStart) {
            result.startTimes = resultStart;
        }
        return result;
    }


    /**
     * Remove chunks older than threshold
     */
    evictOldChunks(thresholdTime: number): number {
        let evicted = 0;
        while (this.chunks.length > 0 && this.chunks[0].getMaxTime() < thresholdTime) {
            this.chunks.shift();
            evicted++;
        }
        return evicted;
    }

    /**
     * Get series metadata
     */
    getMetadata(): MetricMetadata {
        return this.metadata;
    }

    getLabels(): Record<string, any> {
        return this.labelSet.labels;
    }

    getOriginalAttributes(): Record<string, any> {
        return this.labelSet.originalAttributes;
    }

    /**
     * Get label hash
     */
    getLabelHash(): number {
        return this.labelSet.hash;
    }

    getStats() {
        const totalSamples = this.chunks.reduce((sum, chunk) => sum + chunk.size(), 0);
        const memoryBytes = this.chunks.reduce((sum, chunk) => sum + chunk.getMemoryUsage(), 0);

        return {
            metricName: this.metadata?.descriptor?.name ?? 'unknown',
            labels: this.labelSet?.labels ?? {},
            chunks: this.chunks.length,
            samples: totalSamples,
            memoryBytes,
            oldestTime: this.chunks[0]?.getMinTime() ?? 0,
            newestTime: this.chunks[this.chunks.length - 1]?.getMaxTime() ?? 0
        };
    }

    /**
     * Check if series has any samples
     */
    isEmpty(): boolean {
        return this.chunks.length === 0 || this.chunks.every(c => c.size() === 0);
    }

    /**
     * Get time range covered by this series
     */
    getTimeRange(): { min: number; max: number } {
        if (this.chunks.length === 0) {
            return { min: 0, max: 0 };
        }
        return {
            min: this.chunks[0].getMinTime(),
            max: this.chunks[this.chunks.length - 1].getMaxTime()
        };
    }
}
