
import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { globalOasTlmConfig } from './config.js';


  // DynamicExporter allows changing to any exporter at runtime;
  const traceExporter = globalOasTlmConfig.dynamicExporter;
//  Alternative 1: Using NodeSDK
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