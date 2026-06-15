import { describe, expect, it, beforeAll, afterAll } from "vitest";
import axios from "axios";
import { E2ETestConfig } from "../index.test";
import { startServer } from "../utils/serverStarter";
import { ChildProcess } from "child_process";
import path from "path";

const validSpecPath = path.resolve(process.cwd(), "test/e2e/fixtures/valid-spec.json");
const invalidSpecPath = path.resolve(process.cwd(), "test/e2e/fixtures/non-existent-spec.json");

function stopServer(proc: ChildProcess | undefined): Promise<void> {
    return new Promise((resolve) => {
        if (!proc || proc.killed) {
            resolve();
            return;
        }
        proc.once("exit", () => {
            resolve();
        });
        proc.kill();
    });
}

export function defineUtilsApiTests(config: E2ETestConfig) {
    const { label, port, telemetryPath } = config;
    const baseUrl = `http://localhost:${port}`;
    const telemetryUrl = `${baseUrl}${telemetryPath}`;
    const utilsUrl = `${telemetryUrl}/utils`;

    describe(`Utils API Tests - ${label}`, () => {

        describe("Case: specFileName and spec given", () => {
            let serverProcess: ChildProcess | undefined;
            beforeAll(async () => {
                serverProcess = await startServer({
                    ...config,
                    additionalEnv: {
                        ...config.additionalEnv,
                        OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME: validSpecPath
                    }
                });
            });
            afterAll(async () => {
                await stopServer(serverProcess);
            });
            it("should return the spec loaded from the file", async () => {
                const response = await axios.get(`${utilsUrl}/spec`).catch(err => err.response);
                expect(response.status).toBe(200);
                expect(response.data.info.title).toBe("Valid Spec for Testing");
            });
        });

        describe("Case: only specFileName given", () => {
            let serverProcess: ChildProcess | undefined;
            beforeAll(async () => {
                serverProcess = await startServer({
                    ...config,
                    additionalEnv: {
                        ...config.additionalEnv,
                        OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME: validSpecPath,
                        OASTLM_TEST_NO_SPEC: "true"
                    }
                });
            });
            afterAll(async () => {
                await stopServer(serverProcess);
            });
            it("should return the spec loaded from the file", async () => {
                const response = await axios.get(`${utilsUrl}/spec`).catch(err => err.response);
                expect(response.status).toBe(200);
                expect(response.data.info.title).toBe("Valid Spec for Testing");
            });
        });

        describe("Case: invalid specFileName given", () => {
            let serverProcess: ChildProcess | undefined;
            beforeAll(async () => {
                serverProcess = await startServer({
                    ...config,
                    additionalEnv: {
                        ...config.additionalEnv,
                        OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME: invalidSpecPath,
                        OASTLM_TEST_NO_SPEC: "true"
                    }
                });
            });
            afterAll(async () => {
                await stopServer(serverProcess);
            });
            it("should return 404 not found", async () => {
                const response = await axios.get(`${utilsUrl}/spec`).catch(err => err.response);
                expect(response.status).toBe(404);
            });
        });

        describe("Case: only spec given", () => {
            let serverProcess: ChildProcess | undefined;
            beforeAll(async () => {
                serverProcess = await startServer({
                    ...config,
                    additionalEnv: {
                        ...config.additionalEnv
                    }
                });
            });
            afterAll(async () => {
                await stopServer(serverProcess);
            });
            it("should return the spec defined in userConfig", async () => {
                const response = await axios.get(`${utilsUrl}/spec`).catch(err => err.response);
                expect(response.status).toBe(200);
                expect(response.data.paths).toBeDefined();
                expect(response.data.paths["/api/v1/pets"]).toBeDefined();
            });
        });

        describe("Case: invalid spec given", () => {
            let serverProcess: ChildProcess | undefined;
            beforeAll(async () => {
                serverProcess = await startServer({
                    ...config,
                    additionalEnv: {
                        ...config.additionalEnv,
                        OASTLM_TEST_INVALID_SPEC: "true"
                    }
                });
            });
            afterAll(async () => {
                await stopServer(serverProcess);
            });
            it("should return 404 not found", async () => {
                const response = await axios.get(`${utilsUrl}/spec`).catch(err => err.response);
                expect(response.status).toBe(404);
            });
        });

        describe("Case: none given", () => {
            let serverProcess: ChildProcess | undefined;
            beforeAll(async () => {
                serverProcess = await startServer({
                    ...config,
                    additionalEnv: {
                        ...config.additionalEnv,
                        OASTLM_TEST_NO_SPEC: "true"
                    }
                });
            });
            afterAll(async () => {
                await stopServer(serverProcess);
            });
            it("should return 404 not found", async () => {
                const response = await axios.get(`${utilsUrl}/spec`).catch(err => err.response);
                expect(response.status).toBe(404);
            });
        });

        describe("Heap stats and OAS telemetry spec checks", () => {
            let serverProcess: ChildProcess | undefined;
            beforeAll(async () => {
                serverProcess = await startServer(config);
            });
            afterAll(async () => {
                await stopServer(serverProcess);
            });

            it("should fetch heapStats without throwing errors", async () => {
                const response = await axios.get(`${utilsUrl}/heapStats`).catch(err => err.response);
                expect(response.status).toBe(200);
                expect(response.data.units).toBe("MB");
                expect(typeof response.data.total_heap_size).toBe("number");
            });

            it("should fetch oas-telemetry-spec without throwing errors", async () => {
                const response = await axios.get(`${utilsUrl}/oas-telemetry-spec`).catch(err => err.response);
                expect(response.status).toBe(200);
                expect(response.data.paths).toBeDefined();
            });
        });
    });
}
