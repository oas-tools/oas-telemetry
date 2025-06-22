export interface TelemetryStatus {
  active: boolean
  valid: boolean
}

export interface HeapStats {
  total_heap_size: number
  total_heap_size_executable: number
  total_physical_size: number
  total_available_size: number
  used_heap_size: number
  heap_size_limit: number
  malloced_memory: number
  peak_malloced_memory: number
  does_zap_garbage: number
  number_of_native_contexts: number
  number_of_detached_contexts: number
  total_global_handles_size: number
  used_global_handles_size: number
  external_memory: number
  units: string
}

export interface ApiEndpoint {
  path: string
  method: string
  status: number
  description: string
  requestCount: number
  averageResponseTime: number
}

export interface TraceSpan {
  _id: string
  name: string
  _spanContext: {
    traceId: string
    spanId: string
    traceFlags: number
  }
  attributes: {
    http: {
      url: string
      host: string
      method: string
      scheme: string
      target: string
      user_agent: string
      status_code: number
      status_text: string
    }
    net: {
      host: {
        name: string
        ip: string
        port: number
      }
      transport: string
      peer: {
        ip: string
        port: number
      }
    }
  }
  startTime: [number, number]
  endTime: [number, number]
  _duration: [number, number]
}

export interface TraceData {
  spansCount: number
  spans: TraceSpan[]
}

export interface ParsedTrace {
  id: string
  timestamp: string
  endpoint: string
  method: string
  status: number
  duration: number
  traceId: string
}

class TelemetryService {
  // Mock data
  private mockEndpoints: ApiEndpoint[] = [
    {
      path: "/api/v1/pets",
      method: "GET",
      status: 200,
      description: "Get all pets - Success response",
      requestCount: 45,
      averageResponseTime: 0.123,
    },
    {
      path: "/api/v1/pets",
      method: "POST",
      status: 201,
      description: "Create a new pet - Created response",
      requestCount: 12,
      averageResponseTime: 0.245,
    },
    {
      path: "/api/v1/pets/{id}",
      method: "GET",
      status: 200,
      description: "Get pet by ID - Success response",
      requestCount: 78,
      averageResponseTime: 0.089,
    },
    {
      path: "/api/v1/pets/{id}",
      method: "PUT",
      status: 200,
      description: "Update pet - Success response",
      requestCount: 23,
      averageResponseTime: 0.156,
    },
    {
      path: "/api/v1/pets/{id}",
      method: "DELETE",
      status: 204,
      description: "Delete pet - No content response",
      requestCount: 8,
      averageResponseTime: 0.067,
    },
  ]

  private mockTraces: TraceSpan[] = [
    {
      _id: "trace1",
      name: "GET",
      _spanContext: {
        traceId: "6384a454fc9f7f8b92c2a81ba52a1196",
        spanId: "1301cf345acd798d",
        traceFlags: 1,
      },
      attributes: {
        http: {
          url: "http://localhost:3000/api/v1/pets",
          host: "localhost:3000",
          method: "GET",
          scheme: "http",
          target: "/api/v1/pets",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          status_code: 200,
          status_text: "OK",
        },
        net: {
          host: {
            name: "localhost",
            ip: "::1",
            port: 3000,
          },
          transport: "ip_tcp",
          peer: {
            ip: "::1",
            port: 60679,
          },
        },
      },
      startTime: [1750019394, 611000000],
      endTime: [1750019394, 612706900],
      _duration: [0, 1706900],
    },
    {
      _id: "trace2",
      name: "POST",
      _spanContext: {
        traceId: "fbd154896583e5d5d38bb29ba2cd7229",
        spanId: "cb80d69574b8ad85",
        traceFlags: 1,
      },
      attributes: {
        http: {
          url: "http://localhost:3000/api/v1/pets",
          host: "localhost:3000",
          method: "POST",
          scheme: "http",
          target: "/api/v1/pets",
          user_agent: "PostmanRuntime/7.44.0",
          status_code: 201,
          status_text: "CREATED",
        },
        net: {
          host: {
            name: "localhost",
            ip: "::1",
            port: 3000,
          },
          transport: "ip_tcp",
          peer: {
            ip: "::1",
            port: 59910,
          },
        },
      },
      startTime: [1750014165, 857000000],
      endTime: [1750014165, 964201300],
      _duration: [0, 107201300],
    },
  ]

  async getTelemetryStatus(): Promise<TelemetryStatus> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100))
    return { active: true, valid: true }
  }

  async toggleTelemetry(active: boolean): Promise<void> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 200))
    console.log(`Telemetry ${active ? "started" : "stopped"}`)
  }

  async resetTelemetryData(): Promise<void> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300))
    console.log("Telemetry data reset")
  }

  async getHeapStats(): Promise<HeapStats> {
    // Simulate API call with realistic data
    await new Promise((resolve) => setTimeout(resolve, 100))
    return {
      total_heap_size: 37.094 + Math.random() * 5,
      total_heap_size_executable: 1.5 + Math.random() * 0.5,
      total_physical_size: 37.094 + Math.random() * 5,
      total_available_size: 4109.268 + Math.random() * 100,
      used_heap_size: 34.933 + Math.random() * 3,
      heap_size_limit: 4144,
      malloced_memory: 0.531 + Math.random() * 0.2,
      peak_malloced_memory: 7.79 + Math.random() * 1,
      does_zap_garbage: 0,
      number_of_native_contexts: Math.floor(Math.random() * 5),
      number_of_detached_contexts: Math.floor(Math.random() * 3),
      total_global_handles_size: 0.023 + Math.random() * 0.01,
      used_global_handles_size: 0.017 + Math.random() * 0.008,
      external_memory: 3.565 + Math.random() * 1,
      units: "MB",
    }
  }

  async getApiEndpoints(): Promise<ApiEndpoint[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 150))
    return this.mockEndpoints
  }

  async getTracesByEndpoint(path: string, method: string, status: number): Promise<ParsedTrace[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 200))

    const filteredTraces = this.mockTraces.filter(
      (trace) =>
        trace.attributes.http.target === path &&
        trace.attributes.http.method.toLowerCase() === method.toLowerCase() &&
        trace.attributes.http.status_code === status,
    )

    return filteredTraces.map((trace) => this.parseTrace(trace))
  }

  private parseTrace(trace: TraceSpan): ParsedTrace {
    const startTime = trace.startTime[0] + trace.startTime[1] / 1e9
    const endTime = trace.endTime[0] + trace.endTime[1] / 1e9
    const duration = endTime - startTime

    return {
      id: trace._id,
      timestamp: new Date(startTime * 1000).toISOString(),
      endpoint: trace.attributes.http.target,
      method: trace.attributes.http.method.toLowerCase(),
      status: trace.attributes.http.status_code,
      duration: Number.parseFloat(duration.toFixed(3)),
      traceId: trace._spanContext.traceId,
    }
  }

  async getTraceDetails(traceId: string): Promise<TraceSpan | null> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100))
    return this.mockTraces.find((trace) => trace._spanContext.traceId === traceId) || null
  }
}

export const telemetryService = new TelemetryService()
