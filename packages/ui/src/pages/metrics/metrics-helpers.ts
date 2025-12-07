import {
    type Sample,
    type Series,
    type HistogramValue,
    type LabelSet,
    DataPointType,
    AggregationTemporality,
} from "./metrics-types"

export function formatTimestampSmart(nsTimestamp: number, rangeDurationMs: number): string {
    const date = new Date(nsTimestamp / 1_000_000)

    if (rangeDurationMs < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })
    }

    if (rangeDurationMs < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        })
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    })
}

export function formatTimestamp(nsTimestamp: number): string {
    const date = new Date(nsTimestamp / 1_000_000)
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    })
}

export function formatFullTimestamp(nsTimestamp: number): string {
    const date = new Date(nsTimestamp / 1_000_000)
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    })
}



export function getDataPointTypeLabel(type: DataPointType): string {
    switch (type) {
        case DataPointType.Histogram:
            return "Histogram"
        case DataPointType.ExponentialHistogram:
            return "Exp. Histogram"
        case DataPointType.Gauge:
            return "Gauge"
        case DataPointType.Sum:
            return "Sum"
        default:
            return "Unknown"
    }
}

export function getTemporalityLabel(temporality: AggregationTemporality): string {
    return temporality === AggregationTemporality.Cumulative ? "Cumulative" : "Delta"
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function formatValue(value: number, unit?: string): string {
    let formatted: string

    if (Math.abs(value) >= 1_000_000) {
        formatted = `${(value / 1_000_000).toFixed(2)}M`
    } else if (Math.abs(value) >= 1_000) {
        formatted = `${(value / 1_000).toFixed(2)}K`
    } else if (Math.abs(value) < 0.01 && value !== 0) {
        formatted = value.toExponential(2)
    } else if (Number.isInteger(value)) {
        formatted = value.toString()
    } else {
        formatted = value.toFixed(2)
    }

    if (unit) {
        return `${formatted} ${unit}`
    }
    return formatted
}

export function flattenLabels(labels: LabelSet): Record<string, string> {
    const result: Record<string, string> = {}

    function flatten(obj: any, prefix = "") {
        for (const key in obj) {
            const value = obj[key]
            const newKey = prefix ? `${prefix}.${key}` : key

            if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                flatten(value, newKey)
            } else {
                result[newKey] = String(value)
            }
        }
    }

    flatten(labels)
    return result
}

export function getSeriesLabel(labels: LabelSet): string {
    const flat = flattenLabels(labels)
    const entries = Object.entries(flat)

    if (entries.length === 0) return "{}"
    if (entries.length <= 3) {
        return `{${entries.map(([k, v]) => `${k}="${v}"`).join(", ")}}`
    }
    return `{${entries.slice(0, 2).map(([k, v]) => `${k}="${v}"`).join(", ")}, ...}`
}

export function getSimpleSeriesLabel(labels: LabelSet): string {
    const flat = flattenLabels(labels)
    const entries = Object.entries(flat)

    if (entries.length === 0) return "value"
    if (entries.length === 1) return entries[0][1]
    return entries.map(([, v]) => v).join(", ")
}

export function getChartTitle(labels: LabelSet, metricKey: string): string {
    const flat = flattenLabels(labels)
    const entries = Object.entries(flat)

    if (entries.length === 0) {
        const { name } = parseMetricKey(metricKey)
        return name
    }

    if (entries.length === 1) return entries[0][0]
    return entries.map(([, v]) => v).join(", ")
}

export function getLatestSample(series: Series): Sample | undefined {
    if (series.samples.length === 0) return undefined
    return series.samples[series.samples.length - 1]
}

const CHART_COLORS = [
    "#56A64B", // green
    "#3274D9", // blue
    "#FF9830", // orange
    "#E02F44", // red
    "#8AB8FF", // light blue
    "#B877D9", // purple
    "#FADE2A", // yellow
    "#73BF69", // lime
    "#FF6B6B", // coral
    "#4ECDC4", // teal
]

export function getSeriesColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length]
}



export function parseMetricKey(metricKey: string): { instrumentation: string; name: string } {
    const parts = metricKey.split(":")
    if (parts.length >= 2) {
        return {
            instrumentation: parts[0],
            name: parts.slice(1).join(":"),
        }
    }
    return { instrumentation: "unknown", name: metricKey }
}

export function extractHistogramPercentiles(series: Series[], percentiles: number[] = [50, 95, 99]) {
    const dataMap = new Map<number, Record<string, number>>()

    series.forEach((s, seriesIndex) => {
        // Downsampling simple: tomar 1 de cada N samples si hay demasiados
        let samples = s.samples
        if (samples.length > 400) {
            const step = Math.ceil(samples.length / 400)
            samples = samples.filter((_, i) => i === 0 || i === samples.length - 1 || i % step === 0)
        }
        
        samples.forEach((sample) => {
            if (typeof sample.value === "number") return

            const hist = sample.value as HistogramValue
            if (!hist.buckets) return

            if (!dataMap.has(sample.timestamp)) {
                dataMap.set(sample.timestamp, { timestamp: sample.timestamp })
            }

            percentiles.forEach((p) => {
                const percentileValue = calculatePercentile(hist, p)
                dataMap.get(sample.timestamp)![`s${seriesIndex}_p${p}`] = percentileValue
            })

            dataMap.get(sample.timestamp)![`s${seriesIndex}_count`] = hist.count
        })
    })

    return Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp)
}

export function calculatePercentile(hist: HistogramValue, percentile: number): number {
    if (!hist.buckets || hist.count === 0) return 0

    const { boundaries, counts } = hist.buckets
    const targetCount = (percentile / 100) * hist.count

    let cumulativeCount = 0
    for (let i = 0; i < counts.length; i++) {
        cumulativeCount += counts[i]
        if (cumulativeCount >= targetCount) {
            const prevCumulative = cumulativeCount - counts[i]
            const bucketFraction = counts[i] > 0 ? (targetCount - prevCumulative) / counts[i] : 0

            const lowerBound = i === 0 ? 0 : boundaries[i - 1]
            const upperBound = boundaries[i] ?? boundaries[boundaries.length - 1] * 2

            return lowerBound + bucketFraction * (upperBound - lowerBound)
        }
    }

    return boundaries[boundaries.length - 1] || 0
}


