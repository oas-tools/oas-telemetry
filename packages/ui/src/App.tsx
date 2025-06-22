import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MetricsPage from "./pages/metrics/MetricsPage";
import TracesPage from "./pages/traces/TracesPage";
import TracesDetailPage from "./pages/traces/TracesDetailPage";
import WorkInProgressPage from "./pages/WorkInProgressPage";
import NotFoundPage from "./pages/NotFoundPage";
import PageTemplate from "./components/pages/pageTemplate";
import { getFrontendBaseName } from "./services/Backend";




function App() {
  const basename = getFrontendBaseName();
  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<PageTemplate activeTab="home"><LandingPage /></PageTemplate>} />
        <Route path="/metrics" element={<PageTemplate activeTab="metrics"><MetricsPage /></PageTemplate>} />
        <Route path="/traces" element={<PageTemplate activeTab="traces"><TracesPage /></PageTemplate>} />
        <Route path="/traces/details" element={<PageTemplate activeTab="traces"><TracesDetailPage /></PageTemplate>} />
        <Route path="/logs" element={<PageTemplate activeTab="logs"><WorkInProgressPage /></PageTemplate>} />
        <Route path="/plugins" element={<PageTemplate activeTab="plugins"><WorkInProgressPage /></PageTemplate>} />
        <Route path="*" element={<PageTemplate activeTab=""><NotFoundPage /></PageTemplate>} />
      </Routes>
    </Router>
  );
}

export default App;