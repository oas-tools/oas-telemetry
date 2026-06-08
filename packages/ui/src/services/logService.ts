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
    const res = await backend.post("/logs/exporters/in-memory-exporter/data/find", { query, limit, textSearch, sort });
    const logs = res.data.logs || [];
    return { logs: logs.reverse() }; // Reverse to have Oldest at top, Newest at bottom
  }

  async findOlderLogs(criteria: SearchCriteria, timestamp: number): Promise<LogsResponse> {
    const { limit = 50, query = {}, textSearch } = criteria;
    query.timestamp = { $lt: timestamp };
    const logSortOrder = { timestamp: -1 }; // Descending timestamp, from Old to New
    // Descending because we want first the newest of the older logs first (to not lose any when slicing), later we will reverse the array
    const res = await backend.post("/logs/exporters/in-memory-exporter/data/find", { query, limit, textSearch, sort: logSortOrder });
    const logs = res.data.logs || [];
    logs.reverse(); // Reverse to have Oldest at top, Newest at bottom
    // These are the closest (limited by 'limit') older logs, in ascending order (Old to New)
    return { logs };
  }

  async findNewerLogs(criteria: SearchCriteria, timestamp: number): Promise<LogsResponse> {
    const { limit = 50, query = {}, textSearch } = criteria;
    query.timestamp = { $gt: timestamp };
    const logSortOrder = { timestamp: 1 }; // Ascending timestamp, from New to Old
    // No need to reverse, as they are already in the right order
    const res = await backend.post("/logs/exporters/in-memory-exporter/data/find", { query, limit, textSearch, sort: logSortOrder });
    const logs = res.data.logs || [];
    // These are the closest (limited by 'limit') newer logs, in ascending order (Old to New)
    return { logs };
  }

  async getStatus(): Promise<LogStatus> {
    const res = await backend.get("/logs/exporters/in-memory-exporter/status");
    return { active: !!res.data.active };
  }

  async startCollection(): Promise<void> {
    await backend.post("/logs/exporters/in-memory-exporter/start");
  }

  async stopCollection(): Promise<void> {
    await backend.post("/logs/exporters/in-memory-exporter/stop");
  }

  async resetLogs(): Promise<void> {
    await backend.post("/logs/exporters/in-memory-exporter/reset");
  }

  async setRetentionTime(retentionTimeInSeconds: number): Promise<{ message: string }> {
    const res = await backend.post("/logs/exporters/in-memory-exporter/retention-time", { retentionTimeInSeconds });
    return { message: res.data.message };
  }

  async getRetentionTime(): Promise<number> {
    const res = await backend.get("/logs/exporters/in-memory-exporter/retention-time");
    return res.data.retentionTimeInSeconds || 0;
  }

  generateLog(message: string): Promise<string> {
    return backend.post("/utils/generate-log", { log: message }).then(res => res.data.message);
  }

  generateCustomLog({ log, method, repeat }: { log: string, method: string, repeat: number }): Promise<string> {
    return backend.post("/utils/generate-log", { log, method, repeat }).then(res => res.data.message);
  }

  generateMockLogs(count: number): Promise<string> {
    return backend.post("/utils/generate-mock-logs", { count }).then(res => res.data.message);
  }

  download(): void {
    const baseUrl = backend.defaults.baseURL;
    const downloadUrl = `${baseUrl}/logs/exporters/in-memory-exporter/export`;
    window.open(downloadUrl, '_blank');
  }

  async import(file: File, options: { reset: boolean }): Promise<void> {
    const parsed = JSON.parse(await file.text());
    const logs = Array.isArray(parsed) ? parsed : parsed?.logs;

    if (!Array.isArray(logs)) {
      throw new Error('Invalid JSON format. Expected an array or an object with a logs array.');
    }

    await backend.post(`/logs/exporters/in-memory-exporter/import?reset=${options.reset}`, { logs });
  }
}

export const logsService = new LogsService()
