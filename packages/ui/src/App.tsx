import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import PageTemplate from "./components/pages/pageTemplate";
import { getFrontendBaseName } from "./services/Backend";
import Loading from "./components/pages/loading";
import WorkInProgressPage from "./pages/WorkInProgressPage";

// Lazy loaded pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
// const MetricsPage = lazy(() => import("./pages/metrics/MetricsPage"));
// const TracesPage = lazy(() => import("./pages/traces/TracesPage"));
const TracesDetailPage = lazy(() => import("./pages/traces/TracesDetailPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PluginManagerPage = lazy(() => import("./pages/plugin/PluginPage"));
const PluginCreatePage = lazy(() => import("./pages/plugin/PluginCreatePage"));
const LoginPage = lazy(() => import("./pages/auth/loginPage"));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage"));
const LogsPage = lazy(() => import("./pages/tlm-logs/LogsPage"));

function App() {
  const basename = getFrontendBaseName();

  return (
    <>
      <Toaster richColors closeButton duration={5000} />
      <AuthProvider>
        <Router basename={basename}>
          <Suspense fallback={<PageTemplate><Loading /></PageTemplate>}>
            <Routes>
              <Route path="/" element={<PageTemplate activeTab="home"><LandingPage /></PageTemplate>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/traces" element={<PageTemplate activeTab="traces"><WorkInProgressPage /></PageTemplate>} />
              <Route path="/traces/details" element={<PageTemplate activeTab="traces"><TracesDetailPage /></PageTemplate>} />
              <Route path="/metrics" element={<PageTemplate activeTab="metrics"><WorkInProgressPage /></PageTemplate>} />
              <Route path="/logs" element={<PageTemplate activeTab="logs"><LogsPage /></PageTemplate>} />
              <Route path="/plugins" element={<PageTemplate activeTab="plugins"><PluginManagerPage /></PageTemplate>} />
              <Route path="/plugins/create" element={<PageTemplate activeTab="plugins"><PluginCreatePage /></PageTemplate>} />
              <Route path="/api" element={<PageTemplate activeTab=""><ApiDocsPage /></PageTemplate>} />
              <Route path="*" element={<PageTemplate activeTab=""><NotFoundPage /></PageTemplate>} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;