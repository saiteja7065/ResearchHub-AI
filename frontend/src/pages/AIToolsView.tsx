import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, BookOpen, Lightbulb, FileText, Loader2,
    Download, CheckSquare, Square, ChevronDown, AlertCircle
} from "lucide-react";
import { fetchApi } from "../lib/api";
import { useWorkspaces } from "../hooks/useWorkspaces";

interface Paper {
    id: string;
    title: string;
    original_filename: string;
    metadata: Record<string, any>;
}

type ToolType = "summaries" | "insights" | "literature-review";

interface ToolConfig {
    key: ToolType;
    label: string;
    description: string;
    buttonLabel: string;
    buttonClass: string;
    icon: React.ElementType;
    iconColor: string;
}

const TOOLS: ToolConfig[] = [
    {
        key: "summaries",
        label: "AI Summaries",
        description: "Generate concise summaries of selected research papers",
        buttonLabel: "Generate Summaries",
        buttonClass: "bg-violet-600 hover:bg-violet-700 text-white",
        icon: Zap,
        iconColor: "text-violet-400",
    },
    {
        key: "insights",
        label: "Key Insights",
        description: "Extract key insights and trends from research papers",
        buttonLabel: "Extract Insights",
        buttonClass: "bg-amber-500 hover:bg-amber-600 text-white",
        icon: Lightbulb,
        iconColor: "text-amber-400",
    },
    {
        key: "literature-review",
        label: "Literature Review",
        description: "Generate comprehensive literature reviews automatically",
        buttonLabel: "Generate Review",
        buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
        icon: BookOpen,
        iconColor: "text-emerald-400",
    },
];

export default function AIToolsView() {
    const { workspaces } = useWorkspaces();
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
    const [papers, setPapers] = useState<Paper[]>([]);
    const [papersLoading, setPapersLoading] = useState(false);
    const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());

    const [activeTool, setActiveTool] = useState<ToolType | null>(null);
    const [result, setResult] = useState<{ text: string; title: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-select first workspace
    useEffect(() => {
        if (workspaces.length > 0 && !selectedWorkspaceId) {
            setSelectedWorkspaceId(workspaces[0].id);
        }
    }, [workspaces]);

    // Load papers when workspace changes
    useEffect(() => {
        if (!selectedWorkspaceId) return;
        setPapersLoading(true);
        setSelectedPaperIds(new Set());
        setResult(null);
        fetchApi(`/workspaces/${selectedWorkspaceId}/papers`)
            .then(data => setPapers(data.papers || []))
            .catch(() => setPapers([]))
            .finally(() => setPapersLoading(false));
    }, [selectedWorkspaceId]);

    const togglePaper = (id: string) => {
        setSelectedPaperIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedPaperIds(new Set(papers.map(p => p.id)));
    const clearAll = () => setSelectedPaperIds(new Set());

    const handleGenerate = async (tool: ToolType) => {
        if (selectedPaperIds.size === 0) {
            setError("Please select at least one paper.");
            return;
        }
        setError(null);
        setIsGenerating(true);
        setActiveTool(tool);
        setResult(null);

        const toolConfig = TOOLS.find(t => t.key === tool)!;

        try {
            const data = await fetchApi(`/papers/ai-tools/${tool}`, {
                method: "POST",
                body: JSON.stringify({
                    paper_ids: Array.from(selectedPaperIds),
                    workspace_id: selectedWorkspaceId,
                }),
            });
            setResult({ text: data.result, title: `${toolConfig.label} Results` });
        } catch (err: any) {
            setError(err.message || "Generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;
        const blob = new Blob([result.text], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.title.toLowerCase().replace(/ /g, "_")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">AI Tools</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        AI-powered research analysis tools
                        {papers.length > 0 && ` • ${papers.length} papers available`}
                        {selectedPaperIds.size > 0 && ` • ${selectedPaperIds.size} selected`}
                    </p>
                </div>

                {/* Workspace Selector */}
                <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Workspace:</label>
                    <div className="relative">
                        <select
                            value={selectedWorkspaceId}
                            onChange={e => setSelectedWorkspaceId(e.target.value)}
                            className="appearance-none bg-card border border-border rounded-xl px-4 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                            {workspaces.length === 0 && <option value="">No workspaces</option>}
                            {workspaces.map(ws => (
                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                {/* Paper Selector */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm">Select Papers for Analysis</h2>
                        {papers.length > 0 && (
                            <div className="flex gap-3">
                                <button onClick={selectAll} className="text-xs text-primary hover:underline font-medium">
                                    Select all
                                </button>
                                <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>

                    {papersLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading papers...
                        </div>
                    ) : papers.length === 0 ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                            <FileText className="w-4 h-4 opacity-50" />
                            No papers in this workspace. Upload documents or import from Search Papers.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {papers.map(paper => {
                                const isSelected = selectedPaperIds.has(paper.id);
                                const authors = paper.metadata?.authors as string[] | undefined;
                                return (
                                    <button
                                        key={paper.id}
                                        onClick={() => togglePaper(paper.id)}
                                        className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${isSelected
                                                ? "border-primary/40 bg-primary/5"
                                                : "border-border/50 hover:border-border hover:bg-secondary/40"
                                            }`}
                                    >
                                        <div className="mt-0.5 flex-shrink-0 text-primary">
                                            {isSelected
                                                ? <CheckSquare className="w-4 h-4" />
                                                : <Square className="w-4 h-4 text-muted-foreground" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold leading-snug ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                {paper.title}
                                            </p>
                                            {authors && authors.length > 0 && (
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                    {authors.join(", ")}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            {selectedPaperIds.size > 0 && (
                                <p className="text-xs text-primary font-medium pt-1">
                                    {selectedPaperIds.size} paper{selectedPaperIds.size > 1 ? 's' : ''} selected
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                )}

                {/* Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {TOOLS.map(tool => (
                        <motion.div
                            key={tool.key}
                            whileHover={{ y: -2 }}
                            className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-all"
                        >
                            <div>
                                <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center mb-3`}>
                                    <tool.icon className={`w-4 h-4 ${tool.iconColor}`} />
                                </div>
                                <h3 className="font-semibold text-sm">{tool.label}</h3>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tool.description}</p>
                            </div>
                            <button
                                onClick={() => handleGenerate(tool.key)}
                                disabled={isGenerating || selectedPaperIds.size === 0}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${tool.buttonClass}`}
                            >
                                {isGenerating && activeTool === tool.key ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                                ) : (
                                    <><tool.icon className="w-3.5 h-3.5" /> {tool.buttonLabel}</>
                                )}
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border/60 rounded-2xl p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base">{result.title}</h3>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download
                                </button>
                            </div>
                            <div className="prose prose-sm prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed bg-secondary/30 rounded-xl p-4 border border-border/50 max-h-[500px] overflow-y-auto">
                                    {result.text}
                                </pre>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
