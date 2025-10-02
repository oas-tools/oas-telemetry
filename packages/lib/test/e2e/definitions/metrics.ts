import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import axios from "axios";
import { E2ETestConfig } from "../index.test";
import { startServer } from "../utils/serverStarter";
import { ChildProcess } from "child_process";
import { retry } from "../utils/retry";

type Metric = { id?: string; name?: string };
type MetricsResponse = { metrics: Metric[]; metricsCount: number };

/*
[!] IMPORTANT: 
If a test name contains `[!]`, it means that metrics are collected automatically every X milliseconds.
This can affect test results, especially when expecting a precise count of metrics after a reset or insert operation.
For example, even after a reset, the system may automatically export and insert 1 or 2 metrics before the test code executes.
Therefore, you should **NOT** use `expect(...).toBe(0)` or any assertion that expects an exact metric count in these cases.
Instead, insert a large quantity of metrics manually and use assertions that check if the count is within an expected range.
This approach accounts for the possibility of a few automatically inserted metrics during test execution.
 */

export function defineMetricsApiTests(config: E2ETestConfig) {
    const { label, port, telemetryPath } = config;
    const baseUrl = `http://localhost:${port}`;
    const telemetryUrl = `${baseUrl}${telemetryPath}`;
    const metricsUrl = `${telemetryUrl}/metrics`;
    const metricsStatusUrl = `${metricsUrl}/status`;
    const metricsStartUrl = `${metricsUrl}/start`;
    const metricsStopUrl = `${metricsUrl}/stop`;
    const metricsResetUrl = `${metricsUrl}/reset`;
    const findMetricsUrl = `${metricsUrl}/find`;
    const metricsRetentionTimeUrl = `${metricsUrl}/retention-time`;

    describe(`Metrics API Tests - ${label}`, () => {
        let serverProcess: ChildProcess | undefined;

        beforeAll(async () => {
            process.env.OASTLM_CONFIG_METRICS_MAIN_READER_EXPORT_INTERVAL = "250";
            serverProcess = await startServer(config);
        });

        afterAll(() => {
            if (serverProcess) serverProcess.kill();
        });

        beforeEach(async () => {
            const startResponse = await axios.post(metricsStartUrl).catch((err) => err.response);
            expect(startResponse.status).toBe(200);
            const resetResponse = await axios.post(metricsResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);
        });

        it('[e2e][Metrics:Status][+] should report status as active or inactive', async () => {
            const response = await axios.get(metricsStatusUrl).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(typeof response.data.active).toBe("boolean");
        });

        it('[e2e][Metrics:Start][+] should start metrics collection and report active status', async () => {
            const startResponse = await axios.post(metricsStartUrl).catch((err) => err.response);
            expect(startResponse.status).toBe(200);

            const statusResponse = await axios.get(metricsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', true);
        });

        it('[e2e][Metrics:Start][+] should handle multiple start calls idempotently', async () => {
            const firstResponse = await axios.post(metricsStartUrl).catch((err) => err.response);
            expect(firstResponse.status).toBe(200);

            const secondResponse = await axios.post(metricsStartUrl).catch((err) => err.response);
            expect(secondResponse.status).toBe(200);

            const statusResponse = await axios.get(metricsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', true);
        });

        it('[e2e][Metrics:Stop][+] should stop metrics collection and report inactive status', async () => {
            const stopResponse = await axios.post(metricsStopUrl).catch((err) => err.response);
            expect(stopResponse.status).toBe(200);

            const statusResponse = await axios.get(metricsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', false);
        });

        it('[e2e][Metrics:Stop][+] should handle multiple stop calls idempotently', async () => {
            const firstResponse = await axios.post(metricsStopUrl).catch((err) => err.response);
            expect(firstResponse.status).toBe(200);

            const secondResponse = await axios.post(metricsStopUrl).catch((err) => err.response);
            expect(secondResponse.status).toBe(200);

            const statusResponse = await axios.get(metricsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', false);
        });

        it('[e2e][Metrics:List][+][!] should store new metrics when metrics is active', async () => {
            await retry(async () => {
                const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
                expect(metricsResponse.status).toBe(200);
                expect(metricsResponse.data.metricsCount).toBeGreaterThan(0);
            }, { timeout: 3000, interval: 100 });
        });

        it('[e2e][Metrics:List][-][!] should not store new metrics when metrics is inactive', async () => {
            const stopResponse = await axios.post(metricsStopUrl).catch((err) => err.response);
            expect(stopResponse.status).toBe(200);

            const resetResponse = await axios.post(metricsResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);

            await retry(async () => {
                const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
                expect(metricsResponse.status).toBe(200);
                expect(metricsResponse.data.metricsCount).toBe(0);
            }, { timeout: 3000, interval: 100 });
        });

        it('[e2e][Metrics:Reset][+][!] should reset metrics and set metricsCount to zero', async () => {
            const metricsToInsert = Array.from({ length: 100 }, (_, i) => ({ id: `test-metric-reset-100-${i}` }));
            const insertResponse = await axios.post(metricsUrl, { metrics: metricsToInsert }).catch((err) => err.response);
            expect(insertResponse.status).toBe(200);

            const resetResponse = await axios.post(metricsResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);

            const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(metricsResponse.status).toBe(200);
            expect(metricsResponse.data.metricsCount).toBeLessThan(50);
            expect(metricsResponse.data.metrics.length).toBeLessThan(50);
        });

        it('[e2e][Metrics:Insert][+][!] should insert metrics without deleting existing data', async () => {
            const initialResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(initialResponse.status).toBe(200);
            const initialCount = initialResponse.data.metricsCount;

            const metricsToInsert = Array.from({ length: 100 }, (_, i) => ({ id: `test-metric-insert-100-${i}` }));
            const insertResponse = await axios.post(metricsUrl, { metrics: metricsToInsert }).catch((err) => err.response);
            expect(insertResponse.status).toBe(200);
            expect(insertResponse.data.message).toContain("Inserted");

            const afterInsertResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(afterInsertResponse.status).toBe(200);
            expect(afterInsertResponse.data.metricsCount).toBeGreaterThanOrEqual(initialCount + 100);
        });

        it('[e2e][Metrics:Insert][+][!] should insert metrics and reset existing data', async () => {
            const metricsToInsert100 = Array.from({ length: 100 }, (_, i) => ({ id: `test-metric-insert-100-${i}` }));
            const insert100Response = await axios.post(metricsUrl, { metrics: metricsToInsert100 }).catch((err) => err.response);
            expect(insert100Response.status).toBe(200);

            const metricsToInsert50 = Array.from({ length: 50 }, (_, i) => ({ id: `test-metric-reset-50-${i}` }));
            const insertWithResetResponse = await axios.post(`${metricsUrl}?reset=true`, { metrics: metricsToInsert50 }).catch((err) => err.response);
            expect(insertWithResetResponse.status).toBe(200);
            expect(insertWithResetResponse.data.message).toContain("Inserted");

            const afterResetResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(afterResetResponse.status).toBe(200);
            expect(afterResetResponse.data.metricsCount).toBeGreaterThanOrEqual(50);
            expect(afterResetResponse.data.metricsCount).toBeLessThan(150);
        });

        it('[e2e][Metrics:Insert][-] should not insert metrics and return 400 for invalid data', async () => {
            const response = await axios.post(metricsUrl, { metrics: "invalid-data" }).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Metrics:Find][+] should find metrics with valid query', async () => {
            // Insert two metrics in a single POST request
            const insertResponse = await axios.post(metricsUrl, {
                metrics: [
                    { id: "metric-1", name: "test-metric-1" },
                    { id: "metric-2", name: "other-metric" }
                ]
            }).catch((err) => err.response);
            expect(insertResponse.status).toBe(200);
            expect(insertResponse.data.message).toContain("Inserted");

            // Search for metrics with a regex matching part of the string
            const query = {
                query: {
                    "name": { "$regex": "test-metric" } // Matches "test-metric-1"
                }
            };

            const findResponse = await axios.post(findMetricsUrl, query).catch((err) => err.response);
            expect(findResponse.status).toBe(200);
            expect(Array.isArray(findResponse.data.metrics)).toBe(true);
            expect(findResponse.data.metrics.length).toBe(1);
            expect(findResponse.data.metrics[0].name).toBe("test-metric-1");
        });

        it('[e2e][Metrics:Find][-] should return 400 for invalid regex configuration', async () => {
            const invalidQuery = {
                query: {
                    "name": { "$regex": "[invalid-regex" }
                }
            };

            const response = await axios.post(findMetricsUrl, invalidQuery).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Metrics:RetentionTime][+] should get retention time successfully', async () => {
            const response = await axios.get(metricsRetentionTimeUrl).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(response.data.retentionTimeInSeconds).toBe(3600);
        });

        it('[e2e][Metrics:RetentionTime][+] should set retention time successfully', async () => {
            const response = await axios.post(metricsRetentionTimeUrl, { retentionTimeInSeconds: 3600 }).catch((err) => err.response);
            expect(response.status).toBe(200);
        });

        it('[e2e][Metrics:RetentionTime][-] should return 400 for invalid retention time', async () => {
            const response = await axios.post(metricsRetentionTimeUrl, { retentionTimeInSeconds: -1 }).catch((err) => err.response);
            expect(response.status).toBe(400);
        });
    });
}
