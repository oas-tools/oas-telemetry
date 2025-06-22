import { fetchMockMetrics } from "../../services/mockDataService";
import { Card } from "../../components/ui/card";

function MetricsPage() {
  const metrics = fetchMockMetrics();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Metrics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.id} className="p-6 bg-white shadow-md">
            <h2 className="text-xl font-bold">{metric.name}</h2>
            <p className="text-lg">Value: {metric.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MetricsPage;
