export const fetchMockMetrics = () => {
  return [
    { id: 1, name: "CPU Usage", value: "45%" },
    { id: 2, name: "Memory Usage", value: "60%" },
    { id: 3, name: "Disk Usage", value: "70%" },
    { id: 4, name: "Network Latency", value: "120ms" },
  ];
};

export const fetchMockTraces = () => {
  return [
    { id: 1, traceId: "abc123", duration: "120ms", service: "AuthService" },
    { id: 2, traceId: "def456", duration: "200ms", service: "MetricsService" },
    { id: 3, traceId: "ghi789", duration: "300ms", service: "LoggingService" },
    { id: 4, traceId: "jkl012", duration: "400ms", service: "TelemetryService" },
  ];
};

export const fetchMockLogs = () => {
  return [
    { id: 1, message: "Error: Something went wrong", timestamp: "2025-06-14T12:00:00Z", level: "Error" },
    { id: 2, message: "Warning: High memory usage", timestamp: "2025-06-14T12:05:00Z", level: "Warning" },
    { id: 3, message: "Info: System started successfully", timestamp: "2025-06-14T12:10:00Z", level: "Info" },
    { id: 4, message: "Debug: Variable x initialized", timestamp: "2025-06-14T12:15:00Z", level: "Debug" },
  ];
};
