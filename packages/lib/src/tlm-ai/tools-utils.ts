export function summarizeMetricValue(value: any) {
    if (!value || typeof value !== 'object') return value;
    return { count: value.count, min: value.min, max: value.max, sum: value.sum };
}

export function recentMetricPoints(series: any, limit: number) {
    const start = Math.max(0, (series.values?.length || 0) - limit);
    return (series.values || []).slice(start).map((value: any, index: number) => ({
        time: new Date(series.endTimes[start + index] / 1_000_000).toISOString(),
        value: summarizeMetricValue(value),
    }));
}

export function parseMetricTime(value?: string) {
    if (!value) return undefined;
    const milliseconds = Date.parse(value);
    return Number.isNaN(milliseconds) ? undefined : milliseconds * 1_000_000;
}

export function latestMetricTime(metric: any) {
    return Math.max(0, ...(metric.series || []).map((series: any) => Math.max(...(series.endTimes || [0]))));
}

export function getSimplifiedTraces(spans: any[]) {
    return spans.map((span: any) => ({
        name: span.name,
        kind: span.kind,
        traceId: span._spanContext?.traceId || span.traceId,
        spanId: span._spanContext?.spanId || span.spanId,
        service: span.resource?.attributes?.['service.name'] || span.resource?.attributes?.service?.name,
        http: span.attributes?.http,
        startTime: span.startTime,
        endTime: span.endTime,
        _duration: span._duration,
    }));
}

export function getSimplifiedLogs(logs: any[]) {
    return logs.map((log: any) => ({
        service: log.resource?.attributes?.service?.name || undefined,
        timestamp: new Date(log.timestamp / 1000).toISOString(),
        severityText: log.severityText,
        message: log.body,
        traceId: log.traceId,
        source: log.attributes?.source || undefined,
    }));
}
