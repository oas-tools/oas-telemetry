import { fetchMockTraces } from "../../services/mockDataService";
import { fetchTracesFromBackend } from "../../services/traceService";
import { Card } from "../../components/ui/card";
import { useEffect, useState } from "react";

function TracesPage() {
  const [backendTraces, setBackendTraces] = useState(null);
  const traces = fetchMockTraces();

  useEffect(() => {
    const fetchBackendData = async () => {
      const data = await fetchTracesFromBackend();
      setBackendTraces(data);
    };
    fetchBackendData();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Traces</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {traces.map((trace) => (
          <Card key={trace.id} className="p-6 bg-white shadow-md">
            <h2 className="text-xl font-bold">Trace ID: {trace.traceId}</h2>
            <p className="text-lg">Duration: {trace.duration}</p>
            <p className="text-lg">Service: {trace.service}</p>
          </Card>
        ))}
      </div>
      <div className="mt-10">
        <h2 className="text-xl font-bold">Backend Traces:</h2>
        <pre className="bg-gray-200 p-4 rounded">
          {backendTraces ? JSON.stringify(backendTraces, null, 2) : "Loading..."}
        </pre>
      </div>
    </div>
  );
}

export default TracesPage;
