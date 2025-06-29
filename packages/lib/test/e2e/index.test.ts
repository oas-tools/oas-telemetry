import { defineTracesApiTests } from './definitions/traces';
import { defineLogsApiTests } from './definitions/logs';
import { defineMetricsApiTests } from './definitions/metrics';
import { definePluginsApiTests } from './definitions/plugins';


const cjsConfig: E2ETestConfig = {
  label: 'CommonJS',
  serverScript: 'test/e2e/servers/otTestServer.cjs',
  port: '3231',
  telemetryPath: '/telemetry',
};

const esmConfig: E2ETestConfig = {
  label: 'ESM',
  serverScript: 'test/e2e/servers/otTestServer.mjs',
  port: '3232',
  telemetryPath: '/telemetry',
};


defineTracesApiTests(cjsConfig);
defineTracesApiTests(esmConfig);

defineLogsApiTests(cjsConfig);
defineLogsApiTests(esmConfig);

defineMetricsApiTests(cjsConfig);
defineMetricsApiTests(esmConfig);

definePluginsApiTests(cjsConfig);
definePluginsApiTests(esmConfig);

export interface E2ETestConfig {
  label: string;
  serverScript: string;
  port: string;
  telemetryPath: string;
}