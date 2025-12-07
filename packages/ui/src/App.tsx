import { Suspense, lazy } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";
import Loading from "./components/pages/loading";
import PageTemplate from "./components/pages/pageTemplate";
import { AuthProvider } from "./context/AuthContext";
import ChatPage from "./pages/ai/ChatPage";
import { getFrontendBaseName } from "./services/Backend";

// Lazy loaded pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const MetricsPage = lazy(() => import("./pages/metrics/metrics-page"));
// const TracesPage = lazy(() => import("./pages/traces/TracesPage"));
// const TracesDetailPage = lazy(() => import("./pages/traces/TracesDetailPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PluginManagerPage = lazy(() => import("./pages/plugin/PluginPage"));
const PluginCreatePage = lazy(() => import("./pages/plugin/PluginCreatePage"));
const LoginPage = lazy(() => import("./pages/auth/loginPage"));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage"));
const LogsPage = lazy(() => import("./pages/tlm-logs/LogsPage"));
const DevToolsPage = lazy(() => import("./pages/DevToolsPage"));

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
              <Route path="/metrics" element={<PageTemplate activeTab="metrics"><MetricsPage /></PageTemplate>} />
              <Route path="/logs" element={<PageTemplate activeTab="logs"><LogsPage /></PageTemplate>} />
              <Route path="/plugins" element={<PageTemplate activeTab="plugins"><PluginManagerPage /></PageTemplate>} />
              <Route path="/plugins/create" element={<PageTemplate activeTab="plugins"><PluginCreatePage /></PageTemplate>} />
              <Route path="/chat" element={<PageTemplate activeTab="chat" showFooter={false}><ChatPage /></PageTemplate>} />
              <Route path="/api" element={<PageTemplate activeTab=""><ApiDocsPage /></PageTemplate>} />
              <Route path="/dev-tools" element={<PageTemplate activeTab=""><DevToolsPage /></PageTemplate>} />
              <Route path="*" element={<PageTemplate activeTab=""><NotFoundPage /></PageTemplate>} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;