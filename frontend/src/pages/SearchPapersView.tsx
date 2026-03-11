import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, BookOpen, Download, Plus, Loader2,
    ExternalLink, Calendar, Users, Filter, CheckCircle2
} from "lucide-react";
import { fetchApi } from "../lib/api";
import { useWorkspaces } from "../hooks/useWorkspaces";

interface Paper {
    source: string;
    external_id: string;
    title: string;
    authors: string[];
    abstract: string;
    published_date: string;
    url: string;
}

export default function SearchPapersView() {
    const [query, setQuery] = useState("");
    const [source, setSource] = useState<"all" | "arxiv" | "pubmed" | "semantic_scholar">("all");
    const [results, setResults] = useState<Paper[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Import state
    const [importingId, setImportingId] = useState<string | null>(null);
    const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
    const [showImportMenu, setShowImportMenu] = useState<string | null>(null);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

    const { workspaces } = useWorkspaces();

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setSearched(false);

        try {
            const data = await fetchApi(`/papers/search?query=${encodeURIComponent(query)}&source=${source}&limit=10`);
            setResults(data.results || []);
            setSearched(true);
        } catch (err: any) {
            setError(err.message || "Search failed. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleImport = async (paper: Paper, workspaceId: string) => {
        setImportingId(paper.external_id);
        try {
            await fetchApi("/papers/import", {
                method: "POST",
                body: JSON.stringify({ ...paper, workspace_id: workspaceId }),
            });
            setImportedIds(prev => new Set([...prev, paper.external_id]));
            setShowImportMenu(null);
        } catch (err: any) {
            alert(`Import failed: ${err.message}`);
        } finally {
            setImportingId(null);
        }
    };

    const sourceColors: Record<string, string> = {
        "arXiv": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "PubMed": "bg-green-500/10 text-green-400 border-green-500/20",
        "Semantic Scholar": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Search Papers</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Search and import papers from arXiv, PubMed, and Semantic Scholar (215M+ papers).
                    </p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-3 flex-col sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="e.g. transformer architecture, LLM reasoning, CRISPR..."
                            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>

                    {/* Source Filter */}
                    <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 overflow-x-auto whitespace-nowrap">
                        {(["all", "arxiv", "pubmed", "semantic_scholar"] as const).map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSource(s)}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                                    source === s
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                }`}
                            >
                                {s === "all" ? "All Sources" : s === "arxiv" ? "arXiv" : s === "pubmed" ? "PubMed" : "Semantic Scholar"}
                            </button>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isSearching || !query.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all text-sm"
                    >
                        {isSearching ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                        ) : (
                            <><Search className="w-4 h-4" /> Search</>
                        )}
                    </button>
                </form>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {searched && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground font-medium">
                                    {results.length > 0
                                        ? `${results.length} results found for "${query}"`
                                        : `No results found for "${query}"`}
                                </p>
                                {results.length > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Filter className="w-3 h-3" /> {source === "all" ? "All Sources" : source === "arxiv" ? "arXiv" : source === "pubmed" ? "PubMed" : "Semantic Scholar"}
                                    </span>
                                )}
                            </div>

                            {results.map((paper, idx) => (
                                <motion.div
                                    key={`${paper.source}-${paper.external_id}-${idx}`}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                                >
                                    {/* Title row */}
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sourceColors[paper.source] || "bg-secondary text-foreground border-border"}`}>
                                                    {paper.source}
                                                </span>
                                                {paper.published_date && (
                                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <Calendar className="w-3 h-3" /> {paper.published_date}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                                                {paper.title}
                                            </h3>
                                        </div>
                                        <a
                                            href={paper.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                            title="Open in source"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>

                                    {/* Authors */}
                                    {paper.authors.length > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                                            <Users className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{paper.authors.join(", ")}</span>
                                        </div>
                                    )}

                                    {/* Abstract */}
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                                        {paper.abstract}
                                    </p>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 relative">
                                        {importedIds.has(paper.external_id) ? (
                                            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Imported
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setShowImportMenu(
                                                        showImportMenu === paper.external_id ? null : paper.external_id
                                                    )}
                                                    disabled={importingId === paper.external_id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-all"
                                                >
                                                    {importingId === paper.external_id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Plus className="w-3.5 h-3.5" />
                                                    )}
                                                    Import to Workspace
                                                </button>

                                                {/* Workspace selector dropdown */}
                                                <AnimatePresence>
                                                    {showImportMenu === paper.external_id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                                            className="absolute left-0 top-9 z-50 bg-popover border border-border rounded-xl shadow-xl min-w-[220px] overflow-hidden"
                                                        >
                                                            <p className="text-[10px] font-semibold text-muted-foreground px-3 pt-3 pb-1 uppercase tracking-wider">
                                                                Select Workspace
                                                            </p>
                                                            {workspaces.length === 0 && (
                                                                <p className="text-xs text-muted-foreground px-3 pb-3">No workspaces found.</p>
                                                            )}
                                                            {workspaces.map(ws => (
                                                                <button
                                                                    key={ws.id}
                                                                    onClick={() => handleImport(paper, ws.id)}
                                                                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors"
                                                                >
                                                                    <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                                    <span className="truncate">{ws.name}</span>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State (before first search) */}
                {!searched && !isSearching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground"
                    >
                        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                            <Search className="w-7 h-7 text-primary/40" />
                        </div>
                        <p className="font-medium">Search Academic Databases</p>
                        <p className="text-sm mt-1 max-w-sm">
                            Enter a keyword or topic to search millions of papers from arXiv, PubMed, and Semantic Scholar.
                        </p>
                        <div className="flex gap-2 mt-4 flex-wrap justify-center">
                            {["transformer architecture", "CRISPR gene editing", "reinforcement learning", "cancer immunotherapy"].map(ex => (
                                <button
                                    key={ex}
                                    onClick={() => { setQuery(ex); }}
                                    className="px-3 py-1 text-xs bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-full transition-all"
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Click outside to close dropdown */}
            {showImportMenu && (
                <div className="fixed inset-0 z-40" onClick={() => setShowImportMenu(null)} />
            )}
        </div>
    );
}
