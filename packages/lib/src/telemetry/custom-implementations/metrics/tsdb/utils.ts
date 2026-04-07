import { ScopeMetrics } from '@opentelemetry/sdk-metrics';
import { type MetricQueryResult } from './types.js';

/**
 * Convert raw format to OpenTelemetry format
 * 
 * Raw format structure (same for GET response and INSERT input):
 * {
 *   scope: { name, version },
 *   descriptor: { unit, description, ... },
 *   series: [{ attributes, startTimes[], endTimes[], values[] }]
 * }
 * 
 * OTEL format structure:
 * {
 *   scope: { name, version },
 *   metrics: [{ descriptor, dataPoints: [{ attributes, startTime, endTime, value }] }]
 * }
 * 
 * Groups dataPoints by endTime to reconstruct original exports
 */
export function rawToOtel(rawScopeMetrics: MetricQueryResult[]): ScopeMetrics[] {
    const groupedByScope = new Map<string, any>();

    for (const result of rawScopeMetrics) {
        const scopeId = result.scope.version 
            ? `${result.scope.name}@${result.scope.version}`
            : `${result.scope.name}@none`;

        if (!groupedByScope.has(scopeId)) {
            groupedByScope.set(scopeId, {
                scope: {
                    name: result.scope.name,
                    version: result.scope.version || ''
                },
                metrics: []
            });
        }

        const scopeData = groupedByScope.get(scopeId)!;
        const dataPoints: any[] = [];

        for (const series of result.series) {
            for (let i = 0; i < series.endTimes.length; i++) {
                const startTimeNs = series.startTimes?.[i];
                const endTimeNs = series.endTimes[i];
                if (!startTimeNs) continue;
                
                const startSec = Math.floor(startTimeNs / 1_000_000_000);
                const startNano = startTimeNs % 1_000_000_000;
                
                const endSec = Math.floor(endTimeNs / 1_000_000_000);
                const endNano = endTimeNs % 1_000_000_000;

                dataPoints.push({
                    attributes: series.attributes,
                    startTime: [startSec, startNano],
                    endTime: [endSec, endNano],
                    value: series.values[i]
                });
            }
        }

        scopeData.metrics.push({
            descriptor: result.descriptor,
            dataPoints
        });
    }

    return Array.from(groupedByScope.values());
}
