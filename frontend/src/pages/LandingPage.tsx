import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Search, Database, Upload, MessageSquare, FileText, Zap, Shield, BarChart3, Mail, Github, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function LandingPage() {
    const { session } = useAuth();

    return (
        <div className="relative min-h-screen w-full bg-background overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-8 h-8 text-primary" />
                    <span className="text-xl font-bold tracking-tight">ResearchHub AI</span>
                </div>
                <div className="flex items-center gap-4">
                    {session ? (
                        <Link
                            to="/dashboard"
                            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all shadow-lg"
                        >
                            Go to Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Sign In
                            </Link>
                            <Link
                                to="/login"
                                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all shadow-lg"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* ═══════════════════ Hero Section ═══════════════════ */}
            <main className="relative z-10 flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto pt-16 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded-full mb-8 border border-primary/20"
                >
                    <span className="flex w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Research-Grade Agentic Insights
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6"
                >
                    Don't just read papers.
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                        Understand the Science.
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                    className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
                >
                    Upload your literature, and let multi-agent AI automatically find contradictions, discover gaps, and generate synthesis reports faster than ever.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                >
                    <Link
                        to={session ? "/dashboard" : "/login"}
                        className="flex items-center gap-2 px-8 py-4 text-base font-semibold text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all shadow-xl group"
                    >
                        {session ? "Go to Dashboard" : "Get Started Free"}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </main>

            {/* ═══════════════════ Why ResearchHub? ═══════════════════ */}
            <section className="relative z-10 py-20 bg-card/50 border-y border-border">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-14"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Why Researchers Choose ResearchHub
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Traditional paper management wastes hours on manual searching, reading, and organizing. ResearchHub AI transforms your research workflow with intelligent automation.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: <Zap className="w-6 h-6" />, title: "10x Faster Analysis", desc: "AI reads and synthesizes across all your papers in seconds, not hours." },
                            { icon: <Shield className="w-6 h-6" />, title: "Never Miss a Detail", desc: "Multi-agent AI catches contradictions and gaps that human review often misses." },
                            { icon: <BarChart3 className="w-6 h-6" />, title: "Organized Research", desc: "Workspaces keep every project separate with its own AI context and history." },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow text-center"
                            >
                                <div className="p-3 bg-primary/10 rounded-xl text-primary mb-4 inline-flex">{item.icon}</div>
                                <h3 className="text-lg font-semibold mb-2 text-foreground">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ How It Works ═══════════════════ */}
            <section className="relative z-10 py-20">
                <div className="max-w-5xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-14"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
                        <p className="text-muted-foreground">Three simple steps to supercharge your research</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: "1", title: "Upload Papers", desc: "Import PDFs or search arXiv & PubMed directly from the platform.", icon: <Upload className="w-8 h-8" /> },
                            { step: "2", title: "AI Analyzes", desc: "Multi-agent AI reads every paper, builds vector embeddings, and generates insights.", icon: <BrainCircuit className="w-8 h-8" /> },
                            { step: "3", title: "Get Insights", desc: "Ask questions, get summaries, detect contradictions, and export reports.", icon: <FileText className="w-8 h-8" /> },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="relative flex flex-col items-center text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/20 flex items-center justify-center text-primary mb-5">
                                    {item.icon}
                                </div>
                                <span className="absolute -top-2 -left-2 w-8 h-8 bg-primary text-primary-foreground text-sm font-bold rounded-full flex items-center justify-center shadow-md md:left-auto md:right-auto">
                                    {item.step}
                                </span>
                                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ Features Grid ═══════════════════ */}
            <section className="relative z-10 py-20 bg-card/50 border-y border-border">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-14"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Powerful AI Features</h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">Everything you need to accelerate your research, powered by Groq's Llama 3.3 70B model.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: <MessageSquare className="w-5 h-5" />, title: "AI Chat Agent", desc: "Ask questions about your papers and get contextual, cited answers." },
                            { icon: <Database className="w-5 h-5" />, title: "Semantic Search", desc: "Find concepts across hundreds of documents using vector embeddings." },
                            { icon: <BrainCircuit className="w-5 h-5" />, title: "Contradiction Detection", desc: "Automatically find opposing claims across different papers." },
                            { icon: <Search className="w-5 h-5" />, title: "Gap Analysis", desc: "Identify unexplored research areas and opportunities." },
                            { icon: <FileText className="w-5 h-5" />, title: "Literature Reviews", desc: "Auto-generate comprehensive reviews with export to PDF, MD, PPTX." },
                            { icon: <Upload className="w-5 h-5" />, title: "Paper Import", desc: "Upload PDFs or search arXiv & PubMed to import papers instantly." },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                            >
                                <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors flex-shrink-0">
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ CTA Section ═══════════════════ */}
            <section className="relative z-10 py-20">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Accelerate Your Research?</h2>
                        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                            Join researchers who are saving hours every week with AI-powered paper analysis.
                        </p>
                        <Link
                            to={session ? "/dashboard" : "/login"}
                            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all shadow-xl group"
                        >
                            {session ? "Open Dashboard" : "Start For Free"}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════ Contact Section ═══════════════════ */}
            <section className="relative z-10 py-20 bg-card/50 border-t border-border">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-2xl font-bold text-foreground mb-3">Get In Touch</h2>
                        <p className="text-muted-foreground mb-8">
                            Have questions, feedback, or want to collaborate? Reach out anytime.
                        </p>
                        <a
                            href="mailto:saitejagarlapati5695@gmail.com"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 transition-all font-medium"
                        >
                            <Mail className="w-4 h-4" />
                            saitejagarlapati5695@gmail.com
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════ Footer ═══════════════════ */}
            <footer className="relative z-10 border-t border-border bg-card py-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Brand */}
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-6 h-6 text-primary" />
                            <span className="font-bold text-foreground">ResearchHub AI</span>
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center gap-5">
                            <a href="https://github.com/saitejagarlapati" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="https://linkedin.com/in/saitejagarlapati" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="LinkedIn">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href="https://twitter.com/saitejagarlapati" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Twitter">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="mailto:saitejagarlapati5695@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors" title="Email">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>

                        {/* Copyright */}
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} ResearchHub AI. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
