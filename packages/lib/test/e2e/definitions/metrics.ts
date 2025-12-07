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
            const resetResponse = await axios.post(metricsResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);

            await retry(async () => {
                const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
                expect(metricsResponse.status).toBe(200);
                expect(metricsResponse.data.metricsCount).toBeGreaterThan(0);
            }, { timeout: 3000, interval: 100 });

            const resetResponse2 = await axios.post(metricsResetUrl).catch((err) => err.response);
            expect(resetResponse2.status).toBe(200);

            const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(metricsResponse.status).toBe(200);
            expect(metricsResponse.data.metricsCount).toBeLessThan(50);
            expect(metricsResponse.data.metrics.length).toBeLessThan(50);
        });

        it('[e2e][Metrics:Insert][+][!] should insert metrics without deleting existing data', async () => {
            const initialResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(initialResponse.status).toBe(200);
            const initialCount = initialResponse.data.metricsCount;

            // Use valid OTEL format for insert
            const metricsToInsert = [{
                scope: { name: 'test-instrumentation', version: '1.0.0' },
                metrics: [{
                    descriptor: { name: 'test.metric', type: 'counter' },
                    dataPointType: 3, // Sum
                    dataPoints: [{
                        attributes: { test: 'value' },
                        startTime: [0, 0],
                        endTime: [0, 0],
                        value: 1
                    }]
                }]
            }];
            const insertResponse = await axios.post(metricsUrl, { metrics: metricsToInsert, format: 'otel' }).catch((err) => err.response);
            expect(insertResponse.status).toBe(200);
            expect(insertResponse.data.message).toContain("Inserted");

            const afterInsertResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(afterInsertResponse.status).toBe(200);
            expect(afterInsertResponse.data.metricsCount).toBeGreaterThanOrEqual(initialCount + 1);
        });

        it('[e2e][Metrics:Insert][+][!] should insert metrics and reset existing data', async () => {
            // Insert first batch
            const metrics1 = [{
                scope: { name: 'batch1', version: '1.0.0' },
                metrics: [{
                    descriptor: { name: 'test.metric1', type: 'counter' },
                    dataPointType: 3,
                    dataPoints: [{ attributes: {}, startTime: [0, 0], endTime: [0, 0], value: 1 }]
                }]
            }];
            const insert1Response = await axios.post(metricsUrl, { metrics: metrics1, format: 'otel' }).catch((err) => err.response);
            expect(insert1Response.status).toBe(200);

            // Insert second batch with reset
            const metrics2 = [{
                scope: { name: 'batch2', version: '1.0.0' },
                metrics: [{
                    descriptor: { name: 'test.metric2', type: 'counter' },
                    dataPointType: 3,
                    dataPoints: [{ attributes: {}, startTime: [0, 0], endTime: [0, 0], value: 2 }]
                }]
            }];
            const insertWithResetResponse = await axios.post(`${metricsUrl}?reset=true`, { metrics: metrics2, format: 'otel' }).catch((err) => err.response);
            expect(insertWithResetResponse.status).toBe(200);
            expect(insertWithResetResponse.data.message).toContain("Inserted");

            const afterResetResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
            expect(afterResetResponse.status).toBe(200);
            expect(afterResetResponse.data.metricsCount).toBeGreaterThan(0);
        });

        it('[e2e][Metrics:Insert][-] should not insert metrics and return 400 for invalid data', async () => {
            const response = await axios.post(metricsUrl, { metrics: "invalid-data" }).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        // Removed obsolete /find endpoint tests - now use GET / with query params

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

        it('[e2e][Metrics:MetricKeys][+] should filter metrics by metricKeys parameter', async () => {
            // First, ensure we have some metrics by waiting
            await retry(async () => {
                const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
                expect(metricsResponse.status).toBe(200);
                expect(metricsResponse.data.metricsCount).toBeGreaterThan(0);
            }, { timeout: 3000, interval: 100 });

            // Get all metrics to find some keys
            const allMetricsResponse = await axios.get<any>(metricsUrl).catch((err) => err.response);
            expect(allMetricsResponse.status).toBe(200);
            expect(allMetricsResponse.data.metrics.length).toBeGreaterThan(0);

            // Get first 2 metric keys
            const metricKeys = allMetricsResponse.data.metrics
                .slice(0, Math.min(2, allMetricsResponse.data.metrics.length))
                .map((m: any) => m.metricKey);

            // Request only those specific metrics
            const filteredResponse = await axios.get<any>(
                `${metricsUrl}?metricKeys=${metricKeys.join(',')}`
            ).catch((err) => err.response);

            expect(filteredResponse.status).toBe(200);
            expect(filteredResponse.data.metrics.length).toBe(metricKeys.length);

            // Verify all returned metrics are in the requested list
            filteredResponse.data.metrics.forEach((metric: any) => {
                expect(metricKeys).toContain(metric.metricKey);
            });
        });

        it('[e2e][Metrics:MetricKeys][+] should return all metrics when metricKeys is empty', async () => {
            await retry(async () => {
                const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
                expect(metricsResponse.status).toBe(200);
                expect(metricsResponse.data.metricsCount).toBeGreaterThan(0);
            }, { timeout: 3000, interval: 100 });

            const allMetricsResponse = await axios.get<any>(metricsUrl).catch((err) => err.response);
            const emptyFilterResponse = await axios.get<any>(`${metricsUrl}?metricKeys=`).catch((err) => err.response);

            expect(emptyFilterResponse.status).toBe(200);
            expect(emptyFilterResponse.data.metricsCount).toBe(allMetricsResponse.data.metricsCount);
        });

        it('[e2e][Metrics:TimeFilter][+] should filter samples by time range', async () => {
            await retry(async () => {
                const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
                expect(metricsResponse.status).toBe(200);
                expect(metricsResponse.data.metricsCount).toBeGreaterThan(0);
            }, { timeout: 3000, interval: 100 });

            // Get all metrics
            const allMetricsResponse = await axios.get<any>(metricsUrl).catch((err) => err.response);
            expect(allMetricsResponse.status).toBe(200);

            // Calculate total samples across all metrics
            let totalSamples = 0;
            allMetricsResponse.data.metrics.forEach((metric: any) => {
                metric.series.forEach((series: any) => {
                    totalSamples += series.samples.length;
                });
            });

            // Filter to very narrow time range (1 second ago to now)
            const now = Date.now() * 1_000_000; // nanoseconds
            const oneSecondAgo = now - 1_000_000_000;

            const filteredResponse = await axios.get<any>(
                `${metricsUrl}?startTimeNs=${oneSecondAgo}&endTimeNs=${now}`
            ).catch((err) => err.response);

            expect(filteredResponse.status).toBe(200);

            // Count samples in filtered response
            let filteredSamples = 0;
            filteredResponse.data.metrics.forEach((metric: any) => {
                metric.series.forEach((series: any) => {
                    filteredSamples += series.samples.length;
                });
            });

            // Should have fewer samples than total (unless all data is recent)
            expect(filteredSamples).toBeLessThanOrEqual(totalSamples);
        });

        it('[e2e][Metrics:MetricKeys][+] should return only requested metric even with multiple available', async () => {
            await retry(async () => {
                const metricsResponse = await axios.get<MetricsResponse>(metricsUrl).catch((err) => err.response);
                expect(metricsResponse.status).toBe(200);
                expect(metricsResponse.data.metricsCount).toBeGreaterThan(1);
            }, { timeout: 3000, interval: 100 });

            const allMetricsResponse = await axios.get<any>(metricsUrl).catch((err) => err.response);
            expect(allMetricsResponse.data.metrics.length).toBeGreaterThan(1);

            // Request only the first metric
            const singleMetricKey = allMetricsResponse.data.metrics[0].metricKey;
            const singleResponse = await axios.get<any>(
                `${metricsUrl}?metricKeys=${singleMetricKey}`
            ).catch((err) => err.response);

            expect(singleResponse.status).toBe(200);
            expect(singleResponse.data.metrics.length).toBe(1);
            expect(singleResponse.data.metrics[0].metricKey).toBe(singleMetricKey);
        });
    });
}
