import backend from "@/services/Backend";

export interface TraceStatus {
    active: boolean
}

export interface Span {
    _id: string
    traceId: string
    name: string
    duration: number
    timestamp: number
    attributes: {
        http?: {
            target: string
            method: string
            status_code: number
            [key: string]: any
        }
        [key: string]: any
    }
    [key: string]: any
}

export interface SpansResponse {
    spans: Span[]
}

export interface FindSpansCriteria {
    query?: Record<string, any>
    limit?: number
}

class TracesService {
    async fetchTraces() {
        try {
            const response = await backend.get(`/spans/exporters/in-memory-exporter/data`);
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async fetchTraceById(traceId: string) {
        try {
            const response = await backend.get(`/traces/${traceId}`);
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async findSpans(criteria: FindSpansCriteria): Promise<SpansResponse> {
        const { limit = 50, query = {} } = criteria;
        const sort = { timestamp: -1 }; // Descending timestamp, from New to Old

        const patchedQuery = { ...query };
        if (!Object.prototype.hasOwnProperty.call(patchedQuery, "attributes.http.method")) {
            patchedQuery["attributes.http.method"] = { $exists: true };
        }

        const res = await backend.post("/spans/exporters/in-memory-exporter/data/find", { query: patchedQuery, limit, sort });
        const spans = res.data.spans || [];
        return { spans: spans.reverse() }; // Reverse to have Oldest at top, Newest at bottom
    }

    async getStatus(): Promise<TraceStatus> {
        const res = await backend.get("/spans/exporters/in-memory-exporter/status");
        return { active: !!res.data.active };
    }

    async startCollection(): Promise<void> {
        await backend.post("/spans/exporters/in-memory-exporter/start");
    }

    async stopCollection(): Promise<void> {
        await backend.post("/spans/exporters/in-memory-exporter/stop");
    }

    async resetTraces(): Promise<void> {
        await backend.post("/spans/exporters/in-memory-exporter/reset");
    }

    async setRetentionTime(retentionTimeInSeconds: number): Promise<{ message: string }> {
        const res = await backend.post("/spans/exporters/in-memory-exporter/retention-time", { retentionTimeInSeconds });
        return { message: res.data.message };
    }

    async getRetentionTime(): Promise<number> {
        const res = await backend.get("/spans/exporters/in-memory-exporter/retention-time");
        return res.data.retentionTimeInSeconds || 0;
    }

    download(): void {
        const baseUrl = backend.defaults.baseURL;
        const downloadUrl = `${baseUrl}/spans/exporters/in-memory-exporter/export`;
        window.open(downloadUrl, '_blank');
    }

    async import(file: File, options: { reset: boolean }): Promise<void> {
        const parsed = JSON.parse(await file.text());
        const spans = Array.isArray(parsed) ? parsed : parsed?.spans;

        if (!Array.isArray(spans)) {
            throw new Error('Invalid JSON format. Expected an array or an object with a spans array.');
        }

        await backend.post(`/spans/exporters/in-memory-exporter/import?reset=${options.reset}`, { spans });
    }
}

export const traceService = new TracesService();

export const fetchTracesFromBackend = async () => {
    return traceService.fetchTraces();
};
