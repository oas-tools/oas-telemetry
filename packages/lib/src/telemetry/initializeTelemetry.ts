import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import logger from '../utils/logger.js';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { dynamicMultiLogProcessor, dynamicMultiSpanProcessor, oasTelemetryResource, originalConsoleMethods } from './telemetryRegistry.js';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { bootEnvVariables } from '../config/bootConfig.js';
import util from 'util';


// THIS INSTRUMENTATIONS NEED TO BE LOADED BEFORE ANYTHING ELSE
// They use monkey-patching to instrument the HTTP server and client.

// THIS FILE MUST BE CALLED BEFORE ANYTHING ELSE

if (bootEnvVariables.OASTLM_BOOT_MODULE_DISABLED) {
  logger.info('🚫 OASTLM module is disabled, Providers not initialized.');
} else {
  logger.info('🚀 Initializing Open Telemetry');

  initializeTraces();
  initializeMetrics();
  initializeLogs();
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      // new ExpressInstrumentation(),
    ],
  });
}


function initializeTraces(): void {
  logger.info('📊 Initializing TracerProvider');
  const tracerProvider = new NodeTracerProvider({
    resource: oasTelemetryResource,
    spanProcessors: [dynamicMultiSpanProcessor]
  });
  tracerProvider.register();
}

function initializeLogs(): void {
  logger.info('📜 Initializing LoggerProvider');
  // Create and configure LoggerProvider
  const loggerProvider = new LoggerProvider({
    resource: oasTelemetryResource,
    processors: [dynamicMultiLogProcessor]
  });

  // Get a logger instance
  const loggerInstance = loggerProvider.getLogger('oas-telemetry'); // Use loggerProvider to get the logger



  Object.keys(originalConsoleMethods).forEach((method) => {
    // @ts-expect-error yes
    console[method] = (...args: any[]) => {
      const severity = getSeverityForMethod(method)
      loggerInstance.emit({
        severityNumber: severity.number,
        severityText: severity.text,
        body: util.format(...args),
        attributes: { 'source': `console.${method}`, "library": "telemetry" },
      });
      // @ts-expect-error yes
      originalConsoleMethods[method](...args);
    };
  });
}

function initializeMetrics(): void {
  logger.info('📈 Initializing MeterProvider');
  // WARN: Default PeriodicExportingMetricReader is added post initialization (see telemetryConfigurator.ts)
  // The in memory exporter is added by default to that reader. More readers are allowed to be added dynamically

}

function getSeverityForMethod(method: string): { number: SeverityNumber; text: string } {
  switch (method) {
    case "log":
    case "info":
      return { number: SeverityNumber.INFO, text: "INFO" }
    case "debug":
      return { number: SeverityNumber.DEBUG, text: "DEBUG" }
    case "warn":
      return { number: SeverityNumber.WARN, text: "WARN" }
    case "error":
      return { number: SeverityNumber.ERROR, text: "ERROR" }
    default:
      return { number: SeverityNumber.INFO, text: "INFO" }
  }
}