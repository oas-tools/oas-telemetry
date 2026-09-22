/**
 * Traces utilities and helpers
 */

/**
 * HTTP Methods - Standard REST methods
 */
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE", "CONNECT"] as const

export type HTTPMethod = (typeof HTTP_METHODS)[number]

/**
 * Validate if a value is a valid HTTP status code (100-599)
 */
export function isValidHTTPStatusCode(code: unknown): code is number {
  if (typeof code !== "number") return false
  return code >= 100 && code < 600 && Number.isInteger(code)
}

/**
 * Filter an array to only valid HTTP status codes
 */
export function filterValidStatusCodes(codes: unknown[]): number[] {
  return codes.filter(isValidHTTPStatusCode)
}

/**
 * Parse comma/space separated status codes from string
 * Example: "200, 301, 404" → [200, 301, 404]
 */
export function parseStatusCodes(input: string): number[] {
  return input
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter(isValidHTTPStatusCode)
}

/**
 * Get HTTP method color for badges
 */
export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
    case "POST":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
    case "PUT":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
    case "DELETE":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
    case "PATCH":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
    case "HEAD":
      return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    case "OPTIONS":
      return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800"
    case "TRACE":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
    case "CONNECT":
      return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
  }
}

/**
 * Get HTTP status code color for badges
 */
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
  if (status >= 300 && status < 400) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
  if (status >= 400 && status < 500) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
  return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
}

/**
 * Format a duration (ms, or an OTel [seconds, nanoseconds] HrTime tuple) as a human string.
 */
export function formatDuration(duration: number | [number, number]): string {
  const durationMs = Array.isArray(duration)
    ? duration[0] * 1000 + duration[1] / 1e6
    : duration

  if (durationMs < 1) return `${(durationMs * 1000).toFixed(1)}µs`
  if (durationMs < 1000) return `${durationMs.toFixed(2)}ms`
  return `${(durationMs / 1000).toFixed(2)}s`
}

/**
 * Compute a span's duration in ms directly from its startTime/endTime HrTime tuples,
 * rather than relying on the exporter's own (inconsistently named) duration field.
 */
export function getSpanDurationMs(span: { startTime?: [number, number]; endTime?: [number, number] }): number {
  if (!span.startTime || !span.endTime) return 0
  const startMs = span.startTime[0] * 1000 + span.startTime[1] / 1e6
  const endMs = span.endTime[0] * 1000 + span.endTime[1] / 1e6
  return Math.max(0, endMs - startMs)
}

/**
 * A span's start time in ms, from its startTime HrTime tuple.
 */
export function getSpanStartMs(span: { startTime?: [number, number] }): number {
  if (!span.startTime) return 0
  return span.startTime[0] * 1000 + span.startTime[1] / 1e6
}

/**
 * Flattens a nested attributes object into readable "dotted.path" -> value pairs,
 * e.g. { http: { request: { method: "GET" } } } -> [["http.request.method", "GET"]].
 */
export function flattenAttributes(obj: Record<string, any> | undefined, prefix = ""): [string, string][] {
  if (!obj) return []
  const entries: [string, string][] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenAttributes(value, path))
    } else {
      entries.push([path, Array.isArray(value) ? JSON.stringify(value) : String(value)])
    }
  }
  return entries
}

/**
 * Get log level color for badges
 */
export function getLogLevelColor(level: string): string {
  switch (level) {
    case "INFO":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "WARN":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "ERROR":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}
