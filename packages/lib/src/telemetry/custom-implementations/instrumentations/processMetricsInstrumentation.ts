import { InstrumentationBase } from '@opentelemetry/instrumentation';

/**
 * Lightweight, dependency-free replacement for @opentelemetry/instrumentation-host-metrics'
 * process.* metrics. That package also collects system-wide metrics (system.cpu.*, system.memory.*,
 * system.network.*) via the `systeminformation` library, which shells out to OS commands and is
 * too heavy to enable by default. This instrumentation only reads process.cpuUsage()/
 * process.memoryUsage(), both native Node APIs, to keep the cost negligible.
 */
export class ProcessMetricsInstrumentation extends InstrumentationBase {
    private _lastCpuUsage = process.cpuUsage();
    private _lastCpuTimeNs = process.hrtime.bigint();

    constructor(config: any = {}) {
        super('@oas-telemetry/process-metrics-instrumentation', '1.0.0', config);
    }

    init() {
        return [];
    }

    enable() {
        super.enable();
    }

    disable() {
        super.disable();
    }

    /**
     * NodeSDK calls registerInstrumentations() - which triggers enable() - BEFORE it creates and
     * assigns the real MeterProvider to instrumentations (that happens in a separate, later
     * setMeterProvider() call). Instruments created inside enable() would therefore bind to the
     * no-op provider that's active at that point. _updateMetricInstruments() is the base class's
     * dedicated hook for (re)creating instruments once a real meter is available - it runs from
     * both the constructor and setMeterProvider(), so this is the correct place for them.
     */
    protected _updateMetricInstruments() {
        this.meter
            .createObservableGauge('process.memory.usage', {
                description: 'Resident set size (RSS) memory used by the Node.js process',
                unit: 'By',
            })
            .addCallback((result) => {
                result.observe(process.memoryUsage().rss);
            });

        this.meter
            .createObservableGauge('process.cpu.utilization', {
                description: 'Fraction of CPU time (user + system) used by the Node.js process since the last observation',
                unit: '1',
            })
            .addCallback((result) => {
                const currentUsage = process.cpuUsage();
                const currentTimeNs = process.hrtime.bigint();

                const cpuTimeUs = (currentUsage.user - this._lastCpuUsage.user) + (currentUsage.system - this._lastCpuUsage.system);
                const elapsedUs = Number(currentTimeNs - this._lastCpuTimeNs) / 1e3;

                if (elapsedUs > 0) {
                    result.observe(cpuTimeUs / elapsedUs);
                }

                this._lastCpuUsage = currentUsage;
                this._lastCpuTimeNs = currentTimeNs;
            });
    }
}
