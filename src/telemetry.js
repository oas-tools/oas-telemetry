

// tracing.js

'use strict'

import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { InMemoryExporter } from './exporters/InMemoryDbExporter.js';


// Create an in-memory span exporter
export const inMemoryExporter = new InMemoryExporter();

const traceExporter = inMemoryExporter;
const sdk = new NodeSDK({
  resource: new Resource(),
  traceExporter,
  instrumentations: [new HttpInstrumentation()]
});

sdk.start()

