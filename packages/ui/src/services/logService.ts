import backend from "./Backend";

export interface LogEntry {
  _id: string
  resource: {
    attributes: {
      service: {
        name: string
      }
    }
  }
  instrumentationScope: {
    name: string
  }
  timestamp: number
  severityText: string
  severityNumber: number
  body: string
  attributes: {
    source: string
  }
  traceId?: string
  spanId?: string
  traceFlags?: number
  createdAt: string
  updatedAt: string
}

export interface LogsResponse {
  logs: LogEntry[]
}

export interface LogStatus {
  active: boolean
}

export interface SearchCriteria {
  textSearch?: string
  query?: Record<string, any>
  limit?: number
}

class LogsService {


  async findLogs(criteria: SearchCriteria): Promise<LogsResponse> {
    const { limit = 50, query = {}, textSearch } = criteria;
    const sort = { timestamp: -1 }; // Descending timestamp, from New to Old
    const res = await backend.post("/logs/find", { query, limit, textSearch, sort });
    const logs = res.data.items || [];
    return { logs: logs.reverse() }; // Reverse to have Oldest at top, Newest at bottom
  }

  async findOlderLogs(criteria: SearchCriteria, timestamp: number): Promise<LogsResponse> {
    const { limit = 50, query = {}, textSearch } = criteria;
    query.timestamp = { $lt: timestamp };
    const logSortOrder = { timestamp: -1 }; // Descending timestamp, from Old to New
    // Descending because we want first the newest of the older logs first (to not lose any when slicing), later we will reverse the array
    const res = await backend.post("/logs/find", { query, limit, textSearch, sort: logSortOrder });
    const logs = res.data.items || [];
    logs.reverse(); // Reverse to have Oldest at top, Newest at bottom
    // These are the closest (limited by 'limit') older logs, in ascending order (Old to New)
    return { logs };
  }

  async findNewerLogs(criteria: SearchCriteria, timestamp: number): Promise<LogsResponse> {
    const { limit = 50, query = {}, textSearch } = criteria;
    query.timestamp = { $gt: timestamp };
    const logSortOrder = { timestamp: 1 }; // Ascending timestamp, from New to Old
    // No need to reverse, as they are already in the right order
    const res = await backend.post("/logs/find", { query, limit, textSearch, sort: logSortOrder });
    const logs = res.data.items || [];
    // These are the closest (limited by 'limit') newer logs, in ascending order (Old to New)
    return { logs };
  }

  async getStatus(): Promise<LogStatus> {
    const res = await backend.get("/logs/status");
    return { active: !!res.data.active };
  }

  async startCollection(): Promise<void> {
    await backend.post("/logs/start");
  }

  async stopCollection(): Promise<void> {
    await backend.post("/logs/stop");
  }

  async resetLogs(): Promise<void> {
    await backend.post("/logs/reset");
  }

  async setRetentionTime(retentionTimeInSeconds: number): Promise<{ message: string }> {
    const res = await backend.post("/logs/retention-time", { retentionTimeInSeconds });
    return { message: res.data.message };
  }

  async getRetentionTime(): Promise<number> {
    const res = await backend.get("/logs/retention-time");
    return res.data.retentionTimeInSeconds || 0;
  }

  async generateLog(message: string): Promise<string> {
    const res = await backend.post("/utils/generate-log", { log: message });
    return res.data.message;
  }

  async generateCustomLog({ log, method, repeat }: { log: string, method: string, repeat: number }): Promise<string> {
    const res = await backend.post("/utils/generate-log", { log, method, repeat });
    return res.data.message;
  }

  async generateMockLogs(count: number): Promise<string> {
    const res = await backend.post("/utils/generate-mock-logs", { count });
    return res.data.message;
  }
}

export const logsService = new LogsService()
