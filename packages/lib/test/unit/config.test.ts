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
                specFileName: "custom.json",
            },
        };
        const config = getConfig(userConfig);
        // baseUrl is now only configurable via OASTLM_BOOT_BASE_URL environment variable at boot time
        expect(config.general.specFileName).toBe("custom.json");
    });

    it("[Unit][Config][+] should override default and userConfig with envConfig", () => {
        const userConfig = {
            general: {
                specFileName: "user.json",
            },
        };
        const envConfig = {
            general: {
                specFileName: "env.json",
            },
        };
        const config = getConfig(userConfig, defaultConfig, envConfig);
        // envConfig overrides userConfig
        expect(config.general.specFileName).toBe("env.json");
    });

    it("[Unit][Config][+] should parse environment variables correctly", () => {
        process.env.OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME = "env-spec.json";
        const envConfig = {
            general: {
                specFileName: process.env.OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME,
            },
        };
        const config = getConfig(undefined, defaultConfig, envConfig);
        expect(config.general.specFileName).toBe("env-spec.json");
        delete process.env.OASTLM_CONFIG_GENERAL_SPEC_FILE_NAME;
    });

    it("[Unit][Config][+] should handle undefined environment variables gracefully", () => {
        const envConfig = {
            general: {
                specFileName: undefined,
            },
        };
        const config = getConfig(undefined, defaultConfig, envConfig);
        expect(config.general.specFileName).toBe(defaultConfig.general.specFileName);
    });

    it("[Unit][Config][+] should default autoGenerateEndpointHistograms to false", () => {
        const config = getConfig();
        expect(config.metrics.autoGenerateEndpointHistograms).toBe(false);
    });

    it("[Unit][Config][+] should override autoGenerateEndpointHistograms with userConfig", () => {
        const config = getConfig({ metrics: { autoGenerateEndpointHistograms: true } });
        expect(config.metrics.autoGenerateEndpointHistograms).toBe(true);
    });
});
