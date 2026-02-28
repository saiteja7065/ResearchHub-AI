import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { BookOpen, Search, Settings, PanelLeft, Bot, ExternalLink, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../store/AuthContext";
import { supabase } from "../lib/supabase";

export default function DashboardLayout() {
    const location = useLocation();
    const { user, session, loading } = useAuth();

    // If auth is still resolving, show a loader
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Bot className="w-12 h-12 text-primary animate-pulse" />
            </div>
        );
    }

    // If there's no active session, kick them back to login
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const navItems = [
        { icon: BookOpen, label: "Workspaces", href: "/dashboard" },
        { icon: Bot, label: "AI Agents", href: "/dashboard/agents" },
        { icon: Search, label: "Discover", href: "/dashboard/discover" },
        { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">

            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-border">
                    <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
                        <Bot className="w-5 h-5 text-primary" />
                        <span>ResearchHub</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-border">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                                {user?.email?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{user?.email}</p>
                                <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 z-10">
                    <button className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md">
                        <PanelLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                            Documentation
                            <ExternalLink className="w-3 h-3 inline-block ml-1 mb-1" />
                        </button>
                        <div className="h-4 w-px bg-border hidden sm:block"></div>
                        <button className="px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all">
                            Upgrade
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
