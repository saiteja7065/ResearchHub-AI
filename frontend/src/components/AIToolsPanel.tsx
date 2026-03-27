import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Quote, ShieldCheck, Loader2, CheckCircle2, ChevronRight, Copy, Check } from 'lucide-react';
import { fetchApi } from '../lib/api';
import ReactMarkdown from 'react-markdown';

interface Paper {
    id: string;
    title: string;
    original_filename: string;
}

interface AIToolsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    papers: Paper[];
}

type ToolTab = 'review' | 'citation' | 'factcheck';

export default function AIToolsPanel({ isOpen, onClose, workspaceId, papers }: AIToolsPanelProps) {
    const [activeTab, setActiveTab] = useState<ToolTab>('review');
    const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
    
    // Tools State
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Citation Specific
    const [citationFormat, setCitationFormat] = useState('APA');
    
    // Fact Check Specific
    const [factClaim, setFactClaim] = useState('');

    if (!isOpen) return null;

    const togglePaperSelection = (id: string) => {
        setSelectedPaperIds(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const selectAll = () => setSelectedPaperIds(papers.map(p => p.id));
    const deselectAll = () => setSelectedPaperIds([]);

    const handleCopy = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const runTool = async () => {
        if (selectedPaperIds.length === 0 && activeTab !== 'factcheck') {
            setError("Please select at least one paper.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            let endpoint = '';
            let payload: any = { workspace_id: workspaceId, paper_ids: selectedPaperIds };

            if (activeTab === 'review') {
                endpoint = '/papers/ai-tools/literature-review';
            } else if (activeTab === 'citation') {
                endpoint = '/papers/ai-tools/citations';
                payload.format = citationFormat;
            } else if (activeTab === 'factcheck') {
                if (!factClaim.trim()) throw new Error("Please enter a claim to verify.");
                endpoint = '/papers/ai-tools/fact-check';
                payload.claim = factClaim;
            }

            const data = await fetchApi(endpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            setResult(data.result);
        } catch (err: any) {
            setError(err.message || "Failed to execute AI tool");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex justify-end bg-background/50 backdrop-blur-sm"
            >
                <div className="absolute inset-0" onClick={onClose} />
                
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl relative z-10"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/30">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                ✨ Advanced AI Tools
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">Run complex intelligence tasks across your documents.</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                        
                        {/* Tabs */}
                        <div className="flex p-1 bg-secondary/50 rounded-xl">
                            <button
                                onClick={() => setActiveTab('review')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'review' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                            >
                                <BookOpen className="w-4 h-4" /> Lit Review
                            </button>
                            <button
                                onClick={() => setActiveTab('citation')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'citation' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                            >
                                <Quote className="w-4 h-4" /> Citations
                            </button>
                            <button
                                onClick={() => setActiveTab('factcheck')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'factcheck' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                            >
                                <ShieldCheck className="w-4 h-4" /> Fact Checker
                            </button>
                        </div>

                        {/* Paper Selection (Hidden for Fact Checker if desired, but good for narrowing scope) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Select Target Papers</h3>
                                <div className="text-xs space-x-3">
                                    <button onClick={selectAll} className="text-primary hover:underline">Select All</button>
                                    <button onClick={deselectAll} className="text-muted-foreground hover:underline">Clear</button>
                                </div>
                            </div>
                            
                            <div className="border border-border/60 rounded-xl max-h-48 overflow-y-auto divide-y divide-border/40 bg-background">
                                {papers.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground text-center">No papers available. Please import some first.</div>
                                ) : (
                                    papers.map(paper => (
                                        <label key={paper.id} className="flex items-center gap-3 p-3 hover:bg-secondary/20 cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPaperIds.includes(paper.id)}
                                                onChange={() => togglePaperSelection(paper.id)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm flex-1 truncate">{paper.title}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-primary" />
                                {selectedPaperIds.length} of {papers.length} selected
                            </p>
                        </div>

                        {/* Tool Specific Inputs */}
                        <div className="space-y-4">
                            {activeTab === 'review' && (
                                <p className="text-sm text-muted-foreground">
                                    Generates a comprehensive markdown literature review comparing methodology, findings, and identifying research gaps across the selected papers.
                                </p>
                            )}
                            
                            {activeTab === 'citation' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Citation Format</label>
                                    <select 
                                        value={citationFormat}
                                        onChange={e => setCitationFormat(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="APA">APA 7th Edition</option>
                                        <option value="MLA">MLA 9th Edition</option>
                                        <option value="Chicago">Chicago Manual of Style</option>
                                        <option value="Harvard">Harvard Format</option>
                                    </select>
                                </div>
                            )}

                            {activeTab === 'factcheck' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Claim to Verify</label>
                                    <textarea 
                                        value={factClaim}
                                        onChange={e => setFactClaim(e.target.value)}
                                        placeholder="e.g. 'The paper suggests that large language models degrade gracefully on out-of-distribution math data.'"
                                        className="w-full h-24 bg-background border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-medium"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The engine will search the selected (or all) documents to verify if this claim is supported or refuted.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={runTool}
                            disabled={isLoading || (selectedPaperIds.length === 0 && activeTab !== 'factcheck')}
                            className="w-full py-3.5 bg-foreground text-background font-bold rounded-xl hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                            {isLoading ? "Analyzing Documents..." : "Run AI Tool"}
                        </button>

                        {error && (
                            <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
                                {error}
                            </div>
                        )}

                        {/* Result Area */}
                        {result && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 border border-border/80 bg-background rounded-xl overflow-hidden flex flex-col shadow-inner"
                            >
                                <div className="bg-secondary/50 px-4 py-3 border-b border-border/60 flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Output Generated
                                    </h4>
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-background px-2 py-1 rounded-md border border-border shadow-sm transition-colors"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div className="p-5 overflow-x-auto text-sm prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed custom-scrollbar">
                                    <ReactMarkdown>{result}</ReactMarkdown>
                                </div>
                            </motion.div>
                        )}
                        
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
