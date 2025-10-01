import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import logger from '../utils/logger.js';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { dynamicMultiLogProcessor, dynamicMultiSpanProcessor, oasTelemetryResource } from './telemetryRegistry.js';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { bootEnvVariables } from '../config/bootConfig.js';


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

  // Override console methods to emit logs via OpenTelemetry, like an instrumentation
  const originalConsoleMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  Object.keys(originalConsoleMethods).forEach((method) => {
    // @ts-expect-error yes
    console[method] = (...args: any[]) => {
      loggerInstance.emit({
        severityNumber: severityMap[method]?.number || SeverityNumber.INFO,
        severityText: severityMap[method]?.text || 'INFO',
        body: args.join(' '),
        attributes: { 'source': `console.${method}` },
      });
      // @ts-expect-error yes
      originalConsoleMethods[method](...args);
    };
  });
}

function initializeMetrics(): void {
  logger.info('📈 Initializing MeterProvider');

  // WARN: This is a custom provider that allows adding readers dynamically at runtime.
  // WARN: Default PeriodicExportingMetricReader is added post initialization (see telemetryConfigurator.ts)
  // The in memory exporter is added by default to that reader. More readers are allowed to be added dynamically

}


const severityMap: Record<string, { number: SeverityNumber; text: string }> = {
  log:   { number: SeverityNumber.INFO,  text: 'INFO' },
  info:  { number: SeverityNumber.INFO,  text: 'INFO' },
  debug: { number: SeverityNumber.DEBUG, text: 'DEBUG' },
  warn:  { number: SeverityNumber.WARN,  text: 'WARN' },
  error: { number: SeverityNumber.ERROR, text: 'ERROR' },
};