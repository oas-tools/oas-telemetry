import { ExportResult } from "@opentelemetry/core";
import { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { AggregationOption, AggregationTemporality, CollectionResult, IMetricReader, InstrumentType, MetricProducer } from "@opentelemetry/sdk-metrics";
import { CollectionOptions, ForceFlushOptions, ShutdownOptions } from "@opentelemetry/sdk-metrics/build/src/types.js";
import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import logger from "../../utils/logger.js";


export abstract class Enabler {
  protected _enabled = true;

  constructor(enabled?: boolean) {
    if (typeof enabled === 'boolean') {
      this._enabled = enabled;
    }
  }

  public setEnabledValue(value: boolean) {
    this._enabled = value;
  }

  public enable() {
    this._enabled = true;
  }

  public disable() {
    this._enabled = false;
  }

  public isEnabled(): boolean {
    return this._enabled;
  }

  public toggle() {
    this._enabled = !this._enabled;
  }
}

/*
 * Classes for enabler exporters, allowing enable/disable toggling of exporters at runtime.
 *
 * This class is designed to work for trace and log exporters, where multiple exporters can be active simultaneously
 * (e.g., via a MultiExporter and one processor). By toggling the exporter, you can dynamically enable or
 * disable the export operation without removing the exporter from the pipeline.
 *
 * For metrics, the OpenTelemetry model is different: there are two types of readers. PullMetricExporters do not have
 * an exporter instance, and PushMetricExporters do, but only allow a single exporter per reader (with optional
 * `selectAggregationTemporality` and `selectAggregation` attributes). Therefore, multiple exporters per reader are not
 * supported for metrics.
 *
 * For metrics readers, a separate `DeactivableReader` class is recommended, which is even more efficient: when
 * disabled, the reader's `collect` method is not called at all, saving additional resources compared to disabling the exporter.
 *
 */

export class EnablerSpanExporter extends Enabler implements SpanExporter, Enabler {
  protected readonly exporter: SpanExporter;

  constructor(exporter: SpanExporter) {
    super();
    this.exporter = exporter;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this.isEnabled()) {
      this.exporter.export(spans, resultCallback);
    }
  }
  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
  forceFlush?(): Promise<void> {
    if (typeof this.exporter.forceFlush === 'function') {
      return this.exporter.forceFlush();
    }
    return Promise.resolve();
  }
}

export class EnablerLogExporter extends Enabler implements LogRecordExporter, Enabler {
  protected readonly exporter: LogRecordExporter;

  constructor(exporter: LogRecordExporter) {
    super();
    this.exporter = exporter;
  }
  export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
    if (this.isEnabled()) {
      this.exporter.export(logs, resultCallback);
    }
  }
  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }

}

abstract class EnablerMultiExporter<T> extends Enabler {
  protected _exporters: T[]= [];
  constructor(exporters?: T[]) {
    super();
    if (exporters && Array.isArray(exporters)) {
      this._exporters = exporters;
    }
  }

  addExporters(exporter: T | T[]): void {
    if (!this._exporters) {
      this._exporters = [];
    }
    if (Array.isArray(exporter)) {
      this._exporters.push(...exporter);
    } else {
      this._exporters.push(exporter);
    }
  }

}

export class EnablerMultiSpanExporter extends EnablerMultiExporter<SpanExporter> {
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    logger.debug(`EnablerMultiSpanExporter.export called with ${spans.length} spans, exporters: ${this._exporters?.length ?? 0}, enabled: ${this.isEnabled()}`);
    if (this.isEnabled() && this._exporters) {
      this._exporters.forEach((exporter) => exporter.export(spans, resultCallback));
    }
  }

  async shutdown(): Promise<void> {
    if (this._exporters) {
      await Promise.all(this._exporters.map((exporter) => exporter.shutdown()));
    }
    return;
  }
}

export class EnablerMultiLogExporter extends EnablerMultiExporter<LogRecordExporter> {
  export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
    if (this.isEnabled() && this._exporters) {
      this._exporters.forEach((exporter) => exporter.export(logs, resultCallback));
    }
  }

  async shutdown(): Promise<void> {
    if (this._exporters) {
      await Promise.all(this._exporters.map((exporter) => exporter.shutdown()));
    }
    return;
  }
}

export class EnablerMetricReader extends Enabler implements IMetricReader {
  constructor(
    private readonly reader: IMetricReader,
  ) {
    super();
  }
  forceFlush(options?: ForceFlushOptions): Promise<void> {
    if (this.isEnabled()) {
      return this.reader.forceFlush(options);
    }
    return Promise.resolve();
  }
  setMetricProducer(metricProducer: MetricProducer): void {
    if (this.isEnabled()) {
      this.reader.setMetricProducer(metricProducer);
    }
  }
  selectAggregation(instrumentType: InstrumentType): AggregationOption {
    return this.reader.selectAggregation(instrumentType);
  }

  selectAggregationTemporality(instrumentType: InstrumentType): AggregationTemporality {
    return this.reader.selectAggregationTemporality(instrumentType);
  }
  selectCardinalityLimit(instrumentType: InstrumentType): number {
    return this.reader.selectCardinalityLimit(instrumentType);
  }

  async collect(options?: CollectionOptions): Promise<CollectionResult> {
    if (this.isEnabled()) {
      return await this.reader.collect(options);
    }
    return {
      resourceMetrics: {
        resource: resourceFromAttributes({}),
        scopeMetrics: [],
      },
      errors: [],
    };
  }

  shutdown(options?: ShutdownOptions): Promise<void> {
    return this.reader.shutdown(options);
  }

}