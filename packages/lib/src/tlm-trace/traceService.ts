import { inMemoryDbSpanExporter } from '../telemetry/telemetryRegistry.js';

export function sanitizeTraceRecords(records: any[]): any[] {
    return records.map((record: any) => {
        const { _id, ...rest } = record;
        return rest;
    });
}

export async function importTracesToMemory(records: any[], options?: { reset?: boolean }): Promise<number> {
    if (options?.reset) {
        inMemoryDbSpanExporter.reset();
    }

    if (!records.length) {
        return 0;
    }

    await new Promise<void>((resolve, reject) => {
        inMemoryDbSpanExporter.insert(records, (err: any) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });

    return records.length;
}
