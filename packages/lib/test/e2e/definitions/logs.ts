import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import axios from "axios";
import { E2ETestConfig } from "../index.test";
import { startServer } from "../utils/serverStarter";
import { ChildProcess } from "child_process";

type Log = { id?: string; body?: string };
type LogsResponse = { logs: Log[]; logsCount: number };

export function defineLogsApiTests(config: E2ETestConfig) {
    const { label, port, telemetryPath } = config;
    const baseUrl = `http://localhost:${port}`;
    const telemetryUrl = `${baseUrl}${telemetryPath}`;
    const logsUrl = `${telemetryUrl}/logs`;
    const logsStatusUrl = `${logsUrl}/status`;
    const logsStartUrl = `${logsUrl}/start`;
    const logsStopUrl = `${logsUrl}/stop`;
    const logsResetUrl = `${logsUrl}/reset`;
    const generateLogUrl = `${telemetryUrl}/utils/generate-log`;
    const findLogsUrl = `${logsUrl}/find`;
    const logsRetentionTimeUrl = `${logsUrl}/retention-time`;

    describe(`Logs API Tests - ${label}`, () => {
        let serverProcess: ChildProcess | undefined;

        beforeAll(async () => {
            serverProcess = await startServer(config);
        });

        afterAll(() => {
            if (serverProcess) serverProcess.kill();
        });

        beforeEach(async () => {
            const startResponse = await axios.post(logsStartUrl).catch((err) => err.response);
            expect(startResponse.status).toBe(200);
            const resetResponse = await axios.post(logsResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);
        });

        it('[e2e][Logs:Status][+] should report status as active or inactive', async () => {
            const response = await axios.get(logsStatusUrl).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(typeof response.data.active).toBe("boolean");
        });

        it('[e2e][Logs:Start][+] should start log collection and report active status', async () => {
            const startResponse = await axios.post(logsStartUrl).catch((err) => err.response);
            expect(startResponse.status).toBe(200);

            const statusResponse = await axios.get(logsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', true);
        });

        it('[e2e][Logs:Start][+] should handle multiple start calls idempotently', async () => {
            const firstResponse = await axios.post(logsStartUrl).catch((err) => err.response);
            expect(firstResponse.status).toBe(200);

            const secondResponse = await axios.post(logsStartUrl).catch((err) => err.response);
            expect(secondResponse.status).toBe(200);

            const statusResponse = await axios.get(logsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', true);
        });

        it('[e2e][Logs:Stop][+] should stop log collection and report inactive status', async () => {
            const stopResponse = await axios.post(logsStopUrl).catch((err) => err.response);
            expect(stopResponse.status).toBe(200);

            const statusResponse = await axios.get(logsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', false);
        });

        it('[e2e][Logs:Stop][+] should handle multiple stop calls idempotently', async () => {
            const firstResponse = await axios.post(logsStopUrl).catch((err) => err.response);
            expect(firstResponse.status).toBe(200);

            const secondResponse = await axios.post(logsStopUrl).catch((err) => err.response);
            expect(secondResponse.status).toBe(200);

            const statusResponse = await axios.get(logsStatusUrl).catch((err) => err.response);
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('active', false);
        });

        it('[e2e][Logs:List][+] should store new logs when logging is active', async () => {
            const sampleLog = "ThisShouldBeStoredWhenActive";
            const generateResponse = await axios.get(`${generateLogUrl}?log=${sampleLog}`).catch((err) => err.response);
            expect(generateResponse.status).toBe(200);

            const logsResponse = await axios.get<LogsResponse>(logsUrl).catch((err) => err.response);
            expect(logsResponse.status).toBe(200);
            expect(Array.isArray(logsResponse.data.logs)).toBe(true);
            expect(logsResponse.data.logs.some((log: any) => log.body === sampleLog)).toBe(true);
        });

        it('[e2e][Logs:List][-] should not store new logs when logging is inactive', async () => {
            const stopResponse = await axios.post(logsStopUrl).catch((err) => err.response);
            expect(stopResponse.status).toBe(200);

            const sampleLog = "ThisShouldNotBeStoredWhenInactive";
            const generateResponse = await axios.get(`${generateLogUrl}?log=${sampleLog}`).catch((err) => err.response);
            expect(generateResponse.status).toBe(200);

            const logsResponse = await axios.get<LogsResponse>(logsUrl).catch((err) => err.response);
            expect(logsResponse.status).toBe(200);
            expect(Array.isArray(logsResponse.data.logs)).toBe(true);
            expect(logsResponse.data.logs.some((log: any) => log.body === sampleLog)).toBe(false);
        });

        it('[e2e][Logs:Reset][+] should reset logs', async () => {
            await axios.get(`${generateLogUrl}?log=ThisLogWillBeDeleted`).catch((err) => err.response);

            const resetResponse = await axios.post(logsResetUrl).catch((err) => err.response);
            expect(resetResponse.status).toBe(200);

            const logsResponse = await axios.get<LogsResponse>(logsUrl).catch((err) => err.response);
            expect(logsResponse.status).toBe(200);
            expect(logsResponse.data.logsCount).toBe(0);
            expect(logsResponse.data.logs.length).toBe(0);
        });

        it('[e2e][Logs:Insert][+] should insert logs without deleting existing data', async () => {
            await axios.get(`${generateLogUrl}?log=SampleLog`).catch((err) => err.response);

            const initialResponse = await axios.get<LogsResponse>(logsUrl).catch((err) => err.response);
            expect(initialResponse.status).toBe(200);
            const initialCount = initialResponse.data.logsCount;

            const insertResponse = await axios.post(logsUrl, { logs: [{ id: "test-log" }] }).catch((err) => err.response);
            expect(insertResponse.status).toBe(200);
            expect(insertResponse.data.message).toContain("Inserted");

            const afterInsertResponse = await axios.get<LogsResponse>(logsUrl).catch((err) => err.response);
            expect(afterInsertResponse.status).toBe(200);
            expect(afterInsertResponse.data.logsCount).toBe(initialCount + 1);
        });

        it('[e2e][Logs:Insert][+] should insert logs and reset existing data', async () => {
            const insertWithResetResponse = await axios.post(`${logsUrl}?reset=true`, { logs: [{ id: "test-log-reset" }] }).catch((err) => err.response);
            expect(insertWithResetResponse.status).toBe(200);
            expect(insertWithResetResponse.data.message).toContain("Inserted");

            const afterResetResponse = await axios.get<LogsResponse>(logsUrl).catch((err) => err.response);
            expect(afterResetResponse.status).toBe(200);
            expect(afterResetResponse.data.logsCount).toBe(1);
        });

        it('[e2e][Logs:Insert][-] should not insert logs and return 400 for invalid data', async () => {
            const response = await axios.post(logsUrl, { logs: "invalid-data" }).catch((err) => err.response);
            expect(response.status).toBe(400);
            expect(response.data.error).toBe("Invalid data format. Expected an array of JSON objects.");
        });

        it('[e2e][Logs:Find][+] should find logs with valid query', async () => {
            await axios.get(`${generateLogUrl}?log=LogGeneratedForFindPositiveQueryTest`).catch((err) => err.response);

            const validQuery = {
                query: {
                    "body": { "$regex": "FindPositiveQuery" }
                }
            };

            const findResponse = await axios.post(findLogsUrl, validQuery).catch((err) => err.response);
            expect(findResponse.status).toBe(200);
            expect(Array.isArray(findResponse.data.logs)).toBe(true);
            expect(findResponse.data.logs.length).toBeGreaterThan(0);
        });

        it('[e2e][Logs:Find][-] should return 400 for invalid regex configuration in query', async () => {
            const invalidQuery = {
                query: {
                    "body": { "$regex": "[invalid-regex" }
                }
            };

            const response = await axios.post(findLogsUrl, invalidQuery).catch((err) => err.response);
            expect(response.status).toBe(400);
        });


        it('[e2e][Logs:Find][+] should find by textSearch', async () => {
            const searchText = "MiniSearchText";
            const uniqueLog = `This log contains ${searchText} for text search`;
            await axios.get(`${generateLogUrl}?log=${encodeURIComponent(uniqueLog)}`).catch((err) => err.response);

            const textSearchPayload = {
                textSearch: searchText
            };

            const findResponse = await axios.post(findLogsUrl, textSearchPayload).catch((err) => err.response);
            expect(findResponse.status).toBe(200);
            expect(Array.isArray(findResponse.data.logs)).toBe(true);
            expect(findResponse.data.logs.length).toBe(1);
            expect(findResponse.data.logs[0].body).toBe(uniqueLog);
        });

        it('[e2e][Logs:Find][+] should find by textSearch and query at the same time', async () => {
            const searchText = "ComboSearchText";
            const includedLog = `This log contains ${searchText} and should be included`;
            const excludedLog = `This log contains ${searchText} and should be excluded`;

            await axios.get(`${generateLogUrl}?log=${encodeURIComponent(includedLog)}`).catch((err) => err.response);
            await axios.get(`${generateLogUrl}?log=${encodeURIComponent(excludedLog)}`).catch((err) => err.response);

            const payload = {
                textSearch: searchText,
                query: {
                    body: { "$regex": "included" }
                }
            };

            const findResponse = await axios.post(findLogsUrl, payload).catch((err) => err.response);
            expect(findResponse.status).toBe(200);
            expect(Array.isArray(findResponse.data.logs)).toBe(true);
            expect(findResponse.data.logs.length).toBe(1);
            expect(findResponse.data.logs[0].body).toBe(includedLog);
        });

        it('[e2e][Logs:RetentionTime][+] should set retention time successfully', async () => {
            const response = await axios.post(logsRetentionTimeUrl, { retentionTime: 3600 }).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(response.data.message).toContain('Retention time set to 3600 seconds.');
        });

        it('[e2e][Logs:RetentionTime][-] should return 400 for invalid retention time', async () => {
            const response = await axios.post(logsRetentionTimeUrl, { retentionTime: -1 }).catch((err) => err.response);
            expect(response.status).toBe(400);
            expect(response.data.error).toBe('Invalid retention time. Must be a positive number.');
        });
    });
}
