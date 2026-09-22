import { Suspense, lazy } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";
import Loading from "./components/pages/loading";
import PageTemplate from "./components/pages/pageTemplate";
import ModuleDisabled from "./components/pages/ModuleDisabled";
import { AuthProvider } from "./context/AuthContext";
import { CapabilitiesProvider, useCapabilities } from "./context/CapabilitiesContext";
import ChatPage from "./pages/ai/ChatPage";
import { getFrontendBaseName } from "./services/Backend";

// Lazy loaded pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const MetricsPageNew = lazy(() => import("./pages/metrics/metrics-page"));
const TraceSpansPage = lazy(() => import("./pages/traces/TraceSpansPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PluginManagerPage = lazy(() => import("./pages/plugin/PluginPage"));
const PluginCreatePage = lazy(() => import("./pages/plugin/PluginCreatePage"));
const LoginPage = lazy(() => import("./pages/auth/loginPage"));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage"));
const LogsPage = lazy(() => import("./pages/tlm-logs/LogsPage"));
const DevToolsPage = lazy(() => import("./pages/DevToolsPage"));

function ChatRoute() {
    const { ai, loading } = useCapabilities();
    if (loading) {
        return <PageTemplate activeTab="chat" showFooter={false}><Loading /></PageTemplate>;
    }
    return ai
        ? <PageTemplate activeTab="chat" showFooter={false}><ChatPage /></PageTemplate>
        : <PageTemplate activeTab=""><ModuleDisabled feature="AI Chat" /></PageTemplate>;
}

function PluginsRoute({ create = false }: { create?: boolean }) {
    const { plugins, loading } = useCapabilities();
    if (loading) {
        return <PageTemplate activeTab="plugins"><Loading /></PageTemplate>;
    }
    if (!plugins) {
        return <PageTemplate activeTab=""><ModuleDisabled feature="Plugins" /></PageTemplate>;
    }
    return create
        ? <PageTemplate activeTab="plugins"><PluginCreatePage /></PageTemplate>
        : <PageTemplate activeTab="plugins"><PluginManagerPage /></PageTemplate>;
}

function App() {
    const basename = getFrontendBaseName();

    return (
        <>
            <Toaster richColors closeButton duration={5000} />
            <AuthProvider>
                <CapabilitiesProvider>
                    <Router basename={basename}>
                        <Suspense fallback={<PageTemplate><Loading /></PageTemplate>}>
                            <Routes>
                                <Route path="/" element={<PageTemplate activeTab="home"><LandingPage /></PageTemplate>} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/traces" element={<PageTemplate activeTab="traces"><TraceSpansPage /></PageTemplate>} />
                                <Route path="/metrics" element={<PageTemplate activeTab="metrics"><MetricsPageNew /></PageTemplate>} />
                                <Route path="/logs" element={<PageTemplate activeTab="logs"><LogsPage /></PageTemplate>} />
                                <Route path="/plugins" element={<PluginsRoute />} />
                                <Route path="/plugins/create" element={<PluginsRoute create />} />
                                <Route path="/chat" element={<ChatRoute />} />
                                <Route path="/api" element={<PageTemplate activeTab=""><ApiDocsPage /></PageTemplate>} />
                                <Route path="/dev-tools" element={<PageTemplate activeTab=""><DevToolsPage /></PageTemplate>} />
                                <Route path="*" element={<PageTemplate activeTab=""><NotFoundPage /></PageTemplate>} />
                            </Routes>
                        </Suspense>
                    </Router>
                </CapabilitiesProvider>
            </AuthProvider>
        </>
    );
}

export default App;