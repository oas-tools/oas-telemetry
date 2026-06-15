import { defineTracesApiTests } from './definitions/traces';
import { defineLogsApiTests } from './definitions/logs';
import { defineMetricsApiTests } from './definitions/metrics';
import { definePluginsApiTests } from './definitions/plugins';
import { defineAuthApiTests } from './definitions/auth';


const cjsConfig: E2ETestConfig = {
  label: 'CommonJS',
  serverScript: 'test/e2e/servers/otTestServer.cjs',
  port: '3231',
  telemetryPath: '/telemetry',
  additionalEnv: {
    OASTLM_CONFIG_METRICS_AUTO_GENERATE_ENDPOINT_HISTOGRAMS: 'true',
  }
};

const esmConfig: E2ETestConfig = {
  label: 'ESM',
  serverScript: 'test/e2e/servers/otTestServer.mjs',
  port: '3232',
  telemetryPath: '/telemetry',
  additionalEnv: {
    OASTLM_CONFIG_METRICS_AUTO_GENERATE_ENDPOINT_HISTOGRAMS: 'true',
  }
};


defineTracesApiTests(cjsConfig);
defineTracesApiTests(esmConfig);

defineLogsApiTests(cjsConfig);
defineLogsApiTests(esmConfig);

defineMetricsApiTests(cjsConfig);
defineMetricsApiTests(esmConfig);

definePluginsApiTests(cjsConfig);
definePluginsApiTests(esmConfig);

defineAuthApiTests(cjsConfig);
defineAuthApiTests(esmConfig);

export interface E2ETestConfig {
  label: string;
  serverScript: string;
  port: string;
  telemetryPath: string;
  additionalEnv?: Record<string, string>;
}