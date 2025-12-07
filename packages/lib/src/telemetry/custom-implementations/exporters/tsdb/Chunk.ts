/**
 * Chunk: Fixed-size compressed storage for time-series samples
 * Prometheus-style chunk with TypedArrays for efficient storage
 */

import { Sample, HistogramValue } from './types.js';

export class Chunk {
    private readonly maxSamples: number;
    private readonly timestamps: Float64Array;
    private readonly values: Float64Array;
    private readonly histogramData: Map<number, HistogramValue>; // index -> histogram
    private cursor: number = 0;
    private minTime: number = 0;
    private maxTime: number = 0;
    private readonly isHistogram: boolean;

    constructor(maxSamples: number = 120, isHistogram: boolean = false) {
        this.maxSamples = maxSamples;
        this.timestamps = new Float64Array(maxSamples);
        this.values = new Float64Array(maxSamples);
        this.histogramData = new Map();
        this.isHistogram = isHistogram;
    }

    /**
     * Append a sample to the chunk
     * Returns true if successful, false if chunk is full
     */
    append(timestamp: number, value: number | HistogramValue): boolean {
        if (this.cursor >= this.maxSamples) {
            return false;
        }

        if (this.cursor === 0) {
            this.minTime = timestamp;
        }

        this.timestamps[this.cursor] = timestamp;

        if (this.isHistogram && typeof value === 'object') {
            // Store histogram separately
            this.values[this.cursor] = value.sum; // Use sum as primary value for queries
            this.histogramData.set(this.cursor, value);
        } else if (typeof value === 'number') {
            this.values[this.cursor] = value;
        } else {
            // Fallback: convert histogram to sum
            this.values[this.cursor] = (value as HistogramValue).sum;
            this.histogramData.set(this.cursor, value as HistogramValue);
        }

        this.maxTime = timestamp;
        this.cursor++;
        return true;
    }

    /**
     * Get all samples in the chunk within time range
     */
    getSamples(startTime?: number, endTime?: number): Sample[] {
        const samples: Sample[] = [];
        
        // If no time range, return all samples
        if (startTime === undefined && endTime === undefined) {
            for (let i = 0; i < this.cursor; i++) {
                const histValue = this.histogramData.get(i);
                samples.push({
                    timestamp: this.timestamps[i],
                    value: histValue ?? this.values[i]
                });
            }
            return samples;
        }
        
        // Filter by time range
        const start = startTime ?? 0;
        const end = endTime ?? Number.MAX_SAFE_INTEGER;

        for (let i = 0; i < this.cursor; i++) {
            const ts = this.timestamps[i];
            if (ts >= start && ts <= end) {
                const histValue = this.histogramData.get(i);
                samples.push({
                    timestamp: ts,
                    value: histValue ?? this.values[i]
                });
            }
        }

        return samples;
    }

    /**
     * Check if chunk overlaps with time range
     */
    overlaps(startTime: number, endTime: number): boolean {
        // Empty chunk doesn't overlap
        if (this.cursor === 0) {
            return false;
        }
        return !(this.maxTime < startTime || this.minTime > endTime);
    }

    /**
     * Check if chunk is full
     */
    isFull(): boolean {
        return this.cursor >= this.maxSamples;
    }

    /**
     * Get chunk statistics
     */
    getStats() {
        return {
            samples: this.cursor,
            maxSamples: this.maxSamples,
            minTime: this.minTime,
            maxTime: this.maxTime,
            memoryBytes: this.getMemoryUsage()
        };
    }

    /**
     * Calculate memory usage in bytes
     */
    getMemoryUsage(): number {
        // TypedArrays: 8 bytes per element
        const arrayMemory = this.maxSamples * 8 * 2; // timestamps + values
        // Histograms: rough estimate
        const histogramMemory = this.histogramData.size * 200; // ~200 bytes per histogram
        return arrayMemory + histogramMemory;
    }

    /**
     * Get min timestamp
     */
    getMinTime(): number {
        return this.minTime;
    }

    /**
     * Get max timestamp
     */
    getMaxTime(): number {
        return this.maxTime;
    }

    /**
     * Get number of samples
     */
    size(): number {
        return this.cursor;
    }
}
