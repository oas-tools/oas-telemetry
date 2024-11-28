
import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { globalOasTlmConfig } from './config.js';


  // DynamicExporter allows changing to any exporter at runtime;
  const traceExporter = globalOasTlmConfig.dynamicExporter;

  const sdk = new NodeSDK({
    resource: new Resource({
      service: 'oas-telemetry-service'
    }),
    traceExporter,
    instrumentations: [new HttpInstrumentation()]
  });

  if (process.env.OASTLM_MODULE_DISABLED !== 'true') {
    sdk.start()
  }