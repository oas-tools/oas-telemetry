

// tracing.js

'use strict'

import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
// import { InMemoryExporter } from '@restsense/agent/api/exporters';
import { InMemoryExporter } from './exporters/InMemoryDbExporter.js';


// initialize the SDK and register with the OpenTelemetry API
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Create an in-memory span exporter
export const inMemoryExporter = new InMemoryExporter();
// configure the SDK to export telemetry data to the console
// enable all auto-instrumentations from the meta package
const traceExporter = inMemoryExporter;
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-service',
  }),
  traceExporter,
  instrumentations: [new HttpInstrumentation()]
});

sdk.start()
// Create a tracer provider
// const tracerProvider = new NodeTracerProvider({
//   resource: new Resource({
//     [SemanticResourceAttributes.SERVICE_NAME]: 'basic-service',
//   }),
//   instrumentations: [new HttpInstrumentation()],
// });

// // maybe BatchSpanProcessorBase
// tracerProvider.addSpanProcessor(new SimpleSpanProcessor(inMemoryExporter));

// // Register the tracer provider
// tracerProvider.register();


//WARNING: this is configured with batchSpanProcessor, it takes 5 seconds to flush the spans
// import {startTracesInstrumentation} from '@restsense/agent/api'
// startTracesInstrumentation(inMemoryExporter,resource);
