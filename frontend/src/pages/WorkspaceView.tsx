import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, UploadCloud, FileText, Loader2, CheckCircle2,
    AlertCircle, BookOpen, Calendar, Users, ExternalLink, Trash2
} from 'lucide-react';
import { submitFormDataApi, fetchApi } from '../lib/api';

interface Paper {
    id: string;
    title: string;
    original_filename: string;
    metadata: Record<string, any>;
    created_at: string;
}

export default function WorkspaceView() {
    const { id } = useParams<{ id: string }>();

    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // Papers list state
    const [papers, setPapers] = useState<Paper[]>([]);
    const [papersLoading, setPapersLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchPapers = useCallback(async () => {
        if (!id) return;
        setPapersLoading(true);
        try {
            const data = await fetchApi(`/workspaces/${id}/papers`);
            setPapers(data.papers || []);
        } catch {
            // non-critical
        } finally {
            setPapersLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchPapers(); }, [fetchPapers]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
        else if (e.type === 'dragleave') setIsDragging(false);
    }, []);

    const processFiles = useCallback(async (files: File[]) => {
        if (!files.length || !id) return;
        const file = files[0];
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
            setUploadStatus({ type: 'error', msg: 'Invalid file type. Please upload a PDF, DOCX, or TXT.' });
            return;
        }
        setIsUploading(true);
        setUploadStatus(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const data = await submitFormDataApi(`/workspaces/${id}/upload`, formData);
            setUploadStatus({ type: 'success', msg: `Successfully parsed ${file.name} into ${data.parsed_elements_count} elements.` });
            // Refresh papers list after upload
            await fetchPapers();
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to upload document.';
            setUploadStatus({ type: 'error', msg: errorMsg });
        } finally {
            setIsUploading(false);
        }
    }, [id, fetchPapers]);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        await processFiles(Array.from(e.dataTransfer.files));
    }, [processFiles]);

    const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) await processFiles(Array.from(e.target.files));
    }, [processFiles]);

    const handleDelete = async (paperId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this paper?")) return;
        try {
            await fetchApi(`/papers/${paperId}`, { method: "DELETE" });
            setPapers(prev => prev.filter(p => p.id !== paperId));
        } catch (err: any) {
            alert(err.message || "Failed to delete paper");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8 h-full overflow-y-auto">

            <div>
                <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-extrabold tracking-tight">My Workspace</h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                    Upload literature into this workspace to begin analysis.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── Upload Area ───────────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all min-h-[300px]
                            ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border/60 bg-card/30 hover:bg-secondary/30'}
                            ${uploadStatus?.type === 'success' ? 'border-green-500/50 bg-green-500/5' : ''}
                            ${uploadStatus?.type === 'error' ? 'border-destructive/50 bg-destructive/5' : ''}
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 hidden"
                            onChange={handleFileInput} accept=".pdf,.docx,.txt" disabled={isUploading} />

                        <AnimatePresence mode="wait">
                            {isUploading ? (
                                <motion.div key="uploading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center pointer-events-none">
                                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                                    <h3 className="text-xl font-bold mb-2">Extracting Intelligence...</h3>
                                    <p className="text-muted-foreground max-w-sm">
                                        Unstructured.io is parsing the document layout, extracting text, and generating embeddings.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div key="ready" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center pointer-events-none">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-primary/20">
                                        <UploadCloud className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3">Drag & Drop Documents</h3>
                                    <p className="text-muted-foreground mb-8 max-w-sm">
                                        Upload research papers. We support <strong className="text-foreground">PDFs</strong> and <strong className="text-foreground">DOCX</strong> formats.
                                    </p>
                                    <button className="px-8 py-3 bg-foreground text-background font-semibold rounded-xl shadow-lg hover:bg-foreground/90 transition-all pointer-events-auto"
                                        onClick={() => document.getElementById('file-upload')?.click()}>
                                        Select Files
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Upload Status */}
                    <AnimatePresence>
                        {uploadStatus && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                className={`p-4 rounded-xl flex items-start gap-4 border ${uploadStatus.type === 'success'
                                    ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
                                    : 'bg-destructive/10 border-destructive/20 text-destructive'}`}
                            >
                                {uploadStatus.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
                                <div>
                                    <p className="font-semibold text-sm">{uploadStatus.type === 'success' ? 'Upload Complete' : 'Upload Failed'}</p>
                                    <p className="text-sm opacity-90">{uploadStatus.msg}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Papers List ───────────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                Imported Papers
                                {papers.length > 0 && (
                                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {papers.length}
                                    </span>
                                )}
                            </h2>
                        </div>

                        {papersLoading ? (
                            <div className="flex items-center justify-center h-20 text-muted-foreground">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-sm">Loading papers...</span>
                            </div>
                        ) : papers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground border border-dashed border-border/60 rounded-2xl">
                                <FileText className="w-6 h-6 mb-2 opacity-40" />
                                <p className="text-sm">No papers yet. Upload a document or import from Search Papers.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {papers.map((paper, idx) => {
                                    const meta = paper.metadata || {};
                                    const authors: string[] = meta.authors || [];
                                    const url: string = meta.url || "";
                                    const source: string = meta.source || "Uploaded";
                                    const abstract: string = meta.abstract || "";
                                    const isExpanded = expandedId === paper.id;
                                    const date = paper.created_at?.split('T')[0] || "";

                                    return (
                                        <motion.div
                                            key={paper.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 transition-all group relative"
                                        >
                                            <div className="flex items-start justify-between gap-4 pr-12">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                                                            {source}
                                                        </span>
                                                        {date && (
                                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                <Calendar className="w-3 h-3" /> {date}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                                                        {paper.title}
                                                    </h3>
                                                </div>
                                                {url && (
                                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                                        className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors" title="Open source">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>

                                            <div className="absolute top-5 right-5">
                                                <button
                                                    onClick={(e) => handleDelete(paper.id, e)}
                                                    className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete paper"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {authors.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 pr-12">
                                                    <Users className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{authors.join(", ")}</span>
                                                </div>
                                            )}

                                            {abstract && (
                                                <div className="mt-3">
                                                    <p className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                        {abstract}
                                                    </p>
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : paper.id)}
                                                        className="mt-1 text-xs text-primary hover:underline font-medium"
                                                    >
                                                        {isExpanded ? 'Show less' : 'Read More'}
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Sidebar Knowledge Base ──────────────────── */}
                <div className="lg:col-span-1 border border-border/60 bg-card rounded-3xl p-6 h-fit sticky top-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Knowledge Base
                        </h3>
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">Live</span>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Indexed Papers</span>
                                <span className="font-mono text-sm font-bold text-primary">{papers.length}</span>
                            </div>
                            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: papers.length > 0 ? `${Math.min(papers.length * 20, 100)}%` : '5%' }}
                                    transition={{ duration: 0.8 }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h4>
                            <div className="text-sm space-y-3">
                                <div className="flex gap-3 text-muted-foreground opacity-50">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-border" />
                                    <p>Workspace initialized.</p>
                                </div>
                                {papers.slice(0, 3).map(p => (
                                    <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                        className="flex gap-3 text-foreground">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)] flex-shrink-0" />
                                        <p className="text-xs line-clamp-1">{p.title}</p>
                                    </motion.div>
                                ))}
                                {uploadStatus?.type === 'success' && (
                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                        className="flex gap-3 text-green-400">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <p className="text-xs">New document embedded via Unstructured.io.</p>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
