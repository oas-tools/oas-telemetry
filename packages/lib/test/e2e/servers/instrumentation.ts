import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { Instrumentation } from '@opentelemetry/instrumentation';
import { LoggerProvider, SeverityNumber } from '@opentelemetry/api-logs';
// import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

// SAMPLE CUSTOM INSTRUMENTATION IMPLEMENTATION
class SimpleLogger implements Instrumentation {
    supportedLoaders: string[] = [];
    instrumentationName: string;
    instrumentationVersion = '1.0.0';

    constructor(name: string) {
        this.instrumentationName = `@test/simple-${name}`;
    }

    initialize(): void { }
    enable(): void { }
    disable(): void { }
    setTracerProvider(): void { }
    setMeterProvider(): void { }
    setConfig(): void { }
    getConfig() { return {}; }

    /* @ts-ignore */
    setLoggerProvider(provider: LoggerProvider) {
        const logger = provider.getLogger(this.instrumentationName);
        logger.emit({
            severityNumber: SeverityNumber.INFO,
            severityText: 'INFO',
            body: `Log from ${this.instrumentationName}`,
        });
    }
}

export const customInstrumentations = [
    new SimpleLogger('A'),
    // ...getNodeAutoInstrumentations(),

]