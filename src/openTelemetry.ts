import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { globalOasTlmConfig } from './config.js';
import { getCpuUsageData, getProcessCpuUsageData, getMemoryData, getProcessMemoryData } from './systemMetrics.js'; // Import system metrics functions
import logger from './utils/logger.js';
// DynamicExporter allows changing to any exporter at runtime;
const dynamicSpanExporter = globalOasTlmConfig.dynamicSpanExporter;
// Alternative 1: Using NodeSDK
const sdk = new NodeSDK({
  resource: new Resource({
    service: 'oas-telemetry-service'
  }),
  traceExporter: dynamicSpanExporter,
  instrumentations: [new HttpInstrumentation()]
});


// Collect and export system metrics
setInterval(() => {
  const cpuUsageData = getCpuUsageData();
  const processCpuUsageData = getProcessCpuUsageData();
  const memoryData = getMemoryData();
  const processMemoryData = getProcessMemoryData();

  const metrics = {
    timestamp: Date.now(),
    cpuUsageData,
    processCpuUsageData,
    memoryData,
    processMemoryData,
  };

  // Export the collected metrics using the InMemoryDBMetricsExporter
  const inMemoryDbMetricExporter = globalOasTlmConfig.metricsExporter;
  inMemoryDbMetricExporter.export(metrics, (result: any) => { }); // TODO: refine type of `result`
}, globalOasTlmConfig.systemMetricsInterval);

logger.info('✅ OpenTelemetry System Metrics initialized.');

if (process.env.OASTLM_MODULE_DISABLED !== 'true') {
  sdk.start()
}

// Alternative 2:
// const provider = new NodeTracerProvider();
// provider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));

// if (process.env.OASTLM_MODULE_DISABLED !== 'true') {
//   provider.register();
//   registerInstrumentations({
//     instrumentations: [
//       new HttpInstrumentation(),
//       new ExpressInstrumentation(),
//     ],
//   });
// }