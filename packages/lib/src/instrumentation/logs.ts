import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { globalOasTlmConfig } from '../config.js';
import logger from '../utils/logger.js';

export function initializeLogs(resource: any) {
  // Create and configure LoggerProvider
  const logExporter = globalOasTlmConfig.logExporter;
  const logRecordProcessor = new SimpleLogRecordProcessor(logExporter);
  const loggerProvider = new LoggerProvider({ resource: resource , processors: [logRecordProcessor] });
  
  // Get a logger instance
  const loggerInstance = loggerProvider.getLogger('oas-telemetry'); // Use loggerProvider to get the logger
  
  // Override console methods to emit logs via OpenTelemetry
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
        severityNumber: SeverityNumber[method.toUpperCase() as keyof typeof SeverityNumber] || SeverityNumber.INFO,
        severityText: method.toUpperCase(),
        body: args.join(' '),
        attributes: { 'source.source': `console.${method}` },
      });
      // @ts-expect-error yes
      originalConsoleMethods[method](...args);
    };
  });

  logger.info('✅ OpenTelemetry Logs initialized.');
}
