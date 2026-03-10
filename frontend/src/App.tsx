import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardView from "./pages/DashboardView";
import WorkspaceView from "./pages/WorkspaceView";
import AIAgentsView from "./pages/AIAgentsView";
import AuthPage from "./pages/AuthPage";
import SearchPapersView from "./pages/SearchPapersView";
import AIToolsView from "./pages/AIToolsView";
import SettingsView from "./pages/SettingsView";
import { AuthProvider } from "./store/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}
