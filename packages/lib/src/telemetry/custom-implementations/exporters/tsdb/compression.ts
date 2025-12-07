/**
 * Compression utilities for time-series data
 * Implements delta encoding and Gorilla-style XOR compression
 */

/**
 * Delta encoder for timestamps
 * Stores first timestamp as base, then deltas
 */
export class DeltaEncoder {
    private base: number = 0;
    private lastValue: number = 0;

    reset(base: number): void {
        this.base = base;
        this.lastValue = base;
    }

    encode(value: number): number {
        const delta = value - this.lastValue;
        this.lastValue = value;
        return delta;
    }

    decode(delta: number): number {
        this.lastValue += delta;
        return this.lastValue;
    }

    getBase(): number {
        return this.base;
    }
}

/**
 * XOR encoder for floating point values (Gorilla compression)
 * Stores first value as-is, then XOR deltas with leading/trailing zero compression
 */
export class XOREncoder {
    private lastValue: number = 0;
    private lastValueBits: bigint = 0n;

    reset(value: number): void {
        this.lastValue = value;
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, value);
        this.lastValueBits = view.getBigUint64(0);
    }

    encode(value: number): { xor: bigint; leadingZeros: number; trailingZeros: number } {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, value);
        const valueBits = view.getBigUint64(0);
        
        const xor = valueBits ^ this.lastValueBits;
        this.lastValueBits = valueBits;
        this.lastValue = value;

        if (xor === 0n) {
            return { xor: 0n, leadingZeros: 64, trailingZeros: 64 };
        }

        const leadingZeros = this.countLeadingZeros(xor);
        const trailingZeros = this.countTrailingZeros(xor);

        return { xor, leadingZeros, trailingZeros };
    }

    decode(xor: bigint): number {
        this.lastValueBits ^= xor;
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, this.lastValueBits);
        this.lastValue = view.getFloat64(0);
        return this.lastValue;
    }

    private countLeadingZeros(n: bigint): number {
        if (n === 0n) return 64;
        let count = 0;
        let mask = 1n << 63n;
        while ((n & mask) === 0n && count < 64) {
            count++;
            mask >>= 1n;
        }
        return count;
    }

    private countTrailingZeros(n: bigint): number {
        if (n === 0n) return 64;
        let count = 0;
        while ((n & 1n) === 0n && count < 64) {
            count++;
            n >>= 1n;
        }
        return count;
    }
}

/**
 * Simple hash function for label sets
 */
export function hashLabels(labels: Record<string, any>): number {
    const str = JSON.stringify(sortObject(labels));
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash >>> 0; // Ensure unsigned
}

/**
 * Sort object keys for consistent hashing
 */
function sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);
    
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
        sorted[key] = sortObject(obj[key]);
    });
    return sorted;
}
