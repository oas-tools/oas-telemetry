
import logger from '../utils/logger.js';
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { globalOasTlmConfig } from '../config.js';

export function initializeTraces(resource: any) {
    const tracerProvider = new NodeTracerProvider(
        {
            resource: resource,
            spanProcessors: [new BatchSpanProcessor(globalOasTlmConfig.dynamicSpanExporter)]
        });
    // tracerProvider.addSpanProcessor();

    tracerProvider.register();

    logger.info('✅ OpenTelemetry Traces initialized.');
}
