import { InstrumentationBase } from '@opentelemetry/instrumentation';
import { LoggerProvider, Logger, SeverityNumber } from '@opentelemetry/api-logs';
import util from 'util';
import { originalConsoleMethods } from '../../telemetryRegistry.js';

export class LogsInstrumentation extends InstrumentationBase {
  private _loggerProvider?: LoggerProvider;
  private _otelLogger?: Logger;

  constructor(config: any = {}) {
    super('@oas-telemetry/logs-instrumentation', '1.0.0', config);
  }

  /**
   * No-op: this instrumentation does not patch modules loaded via require().
   */
  init() {
    return [];
  }

  /**
   * Called by the SDK when the LoggerProvider is available.
   * This is the correct way for an instrumentation to receive a logger provider.
   */
  setLoggerProvider(provider: LoggerProvider) {
    this._loggerProvider = provider;
    this._otelLogger = provider.getLogger(this.instrumentationName);

    // If already enabled, re-apply patches with the new logger provider.
    if (this.isEnabled()) {
      this._unpatchConsole();
      this._patchConsole();
    }
  }

  /**
   * Called by the SDK after all providers have been registered.
   */
  enable() {
    super.enable();

    // Fallback: if no logger provider has been set yet, we do nothing.
    if (!this._loggerProvider) {
      return;
    }

    this._patchConsole();
  }

  disable() {
    super.disable();
    this._unpatchConsole();
  }

  private _patchConsole() {
    if (!this._otelLogger) return;

    (Object.keys(originalConsoleMethods) as Array<keyof typeof originalConsoleMethods>).forEach((method) => {
      const original = originalConsoleMethods[method];

      console[method] = (...args: any[]) => {
        const { number, text } = getSeverityForMethod(method);

        this._otelLogger!.emit({
          severityNumber: number,
          severityText: text,
          body: util.format(...args),
          attributes: {
            source: `console.${method}`,
            library: this.instrumentationName,
          },
        });

        original(...args);
      };
    });
  }

  private _unpatchConsole() {
    (Object.keys(originalConsoleMethods) as Array<keyof typeof originalConsoleMethods>).forEach((method) => {
      console[method] = originalConsoleMethods[method];
    });
  }
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
