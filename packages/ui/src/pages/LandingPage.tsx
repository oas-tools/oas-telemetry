import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <header className="text-center py-10">
        <h1 className="text-5xl font-bold mb-4">Welcome to OAS Telemetry</h1>
        <p className="text-xl">Monitor and analyze your system metrics effortlessly</p>
      </header>
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <div className="bg-white text-blue-500 p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer" onClick={() => navigate("/metrics")}>Metrics</div>
        <div className="bg-white text-blue-500 p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer" onClick={() => navigate("/traces")}>Traces</div>
        <div className="bg-white text-blue-500 p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer" onClick={() => navigate("/logs")}>Logs</div>
      </main>
      <footer className="text-center py-6">
        <p>&copy; 2025 OAS Telemetry. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
