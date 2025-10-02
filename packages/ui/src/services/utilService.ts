import backend from "./Backend";

export const utilService = {
    getHeapStats: async () => {
        const res = await backend.get("/utils/heapStats");
        return res.data;
    },
    getOpenApiSpec: async () => {
        const res = await backend.get("/utils/spec");
        return res.data;
    },
    getOasTelemetryOpenApiSpec: async () => {
        const res = await backend.get("/utils/oas-telemetry-spec");
        return res.data;
    }
};