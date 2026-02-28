import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspaces } from '../hooks/useWorkspaces';

export default function DashboardView() {
    const { workspaces, loading, error, createWorkspace } = useWorkspaces();
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setSubmitLoading(true);
        try {
            await createWorkspace(newTitle, newDesc);
            setIsCreating(false);
            setNewTitle('');
            setNewDesc('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Workspaces</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Create and organize your research libraries for vector analysis.
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-medium">
                    Error loading workspaces: {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                    {/* Create New Workspace Card */}
                    <AnimatePresence mode="wait">
                        {!isCreating ? (
                            <motion.div
                                key="create-btn"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setIsCreating(true)}
                                className="flex flex-col items-center justify-center p-6 h-[220px] border-2 border-dashed border-border/60 hover:border-primary/50 bg-card/30 hover:bg-primary/5 rounded-2xl transition-all cursor-pointer group"
                            >
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <p className="mt-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                                    New Workspace
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="create-form"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 h-auto border border-primary/20 bg-primary/5 p-6 rounded-2xl shadow-lg shadow-primary/5"
                            >
                                <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
                                    <h3 className="text-lg font-bold">Create new workspace</h3>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                                        <input
                                            autoFocus
                                            required
                                            value={newTitle}
                                            onChange={e => setNewTitle(e.target.value)}
                                            placeholder="e.g. LLM Reasoning Benchmarks 2026"
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (Optional)</label>
                                        <textarea
                                            value={newDesc}
                                            onChange={e => setNewDesc(e.target.value)}
                                            placeholder="Brief context about this research..."
                                            rows={2}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="submit"
                                            disabled={submitLoading || !newTitle.trim()}
                                            className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Create Project
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreating(false)}
                                            className="px-5 py-2.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg hover:bg-secondary/80 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Existing Workspaces List */}
                    {workspaces.map((workspace, idx) => (
                        <motion.div
                            key={workspace.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                        >
                            <Link
                                to={`/dashboard/workspace/${workspace.id}`}
                                className="flex flex-col p-6 h-[220px] bg-card border border-border/60 hover:border-primary/40 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10 group-hover:bg-primary/10 transition-colors" />

                                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                    <Folder className="w-5 h-5" />
                                </div>

                                <h3 className="text-lg font-bold text-foreground line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
                                    {workspace.name}
                                </h3>

                                <p className="text-sm text-muted-foreground line-clamp-2 mb-auto">
                                    {workspace.description || "No description provided."}
                                </p>

                                <div className="flex items-center gap-2 mt-4 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                    Open Workspace <ArrowRight className="w-3 h-3" />
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
