import { describe, expect, it, beforeAll, afterAll } from "vitest";
import axios from "axios";
import { E2ETestConfig } from "../index.test";
import { startServer } from "../utils/serverStarter";
import { ChildProcess } from "child_process";

export function definePluginsApiTests(config: E2ETestConfig) {
    const { label, port, telemetryPath } = config;
    const baseUrl = `http://localhost:${port}`;
    const pluginsUrl = `${baseUrl}${telemetryPath}/plugins`;

    describe(`Plugins API Tests - ${label}`, () => {
        let serverProcess: ChildProcess | undefined;

        beforeAll(async () => {
            serverProcess = await startServer(config);
        });

        afterAll(() => {
            if (serverProcess) serverProcess.kill();
        });

        it('[e2e][Plugins:Register][+] should register a valid ESM plugin', async () => {
            const pluginData = {
                id: "esm-plugin",
                code: `export const plugin = { isConfigured: () => true, getName: () => "ESM Plugin", load: () => {} };`,
                moduleFormat: "esm",
                config: { key: "value" }
            };

            const response = await axios.post(pluginsUrl, pluginData).catch((err) => err.response);
            expect(response.status).toBe(201);
        });

        it('[e2e][Plugins:Register][+] should register a valid CJS plugin', async () => {
            const pluginData = {
                id: "cjs-plugin",
                code: `module.exports = { plugin: { isConfigured: () => true, getName: () => "CJS Plugin", load: () => {} } };`,
                moduleFormat: "cjs",
                config: { key: "value" }
            };

            const response = await axios.post(pluginsUrl, pluginData).catch((err) => err.response);
            expect(response.status).toBe(201);
        });

        it('[e2e][Plugins:Register][-] should not register a plugin with missing id', async () => {
            const pluginData = {
                code: `export const plugin = { isConfigured: () => true, getName: () => "Invalid Plugin", load: () => {} };`,
                moduleFormat: "esm",
                config: { key: "value" }
            };

            const response = await axios.post(pluginsUrl, pluginData).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Plugins:Register][-] should not register a plugin with duplicate id', async () => {
            const pluginData = {
                id: "duplicate-plugin",
                code: `export const plugin = { isConfigured: () => true, getName: () => "Duplicate Plugin", load: () => {} };`,
                moduleFormat: "esm",
                config: { key: "value" }
            };

            await axios.post(pluginsUrl, pluginData).catch(() => {});
            const response = await axios.post(pluginsUrl, pluginData).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Plugins:Register][-] should not register a plugin with invalid code', async () => {
            const pluginData = {
                id: "invalid-plugin",
                code: `export const invalidCode = {};`,
                moduleFormat: "esm",
                config: { key: "value" }
            };

            const response = await axios.post(pluginsUrl, pluginData).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Plugins:Register][-] should not register a plugin with missing required methods', async () => {
            const pluginData = {
                id: "missing-methods-plugin",
                code: `export const plugin = { getName: () => "Missing Methods Plugin" };`,
                moduleFormat: "esm",
                config: { key: "value" }
            };

            const response = await axios.post(pluginsUrl, pluginData).catch((err) => err.response);
            expect(response.status).toBe(400);
        });

        it('[e2e][Plugins:List][+] should list registered plugins', async () => {
            const response = await axios.get(pluginsUrl).catch((err) => err.response);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data.plugins)).toBe(true);
        });
    });
}
