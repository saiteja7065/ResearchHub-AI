import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitFormDataApi } from '../lib/api';

export default function WorkspaceView() {
    const { id } = useParams<{ id: string }>();

    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const processFiles = useCallback(async (files: File[]) => {
        if (!files.length || !id) return;

        // Process one file for now (Phase 1 focus)
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

            // Hit the backend Unstructured.io parser route
            const data = await submitFormDataApi(`/workspaces/${id}/upload`, formData);

            setUploadStatus({
                type: 'success',
                msg: `Successfully parsed ${file.name} into ${data.parsed_elements_count} elements.`
            });

        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to upload document.';
            setUploadStatus({ type: 'error', msg: errorMsg });
        } finally {
            setIsUploading(false);
        }
    }, [id]);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
    }, [processFiles]);

    const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            const files = Array.from(e.target.files);
            await processFiles(files);
        }
    }, [processFiles]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">

            <div>
                <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Workspaces
                </Link>
                <h1 className="text-3xl font-extrabold tracking-tight">Project Dashboard</h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                    Upload literature into this workspace to begin analysis.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Upload Area */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all min-h-[400px]
              ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border/60 bg-card/30 hover:bg-secondary/30'}
              ${uploadStatus?.type === 'success' ? 'border-green-500/50 bg-green-500/5' : ''}
              ${uploadStatus?.type === 'error' ? 'border-destructive/50 bg-destructive/5' : ''}
            `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 hidden"
                            onChange={handleFileInput}
                            accept=".pdf,.docx,.txt"
                            // Keep input active only when not uploading
                            disabled={isUploading}
                        />

                        <AnimatePresence mode="wait">
                            {isUploading ? (
                                <motion.div
                                    key="uploading"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center pointer-events-none"
                                >
                                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                                    <h3 className="text-xl font-bold mb-2">Extracting Intelligence...</h3>
                                    <p className="text-muted-foreground max-w-sm">
                                        Unstructured.io is currently parsing the document layout, extracting text, and identifying metadata.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="ready"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center pointer-events-none"
                                >
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-primary/20">
                                        <UploadCloud className="w-10 h-10 text-primary" />
                                    </div>

                                    <h3 className="text-2xl font-bold mb-3">Drag & Drop Documents</h3>
                                    <p className="text-muted-foreground mb-8 max-w-sm">
                                        Upload research papers. We support <strong className="text-foreground">PDFs</strong> and <strong className="text-foreground">DOCX</strong> formats.
                                    </p>

                                    <button
                                        className="px-8 py-3 bg-foreground text-background font-semibold rounded-xl shadow-lg hover:bg-foreground/90 transition-all pointer-events-auto"
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                    >
                                        Select Files
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </motion.div>

                    {/* Status Messages */}
                    <AnimatePresence>
                        {uploadStatus && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`p-4 rounded-xl flex items-start gap-4 border ${uploadStatus.type === 'success'
                                    ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
                                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                                    }`}
                            >
                                {uploadStatus.type === 'success' ? (
                                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 shrink-0" />
                                )}
                                <div>
                                    <p className="font-semibold text-sm">{uploadStatus.type === 'success' ? 'Upload Complete' : 'Upload Failed'}</p>
                                    <p className="text-sm opacity-90">{uploadStatus.msg}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar Status/Knowledge Base */}
                <div className="lg:col-span-1 border border-border/60 bg-card rounded-3xl p-6 h-fit sticky top-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Knowledge Base
                        </h3>
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">Live</span>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Extracting semantic value from uploaded documents into the Supabase database.
                        </p>

                        <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Indexed Papers</span>
                                <span className="font-mono text-sm font-bold">{uploadStatus?.type === 'success' ? '1' : '0'}</span>
                            </div>
                            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-1/4 rounded-full" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h4>
                            <div className="text-sm space-y-3">
                                <div className="flex gap-3 text-muted-foreground opacity-50">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-border" />
                                    <p>Workspace initialized.</p>
                                </div>
                                {uploadStatus?.type === 'success' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex gap-3 text-foreground"
                                    >
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <p>New document successfully embedded via Unstructured.io.</p>
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
