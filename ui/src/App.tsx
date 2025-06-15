import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MetricsPage from "./pages/metrics/MetricsPage";
import TracesPage from "./pages/traces/TracesPage";
import LogsPage from "./pages/logs/LogsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/traces" element={<TracesPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </Router>
  );
}

export default App;