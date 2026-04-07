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
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "POST":
      return "bg-green-100 text-green-800 border-green-200"
    case "PUT":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "DELETE":
      return "bg-red-100 text-red-800 border-red-200"
    case "PATCH":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "HEAD":
      return "bg-slate-100 text-slate-800 border-slate-200"
    case "OPTIONS":
      return "bg-cyan-100 text-cyan-800 border-cyan-200"
    case "TRACE":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "CONNECT":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

/**
 * Get HTTP status code color for badges
 */
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "bg-green-100 text-green-800 border-green-200"
  if (status >= 300 && status < 400) return "bg-blue-100 text-blue-800 border-blue-200"
  if (status >= 400 && status < 500) return "bg-yellow-100 text-yellow-800 border-yellow-200"
  return "bg-red-100 text-red-800 border-red-200"
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
