import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MetricsPage from "./pages/metrics/MetricsPage";
import TracesPage from "./pages/traces/TracesPage";
import LogsPage from "./pages/logs/LogsPage";

function getBaseName() {
  const path = window.location.pathname;
  const marker = "/oas-telemetry-ui";
  const index = path.indexOf(marker);

  if (index !== -1) {
    return path.substring(0, index + marker.length);
  }

  return "/";
}


function App() {
  const basename = getBaseName();
  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/traces" element={<TracesPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/plugins" element={<div>Plugins</div>} />
      </Routes>
    </Router>
  );
}

export default App;