import { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { BookOpen, Search, Settings, Bot, LogOut, Zap, Menu, X } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../store/AuthContext";
import { supabase } from "../lib/supabase";

export default function DashboardLayout() {
    const location = useLocation();
    const { user, session, loading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Bot className="w-12 h-12 text-primary animate-pulse" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const navItems = [
        { icon: BookOpen, label: "Workspaces", href: "/dashboard" },
        { icon: Bot, label: "AI Agents", href: "/dashboard/agents" },
        { icon: Search, label: "Search Papers", href: "/dashboard/search-papers" },
        { icon: Zap, label: "AI Tools", href: "/dashboard/ai-tools" },
        { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    const currentLabel = navItems.find(item =>
        item.href === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(item.href)
    )?.label || "Dashboard";

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">

            {/* ── Sidebar ── */}
            <aside className={cn(
                "w-60 border-r border-border bg-card flex flex-col",
                // On mobile: fixed overlay; on md+: always visible
                "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
                "md:relative md:translate-x-0 md:z-auto shadow-2xl md:shadow-none",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Brand */}
                <div className="h-14 flex items-center px-5 border-b border-border shrink-0">
                    <Link to="/" className="flex items-center gap-2 font-bold text-base tracking-tight">
                        <Bot className="w-5 h-5 text-primary shrink-0" />
                        <span>ResearchHub</span>
                    </Link>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {navItems.map((item) => {
                        const isActive = item.href === "/dashboard"
                            ? location.pathname === "/dashboard"
                            : location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <item.icon className="w-4 h-4 shrink-0" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Footer */}
                <div className="p-3 border-t border-border shrink-0">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase text-xs shrink-0">
                            {user?.email?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{user?.email}</p>
                            <p className="text-xs text-muted-foreground">Free Plan</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* ── Main Content ── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 z-10 shrink-0">
                    {/* Hamburger — mobile only */}
                    <button
                        className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle navigation"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    <h1 className="text-base font-semibold text-foreground truncate">
                        {currentLabel}
                    </h1>

                    {/* User avatar — top-right */}
                    <div className="flex items-center gap-2 ml-auto md:ml-0">
                        <span className="text-sm text-muted-foreground hidden lg:block truncate max-w-[180px]">{user?.email}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                            {user?.email?.charAt(0) || 'U'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
