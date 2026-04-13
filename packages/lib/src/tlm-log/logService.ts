import { inMemoryDbLogExporter } from '../telemetry/telemetryRegistry.js';

export function sanitizeLogRecords(records: any[]): any[] {
    return records.map((record: any) => {
        const { _id, ...rest } = record;
        return rest;
    });
}

export async function importLogsToMemory(records: any[], options?: { reset?: boolean }): Promise<number> {
    if (options?.reset) {
        inMemoryDbLogExporter.reset();
    }

    if (!records.length) {
        return 0;
    }

    await new Promise<void>((resolve, reject) => {
        inMemoryDbLogExporter.insert(records, (err: any) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });

    return records.length;
}
