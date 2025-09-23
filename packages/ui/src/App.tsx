import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MetricsPage from "./pages/metrics/MetricsPage";
import TracesPage from "./pages/traces/TracesPage";
import TracesDetailPage from "./pages/traces/TracesDetailPage";
import WorkInProgressPage from "./pages/WorkInProgressPage";
import NotFoundPage from "./pages/NotFoundPage";
import PageTemplate from "./components/pages/pageTemplate";
import { getFrontendBaseName } from "./services/Backend";
import PluginManagerPage from "./pages/plugin/PluginPage";
import { Toaster } from "sonner";
import PluginCreatePage from "./pages/plugin/PluginCreatePage";
import { LoginPage } from "./pages/auth/loginPage";
import { AuthProvider } from "./context/AuthContext";



function App() {
  const basename = getFrontendBaseName();
  return (
    <>
      <Toaster richColors closeButton duration={5000} />
      <AuthProvider>
        <Router basename={basename}>
          <Routes>
            <Route path="/" element={<PageTemplate activeTab="home"><LandingPage /></PageTemplate>} />
            <Route path="/metrics" element={<PageTemplate activeTab="metrics"><MetricsPage /></PageTemplate>} />
            <Route path="/traces" element={<PageTemplate activeTab="traces"><TracesPage /></PageTemplate>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/traces/details" element={<PageTemplate activeTab="traces"><TracesDetailPage /></PageTemplate>} />
            <Route path="/logs" element={<PageTemplate activeTab="logs"><WorkInProgressPage /></PageTemplate>} />
            <Route path="/plugins" element={<PageTemplate activeTab="plugins"><PluginManagerPage /></PageTemplate>} />
            <Route path="/plugins/create" element={<PageTemplate activeTab="plugins"><PluginCreatePage /></PageTemplate>} />
            <Route path="*" element={<PageTemplate activeTab=""><NotFoundPage /></PageTemplate>} />
          </Routes>
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;