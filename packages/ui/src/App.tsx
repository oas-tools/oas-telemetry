import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MetricsPage from "./pages/metrics/MetricsPage";
import TracesPage from "./pages/traces/TracesPage";
import LogsPage from "./pages/logs/LogsPage";
import TracesDetailPage from "./pages/traces/TracesDetailPage";
import WorkInProgressPage from "./pages/WorkInProgressPage";
import NotFoundPage from "./pages/NotFoundPage";
import PageTemplate from "./components/pages/pageTemplate";

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
        <Route path="/" element={<PageTemplate activeTab="home"><LandingPage /></PageTemplate>} />
        <Route path="/metrics" element={<PageTemplate activeTab="metrics"><MetricsPage /></PageTemplate>} />
        <Route path="/traces" element={<PageTemplate activeTab="traces"><TracesPage /></PageTemplate>} />
        <Route path="/traces/details" element={<PageTemplate activeTab="traces"><TracesDetailPage /></PageTemplate>} />
        <Route path="/logs" element={<PageTemplate activeTab="logs"><LogsPage /></PageTemplate>} />
        <Route path="/plugins" element={<PageTemplate activeTab="plugins"><WorkInProgressPage /></PageTemplate>} />
        <Route path="*" element={<PageTemplate activeTab=""><NotFoundPage /></PageTemplate>} />
      </Routes>
    </Router>
  );
}

export default App;