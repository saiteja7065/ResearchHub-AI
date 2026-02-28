import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Search, Database } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
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
                    <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Sign In
                    </Link>
                    <Link
                        to="/dashboard"
                        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary-glow"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center max-w-5xl mx-auto">
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
                    className="flex flex-col sm:flex-row items-center gap-4"
                >
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-8 py-4 text-base font-semibold text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all shadow-xl hover:shadow-primary-glow group"
                    >
                        Enter Workspace
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>

                {/* Feature Highlights Component */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
                    className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl"
                >
                    <FeatureCard
                        icon={<Database className="w-6 h-6" />}
                        title="Semantic Search"
                        desc="Find exact concepts across hundreds of documents instantly."
                    />
                    <FeatureCard
                        icon={<BrainCircuit className="w-6 h-6" />}
                        title="Contradiction Detection"
                        desc="Automatically detect opposing claims in scientific literature."
                    />
                    <FeatureCard
                        icon={<Search className="w-6 h-6" />}
                        title="Gap Analysis"
                        desc="Identify unexplored research vectors using embedding clustering."
                    />
                </motion.div>
            </main>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-primary/5 rounded-xl text-primary mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
    );
}
