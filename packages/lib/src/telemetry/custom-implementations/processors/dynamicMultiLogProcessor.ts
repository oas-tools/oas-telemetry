import { callWithTimeout } from '@opentelemetry/core';
import type { Context } from '@opentelemetry/api';
import type { LogRecordProcessor } from '@opentelemetry/sdk-logs';
import type { SdkLogRecord } from '@opentelemetry/sdk-logs';

import logger from '../../../utils/logger.js'; // optional if you want logging

export class DynamicMultiLogRecordProcessor implements LogRecordProcessor {
  private _processors: LogRecordProcessor[] = [];
  private _forceFlushTimeoutMillis: number;

  constructor(
    initialProcessors: LogRecordProcessor[] = [],
    forceFlushTimeoutMillis: number = 30000
  ) {
    this._processors = [...initialProcessors];
    this._forceFlushTimeoutMillis = forceFlushTimeoutMillis;
  }

/**
 * Add a new LogRecordProcessor or an array of LogRecordProcessors at runtime.
 */
addProcessors(processor: LogRecordProcessor | LogRecordProcessor[]): void {
    if (Array.isArray(processor)) {
        this._processors.push(...processor);
    } else {
        this._processors.push(processor);
    }
}

  /**
   * Remove a specific LogRecordProcessor.
   */
  removeProcessor(processor: LogRecordProcessor): void {
    this._processors = this._processors.filter(p => p !== processor);
  }

  /**
   * Clear all LogRecordProcessors.
   */
  clearProcessors(): void {
    this._processors = [];
  }

  /**
   * Called when a log record is emitted.
   */
  onEmit(logRecord: SdkLogRecord, context?: Context): void {
    for (const processor of this._processors) {
      try {
        processor.onEmit(logRecord, context);
      } catch (error) {
        logger?.error?.('Error in onEmit of LogRecordProcessor:', error);
      }
    }
  }

  /**
   * Force flush all processors with timeout.
   */
  async forceFlush(): Promise<void> {
    const timeout = this._forceFlushTimeoutMillis;
    const promises = this._processors.map(p =>
      callWithTimeout(p.forceFlush(), timeout)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      logger?.error?.('Error during forceFlush in DynamicMultiLogRecordProcessor:', error);
    }
  }

  /**
   * Shutdown all processors.
   */
  async shutdown(): Promise<void> {
    await Promise.all(this._processors.map(p => p.shutdown()));
  }
}
