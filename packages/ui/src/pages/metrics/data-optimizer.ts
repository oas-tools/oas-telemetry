import type { Sample } from "./metrics-types"

// Límite simple de puntos
const MAX_POINTS = 400

/**
 * Downsampling super simple: tomar 1 de cada N puntos
 * Esto es mucho más rápido que LTTB o MinMax
 */
export function simpleDownsample(samples: Sample[], maxPoints: number = MAX_POINTS): Sample[] {
  if (samples.length <= maxPoints) return samples
  
  const step = Math.ceil(samples.length / maxPoints)
  const result: Sample[] = []
  
  // Siempre incluir el primer punto
  result.push(samples[0])
  
  // Tomar 1 de cada 'step' puntos
  for (let i = step; i < samples.length - 1; i += step) {
    result.push(samples[i])
  }
  
  // Siempre incluir el último punto
  if (samples.length > 1) {
    result.push(samples[samples.length - 1])
  }
  
  return result
}

// Alias para compatibilidad
export function optimizeSamples(samples: Sample[]): Sample[] {
  return simpleDownsample(samples, MAX_POINTS)
}

export function optimizeSeriesData(series: Array<{ samples: Sample[], labels: any }>) {
  return series.map(s => ({
    ...s,
    samples: optimizeSamples(s.samples)
  }))
}

export function filterSamplesByTimeRange(samples: Sample[], startTimeNs: number, endTimeNs: number): Sample[] {
  let left = 0
  let right = samples.length - 1
  let startIdx = samples.length

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (samples[mid].timestamp >= startTimeNs) {
      startIdx = mid
      right = mid - 1
    } else {
      left = mid + 1
    }
  }

  let endIdx = startIdx
  while (endIdx < samples.length && samples[endIdx].timestamp <= endTimeNs) {
    endIdx++
  }

  return samples.slice(startIdx, endIdx)
}
