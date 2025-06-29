import { describe, it, expect } from "vitest";
import { getConfig, defaultConfig } from "../../src/config/config";

describe("Config Tests", () => {
    it("[Unit][Config][+] should return default config when no userConfig or envConfig is provided", () => {
        const config = getConfig();
        expect(config).toEqual(defaultConfig);
    });

    it("[Unit][Config][+] should override default config with userConfig", () => {
        const userConfig = {
            general: {
                baseUrl: "/custom-base-url",
            },
        };
        const config = getConfig(userConfig);
        expect(config.general.baseUrl).toBe("/custom-base-url");
        expect(config.general.specFileName).toBe(defaultConfig.general.specFileName);
    });

    it("[Unit][Config][+] should override default and userConfig with envConfig", () => {
        const userConfig = {
            general: {
                baseUrl: "/custom-base-url",
            },
        };
        const envConfig = {
            general: {
                baseUrl: "/env-base-url",
            },
        };
        const config = getConfig(userConfig, defaultConfig, envConfig);
        expect(config.general.baseUrl).toBe("/env-base-url");
    });

    it("[Unit][Config][+] should parse environment variables correctly", () => {
        process.env.OASTLM_CONFIG_GENERAL_BASE_URL = "/env-url";
        const envConfig = {
            general: {
                baseUrl: process.env.OASTLM_CONFIG_GENERAL_BASE_URL,
            },
        };
        const config = getConfig(undefined, defaultConfig, envConfig);
        expect(config.general.baseUrl).toBe("/env-url");
        delete process.env.OASTLM_CONFIG_GENERAL_BASE_URL;
    });

    it("[Unit][Config][+] should handle undefined environment variables gracefully", () => {
        const envConfig = {
            general: {
                baseUrl: undefined,
            },
        };
        const config = getConfig(undefined, defaultConfig, envConfig);
        expect(config.general.baseUrl).toBe(defaultConfig.general.baseUrl);
    });
});
