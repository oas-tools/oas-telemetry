import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import axios from "axios";
import { E2ETestConfig } from "../index.test";
import { startServer } from "../utils/serverStarter";
import { ChildProcess } from "child_process";

type Trace = { id?: string; name?: string };
type TracesResponse = { spans: Trace[]; spansCount: number };

export function defineTracesApiTests(config: E2ETestConfig) {
    const { label, port, telemetryPath } = config;
    const baseUrl = `http://localhost:${port}`;
    const telemetryUrl = `${baseUrl}${telemetryPath}`;
    const tracesUrl = `${telemetryUrl}/traces`;
    const tracesStatusUrl = `${tracesUrl}/status`;
    const tracesStartUrl = `${tracesUrl}/start`;
    const tracesStopUrl = `${tracesUrl}/stop`;
    const tracesResetUrl = `${tracesUrl}/reset`;
    const findTracesUrl = `${tracesUrl}/find`;
    const petsUrl = `${baseUrl}/api/v1/pets`;
    const tracesRetentionTimeUrl = `${tracesUrl}/retention-time`;

    describe(`Traces API Tests - ${label}`, () => {
        let serverProcess: ChildProcess | undefined;

        beforeAll(async () => {
            serverProcess = await startServer(config);
        });

        afterAll(() => {
            if (serverProcess) serverProcess.kill();
        });

        beforeEach(async () => {
            const startResponse = await axios.post(tracesStartUrl).catch((err) => err.response);
            expect(startResponse.status).toBe(200);
            const resetResponse = await axios.post(tracesResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);
        });

        it('[e2e][Traces:Status][+] should report status as active or inactive', async () => {
            const response = await axios.get(tracesStatusUrl).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(typeof response.data.active).toBe("boolean");
        });

        it('[e2e][Traces:Start][+] should start trace collection and report active status', async () => {
            const startResponse = await axios.post(tracesStartUrl).catch((err) => err.response);
            expect(startResponse.status).toBe(200);

            const statusResponse = await axios.get(tracesStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', true);
        });

        it('[e2e][Traces:Start][+] should handle multiple start calls idempotently', async () => {
            const firstResponse = await axios.post(tracesStartUrl).catch((err) => err.response);
            expect(firstResponse.status).toBe(200);

            const secondResponse = await axios.post(tracesStartUrl).catch((err) => err.response);
            expect(secondResponse.status).toBe(200);

            const statusResponse = await axios.get(tracesStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', true);
        });

        it('[e2e][Traces:Stop][+] should stop trace collection and report inactive status', async () => {
            const stopResponse = await axios.post(tracesStopUrl).catch((err) => err.response);
            expect(stopResponse.status).toBe(200);

            const statusResponse = await axios.get(tracesStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', false);
        });

        it('[e2e][Traces:Stop][+] should handle multiple stop calls idempotently', async () => {
            const firstResponse = await axios.post(tracesStopUrl).catch((err) => err.response);
            expect(firstResponse.status).toBe(200);

            const secondResponse = await axios.post(tracesStopUrl).catch((err) => err.response);
            expect(secondResponse.status).toBe(200);

            const statusResponse = await axios.get(tracesStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', false);
        });

        it('[e2e][Traces:List][+] should store new traces when tracing is active', async () => {
            await axios.get(petsUrl).catch((err) => err.response);

            const tracesResponse = await axios.get<TracesResponse>(tracesUrl).catch((err) => err.response);
            expect(tracesResponse.status).toBe(200);
            expect(Array.isArray(tracesResponse.data.spans)).toBe(true);
            expect(tracesResponse.data.spansCount).toBeGreaterThan(0);
        });

        it('[e2e][Traces:List][-] should not store new traces when tracing is inactive', async () => {
            const stopResponse = await axios.post(tracesStopUrl).catch((err) => err.response);
            expect(stopResponse.status).toBe(200);

            await axios.get(petsUrl).catch((err) => err.response);

            const tracesResponse = await axios.get<TracesResponse>(tracesUrl).catch((err) => err.response);
            console.log('Traces when inactive:', JSON.stringify(tracesResponse.data));
            expect(tracesResponse.status).toBe(200);
            expect(Array.isArray(tracesResponse.data.spans)).toBe(true);
            expect(tracesResponse.data.spansCount).toBe(0);
        });

        it('[e2e][Traces:Reset][+] should reset traces', async () => {
            const resetResponse = await axios.post(tracesResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);

            const tracesResponse = await axios.get<TracesResponse>(tracesUrl).catch((err) => err.response);
            expect(tracesResponse.status).toBe(200);
            console.log('Traces after reset:', JSON.stringify(tracesResponse.data));
            expect(tracesResponse.data.spansCount).toBe(0);
            expect(tracesResponse.data.spans.length).toBe(0);
        });

        it('[e2e][Traces:Insert][+] should insert traces without deleting existing data', async () => {
            const initialResponse = await axios.get<TracesResponse>(tracesUrl).catch((err) => err.response);
            expect(initialResponse.status).toBe(200);
            const initialCount = initialResponse.data.spansCount;

            const insertResponse = await axios.post(tracesUrl, { spans: [{ id: "test-trace" }] }).catch((err) => err.response);
            
            console.log('Insert response:', JSON.stringify(insertResponse.data));

            expect(insertResponse.status).toBe(200);
            expect(insertResponse.data.message).toContain("Inserted");

            const afterInsertResponse = await axios.get<TracesResponse>(tracesUrl).catch((err) => err.response);
            expect(afterInsertResponse.status).toBe(200);
            expect(afterInsertResponse.data.spansCount).toBe(initialCount + 1);
        });

        it('[e2e][Traces:Insert][+] should insert traces and reset existing data', async () => {
            const insertWithResetResponse = await axios.post(`${tracesUrl}?reset=true`, { spans: [{ id: "test-trace-reset" }] }).catch((err) => err.response);
            expect(insertWithResetResponse.status).toBe(200);
            expect(insertWithResetResponse.data.message).toContain("Inserted");

            const afterResetResponse = await axios.get<TracesResponse>(tracesUrl).catch((err) => err.response);
            console.log('Traces after reset:', JSON.stringify(afterResetResponse.data));
            expect(afterResetResponse.status).toBe(200);
            expect(afterResetResponse.data.spansCount).toBe(1);
        });

        it('[e2e][Traces:Insert][-] should not insert traces and return 400 for invalid data', async () => {
            const response = await axios.post(tracesUrl, { spans: "invalid-data" }).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Traces:Find][+] should find traces with valid query', async () => {
            await axios.get(petsUrl).catch((err) => err.response);

            const query = {
                query: {
                    "attributes.http.target": { "$regex": "^/api/v1/pets.*$" },
                    "attributes.http.method": "GET",
                    "$or": [{ "attributes.http.status_code": { "$lte": 400 } }],
                },
            };

            const findResponse = await axios.post(findTracesUrl, query).catch((err) => err.response);
            expect(findResponse.status).toBe(200);
            expect(findResponse.data.spansCount).toBeGreaterThan(0);
            expect(Array.isArray(findResponse.data.spans)).toBe(true);
        });

        it('[e2e][Traces:Find][-] should return 400 for invalid regex configuration', async () => {
            const invalidQuery = {
                query: {
                    "attributes.http.target": { "$regex": "[invalid-regex" },
                    "attributes.http.method": "GET",
                    "$or": [{ "attributes.http.status_code": { "$lte": 400 } }],
                },
            };

            const response = await axios.post(findTracesUrl, invalidQuery).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Traces:RetentionTime][+] should get retention time successfully', async () => {
            const response = await axios.get(tracesRetentionTimeUrl).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(response.data.retentionTimeInSeconds).toBe(3600);
        });

        it('[e2e][Traces:RetentionTime][+] should set retention time successfully', async () => {
            const response = await axios.post(tracesRetentionTimeUrl, { retentionTimeInSeconds: 3600 }).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(response.data.message).toContain('Retention time set to 3600 seconds.');
        });

        it('[e2e][Traces:RetentionTime][-] should return 400 for invalid retention time', async () => {
            const response = await axios.post(tracesRetentionTimeUrl, { retentionTimeInSeconds: -1 }).catch((err) => err.response);
            expect(response.status).toBe(400);
            expect(response.data.error).toBe('Invalid retention time. Must be a positive number.');
        });
    });
}
