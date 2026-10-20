// Shared dynamic imports: used by React.lazy for routing and by the idle-time prefetch in App
export const pageLoaders = {
    landing: () => import("./LandingPage"),
    auth: () => import("./AuthPage"),
    dashboardLayout: () => import("../layouts/DashboardLayout"),
    dashboard: () => import("./DashboardView"),
    workspace: () => import("./WorkspaceView"),
    agents: () => import("./AIAgentsView"),
    searchPapers: () => import("./SearchPapersView"),
    aiTools: () => import("./AIToolsView"),
    settings: () => import("./SettingsView"),
};
