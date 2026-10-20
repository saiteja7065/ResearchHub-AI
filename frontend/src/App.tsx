import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./store/AuthContext";
import { pageLoaders } from "./pages/loaders";
import { warmBackend } from "./lib/api";

// Each route is its own chunk, so the landing page doesn't download the whole dashboard
const LandingPage = lazy(pageLoaders.landing);
const AuthPage = lazy(pageLoaders.auth);
const DashboardLayout = lazy(pageLoaders.dashboardLayout);
const DashboardView = lazy(pageLoaders.dashboard);
const WorkspaceView = lazy(pageLoaders.workspace);
const AIAgentsView = lazy(pageLoaders.agents);
const SearchPapersView = lazy(pageLoaders.searchPapers);
const AIToolsView = lazy(pageLoaders.aiTools);
const SettingsView = lazy(pageLoaders.settings);

function FullScreenFallback() {
  return <div className="min-h-screen w-full bg-background" />;
}

export default function App() {
  useEffect(() => {
    // Wake the backend as early as possible (Render free tier cold starts take ~30s)
    warmBackend();
    // Once the first screen is idle, prefetch the remaining page chunks so navigation is instant
    const prefetch = () => Object.values(pageLoaders).forEach((load) => load().catch(() => {}));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(prefetch);
    else setTimeout(prefetch, 2000);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FullScreenFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />

            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardView />} />
              <Route path="workspace/:id" element={<WorkspaceView />} />
              <Route path="agents" element={<AIAgentsView />} />
              <Route path="search-papers" element={<SearchPapersView />} />
              <Route path="ai-tools" element={<AIToolsView />} />
              <Route path="settings" element={<SettingsView />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
