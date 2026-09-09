import { Sample, HistogramValue } from './types.js';

export class Chunk {
    private readonly maxSamples: number;
    private readonly startTimes: Float64Array;
    private readonly endTimes: Float64Array;
    private readonly values: Float64Array;
    private readonly histograms: (HistogramValue | null)[];
    private cursor: number = 0;
    private minEndTime: number = 0;
    private maxEndTime: number = 0;
    private readonly isHistogram: boolean;
    private createdAt: number;

    constructor(maxSamples: number = 120, isHistogram: boolean = false) {
        this.maxSamples = maxSamples;
        this.startTimes = new Float64Array(maxSamples);
        this.endTimes = new Float64Array(maxSamples);
        this.values = new Float64Array(maxSamples);
        this.histograms = new Array(maxSamples).fill(null);
        this.isHistogram = isHistogram;
        this.createdAt = Date.now();
    }

    /**
     * Append a sample to the chunk.
     * Returns true if successful or false if the chunk is full.
     */
    append(startTime: number, endTime: number, value: number | HistogramValue): boolean {
        if (this.cursor >= this.maxSamples) {
            return false;
        }

        if (this.cursor === 0) {
            this.minEndTime = endTime;
        }

        this.startTimes[this.cursor] = startTime;
        this.endTimes[this.cursor] = endTime;

        if (this.isHistogram && typeof value === 'object') {
            this.values[this.cursor] = value.count;
            this.histograms[this.cursor] = value;
        } else if (typeof value === 'number') {
            this.values[this.cursor] = value;
            this.histograms[this.cursor] = null;
        } else {
            const hv = value as HistogramValue;
            this.values[this.cursor] = hv.count;
            this.histograms[this.cursor] = hv;
        }

        this.maxEndTime = endTime;
        this.cursor++;
        return true;
    }

    /**
     * Binary search for first index with endTime >= targetTime
     */
    private _binarySearchStart(targetTime: number): number {
        let left = 0;
        let right = this.cursor - 1;
        let result = this.cursor;

        while (left <= right) {
            const mid = (left + right) >> 1;
            if (this.endTimes[mid] >= targetTime) {
                result = mid;
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        return result;
    }

    /**
     * Binary search for last index with endTime <= targetTime
     */
    private _binarySearchEnd(targetTime: number, startIdx = 0): number {
        let left = startIdx;
        let right = this.cursor - 1;
        let result = startIdx - 1;

        while (left <= right) {
            const mid = (left + right) >> 1;
            if (this.endTimes[mid] <= targetTime) {
                result = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return result;
    }

    /**
     * Efficient slicing method for bulk operations.
     * Always returns slices. Values can be either a Float64Array (numeric)
     * or a JS array of HistogramValue objects (histogram series).
     */
    getSlices(startTime?: number, endTime?: number): {
        startTimes: Float64Array;
        endTimes: Float64Array;
        values: Float64Array | (HistogramValue | null)[];
    } {
        const emptyResult = {
            startTimes: new Float64Array(0),
            endTimes: new Float64Array(0),
            values: this.isHistogram ? [] : new Float64Array(0),
        };

        const start = startTime ?? 0;
        const end = endTime ?? Number.MAX_SAFE_INTEGER;

        if (this.cursor === 0 || this.maxEndTime < start || this.minEndTime > end) {
            return emptyResult;
        }

        const startIdx = this._binarySearchStart(start);
        const endIdx = this._binarySearchEnd(end, startIdx);

        if (startIdx > endIdx) {
            return emptyResult;
        }

        const startTimesNew = this.startTimes.subarray(startIdx, endIdx + 1);
        const endTimesNew = this.endTimes.subarray(startIdx, endIdx + 1);

        if (this.isHistogram) {
            // Return histogram objects as a simple JS array slice
            return {
                startTimes: startTimesNew,
                endTimes: endTimesNew,
                values: this.histograms.slice(startIdx, endIdx + 1),
            };
        }
        return {
            startTimes: startTimesNew,
            endTimes: endTimesNew,
            values: this.values.subarray(startIdx, endIdx + 1),
        };


    }

    isFull(): boolean {
        return this.cursor >= this.maxSamples;
    }

    overlaps(startTime: number, endTime: number): boolean {
        if (this.cursor === 0) return false;
        return !(this.maxEndTime < startTime || this.minEndTime > endTime);
    }

    getStats() {
        return {
            samples: this.cursor,
            maxSamples: this.maxSamples,
            minEndTime: this.minEndTime,
            maxEndTime: this.maxEndTime,
            memoryBytes: this.getMemoryUsage(),
        };
    }

    getMemoryUsage(): number {
        const arrayMemory = this.maxSamples * 8 * 3;
        const histogramMemory = this.histograms.filter(h => h !== null).length * 200;
        return arrayMemory + histogramMemory;
    }

    getMinTime(): number {
        return this.minEndTime;
    }

    getMaxTime(): number {
        return this.maxEndTime;
    }

    size(): number {
        return this.cursor;
    }

    getCreatedAt(): number {
        return this.createdAt;
    }
}
