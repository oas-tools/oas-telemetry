import { SpanProcessor, ReadableSpan, Span } from '@opentelemetry/sdk-trace-base';
import { Context } from '@opentelemetry/api';
import logger from '../../../utils/logger.js';


export class DynamicMultiSpanProcessor implements SpanProcessor {
  private _spanProcessors: SpanProcessor[] = [];

  constructor(initialProcessors: SpanProcessor[] = []) {
    this._spanProcessors = [...initialProcessors];
  }

  /**
   * Add a new SpanProcessor or an array of SpanProcessors at runtime.
   */
  addProcessors(processor: SpanProcessor | SpanProcessor[]): void {
    if (Array.isArray(processor)) {
      this._spanProcessors.push(...processor);
    } else {
      this._spanProcessors.push(processor);
    }
  }

  /**
   * Remove a specific SpanProcessor if needed.
   */
  removeProcessor(processor: SpanProcessor): void {
    this._spanProcessors = this._spanProcessors.filter(p => p !== processor);
  }

  /**
   * Clear all processors.
   */
  clearProcessors(): void {
    this._spanProcessors = [];
  }

  /**
   * Called when a span is started.
   */
  onStart(span: Span, context: Context): void {
    for (const processor of this._spanProcessors) {
      processor.onStart(span, context);
    }
  }

  /**
   * Called when a span ends.
   */
  onEnd(span: ReadableSpan): void {
    for (const processor of this._spanProcessors) {
      processor.onEnd(span);
    }
  }

  /**
   * Force flush all processors.
   */
  async forceFlush(): Promise<void> {
    const promises = this._spanProcessors.map(p => p.forceFlush());
    try {
      await Promise.all(promises);
    } catch (error) {
        logger.error('Error during forceFlush:', error);
    }
  }

  /**
   * Shutdown all processors.
   */
  async shutdown(): Promise<void> {
    await Promise.all(this._spanProcessors.map(p => p.shutdown()));
  }
}
