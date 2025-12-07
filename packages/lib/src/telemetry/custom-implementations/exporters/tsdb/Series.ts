/**
 * Series: Time-series storage with metadata and chunks
 * One series per unique metric+labels combination
 */

import { Chunk } from './Chunk.js';
import { MetricMetadata, Sample, LabelSet, HistogramValue } from './types.js';

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
    append(timestamp: number, value: number | HistogramValue): void {
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

        currentChunk.append(timestamp, value);
    }

    /**
     * Get all samples within time range
     */
    querySamples(startTime?: number, endTime?: number): Sample[] {
        const samples: Sample[] = [];
        
        // If no time range specified, get all samples
        if (startTime === undefined && endTime === undefined) {
            for (const chunk of this.chunks) {
                samples.push(...chunk.getSamples());
            }
        } else {
            const start = startTime ?? 0;
            const end = endTime ?? Number.MAX_SAFE_INTEGER;
            
            for (const chunk of this.chunks) {
                if (chunk.overlaps(start, end)) {
                    samples.push(...chunk.getSamples(start, end));
                }
            }
        }

        return samples;
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

    /**
     * Get label set
     */
    getLabels(): Record<string, any> {
        return this.labelSet.labels;
    }

    /**
     * Get label hash
     */
    getLabelHash(): number {
        return this.labelSet.hash;
    }

    /**
     * Get series statistics
     */
    getStats() {
        const totalSamples = this.chunks.reduce((sum, chunk) => sum + chunk.size(), 0);
        const memoryBytes = this.chunks.reduce((sum, chunk) => sum + chunk.getMemoryUsage(), 0);
        
        return {
            metricKey: this.metadata.metricKey,
            labels: this.labelSet.labels,
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
