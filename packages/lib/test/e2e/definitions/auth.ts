import { describe, expect, it, beforeAll, afterAll } from "vitest";
import axios from "axios";
import jwt from "jsonwebtoken";
import { E2ETestConfig } from "../index.test";
import { startServer } from "../utils/serverStarter";
import { ChildProcess } from "child_process";

export function defineAuthApiTests(config: E2ETestConfig) {
    // Create a local copy so we don't mutate the global config
    const localConfig = { ...config };
    const { label, port, telemetryPath } = localConfig;
    const baseUrl = `http://localhost:${port}`;
    const authUrl = `${baseUrl}${telemetryPath}/auth`;
    const additionalEnv = {
        OASTLM_CONFIG_AUTH_ENABLED: "true",
        OASTLM_CONFIG_AUTH_PASSWORD: "testpass",
        OASTLM_CONFIG_AUTH_JWT_SECRET: "testsecret",
        OASTLM_CONFIG_AUTH_ACCESS_TOKEN_MAX_AGE: "300000", // 5 minutes
        OASTLM_CONFIG_AUTH_REFRESH_TOKEN_MAX_AGE: "604800000" // 7 days
    };

    localConfig.additionalEnv = additionalEnv;

    describe(`Auth API Tests - ${label}`, () => {
        let serverProcess: ChildProcess | undefined;

        beforeAll(async () => {
            serverProcess = await startServer({ ...localConfig });
        });

        afterAll(() => {
            if (serverProcess) serverProcess.kill();
        });

        it("[e2e][Auth][-] should reject any request without access token when auth is enabled", async () => {
            const response = await axios.get(`${baseUrl}${telemetryPath}/logs`).catch((err) => err.response);
            expect(response.status).toBe(401);
        });

        it("[e2e][Auth][-] should reject login with wrong password", async () => {
            const response = await axios.post(`${authUrl}/login`, { password: "wrong" }).catch((err) => err.response);
            expect(response.status).toBe(400);
            expect(response.data.valid).toBe(false);
        });

        it("[e2e][Auth][+] should accept login with correct password and set cookies", async () => {
            const response = await axios.post(`${authUrl}/login`, { password: additionalEnv?.OASTLM_CONFIG_AUTH_PASSWORD || "oas-telemetry-password" }, { withCredentials: true });
            expect(response.status).toBe(200);
            expect(response.data.valid).toBe(true);
            expect(response.headers["set-cookie"]).toBeDefined();
            // Should set both oas-tlm-access-token and oas-tlm-refresh-token cookies
            const cookies = response.headers["set-cookie"] ? response.headers["set-cookie"].join(";") : "";
            expect(cookies).toMatch(/oas-tlm-access-token/);
            expect(cookies).toMatch(/oas-tlm-refresh-token/);
        });

        it("[e2e][Auth][+] should refresh access token using refresh token", async () => {
            const login = await axios.post(`${authUrl}/login`, { password: additionalEnv?.OASTLM_CONFIG_AUTH_PASSWORD || "oas-telemetry-password" }, { withCredentials: true });
            const cookie = login.headers["set-cookie"];
            expect(cookie).toBeDefined();

            const refresh = await axios.post(`${authUrl}/refresh`, {}, { headers: { Cookie: cookie }, withCredentials: true });
            expect(refresh.status).toBe(200);
            expect(refresh.data.valid).toBe(true);
            // Should set a new oas-tlm-access-token cookie
            const cookies = refresh.headers["set-cookie"] ? refresh.headers["set-cookie"].join(";") : "";
            expect(cookies).toMatch(/oas-tlm-access-token/);
        });

        it("[e2e][Auth][-] should fail refresh with invalid refresh token", async () => {
            const refresh = await axios.post(`${authUrl}/refresh`, {}, { headers: { Cookie: "oas-tlm-refresh-token=invalid" }, withCredentials: true }).catch((err) => err.response);
            expect(refresh.status).toBe(401);
        });

        it("[e2e][Auth][+] should logout and clear cookies", async () => {
            const login = await axios.post(`${authUrl}/login`, { password: additionalEnv?.OASTLM_CONFIG_AUTH_PASSWORD || "oas-telemetry-password" }, { withCredentials: true });
            const cookie = login.headers["set-cookie"];
            expect(cookie).toBeDefined();

            const logout = await axios.post(`${authUrl}/logout`, {}, { headers: { Cookie: cookie }, withCredentials: true });
            expect(logout.status).toBe(200);
            expect(logout.data.valid).toBe(true);
            expect(logout.headers["set-cookie"]).toBeDefined();
        });

        it("[e2e][Auth][-] should reject protected route without access token", async () => {
            // Try to access a protected route (e.g., /metrics)
            const response = await axios.get(`${baseUrl}${telemetryPath}/metrics`).catch((err) => err.response);
            if (additionalEnv?.OASTLM_CONFIG_AUTH_ENABLED === "true") {
                expect(response.status).toBe(401);
            } else {
                expect([200, 404]).toContain(response.status);
            }
        });

        it("[e2e][Auth][+] should let use non-protected route", async () => {
            const response = await axios.get(`${baseUrl}/api/v1/pets`);
            expect(response.status).toBe(200);
        });

        it("[e2e][Auth][-] should reject access token signed with a different JWT secret", async () => {
            const invalidToken = jwt.sign({ type: "access" }, "different_secret", { expiresIn: 300 });
            const response = await axios.get(`${baseUrl}${telemetryPath}/logs`, {
                headers: { Cookie: `oas-tlm-access-token=${invalidToken}` }
            }).catch((err) => err.response);
            expect(response.status).toBe(401);
        });

        it("[e2e][Auth][-] should reject refresh token signed with a different JWT secret", async () => {
            const invalidRefreshToken = jwt.sign({ type: "refresh" }, "different_secret", { expiresIn: 300 });
            const response = await axios.post(`${authUrl}/refresh`, {}, {
                headers: { Cookie: `oas-tlm-refresh-token=${invalidRefreshToken}` },
                withCredentials: true
            }).catch((err) => err.response);
            expect(response.status).toBe(401);
        });

        it("[e2e][Auth][-] should reject access token with incorrect payload type", async () => {
            const wrongTypeToken = jwt.sign({ type: "refresh" }, additionalEnv.OASTLM_CONFIG_AUTH_JWT_SECRET, { expiresIn: 300 });
            const response = await axios.get(`${baseUrl}${telemetryPath}/logs`, {
                headers: { Cookie: `oas-tlm-access-token=${wrongTypeToken}` }
            }).catch((err) => err.response);
            expect(response.status).toBe(401);
        });

        it("[e2e][Auth][-] should reject refresh token with incorrect payload type", async () => {
            const wrongTypeRefreshToken = jwt.sign({ type: "access" }, additionalEnv.OASTLM_CONFIG_AUTH_JWT_SECRET, { expiresIn: 300 });
            const response = await axios.post(`${authUrl}/refresh`, {}, {
                headers: { Cookie: `oas-tlm-refresh-token=${wrongTypeRefreshToken}` },
                withCredentials: true
            }).catch((err) => err.response);
            expect(response.status).toBe(401);
        });

        it("[e2e][Auth][-] should reject expired access token", async () => {
            const expiredToken = jwt.sign({ type: "access" }, additionalEnv.OASTLM_CONFIG_AUTH_JWT_SECRET, { expiresIn: -10 });
            const response = await axios.get(`${baseUrl}${telemetryPath}/logs`, {
                headers: { Cookie: `oas-tlm-access-token=${expiredToken}` }
            }).catch((err) => err.response);
            expect(response.status).toBe(401);
        });

        it("[e2e][Auth][-] should reject expired refresh token", async () => {
            const expiredRefreshToken = jwt.sign({ type: "refresh" }, additionalEnv.OASTLM_CONFIG_AUTH_JWT_SECRET, { expiresIn: -10 });
            const response = await axios.post(`${authUrl}/refresh`, {}, {
                headers: { Cookie: `oas-tlm-refresh-token=${expiredRefreshToken}` },
                withCredentials: true
            }).catch((err) => err.response);
            expect(response.status).toBe(401);
        });
    });
}
