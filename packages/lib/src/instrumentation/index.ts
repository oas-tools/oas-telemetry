// import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import logger from '../utils/logger.js';
import { initializeLogs } from './logs.js';
import { initializeTraces } from './traces.js';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { initializeMetrics } from './metrics.js';



const oasTelemetryResource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'oas-telemetry-service'
});


if (process.env.OASTLM_MODULE_DISABLED !== 'true') {
  initializeTraces(oasTelemetryResource);
  initializeMetrics(oasTelemetryResource);
  initializeLogs(oasTelemetryResource);
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      // new ExpressInstrumentation(),
    ],
  });
} else {
  logger.info('🚫 OASTLM module is disabled, SDKs not initialized.');
}
