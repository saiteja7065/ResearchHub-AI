import { motion } from 'framer-motion';
import { BookOpen, Users, MessageSquareQuote, Layers } from 'lucide-react';

interface Metrics {
    active_workspaces: number;
    total_papers: number;
    total_comments: number;
    shared_environments: number;
}

interface AnalyticsOverviewProps {
    metrics: Metrics | null;
    isLoading: boolean;
}

export default function AnalyticsOverview({ metrics, isLoading }: AnalyticsOverviewProps) {
    const cards = [
        { title: "Total Documents", value: metrics?.total_papers || 0, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Active Workspaces", value: metrics?.active_workspaces || 0, icon: Layers, color: "text-purple-500", bg: "bg-purple-500/10" },
        { title: "Team Discussions", value: metrics?.total_comments || 0, icon: MessageSquareQuote, color: "text-green-500", bg: "bg-green-500/10" },
        { title: "Shared Environments", value: metrics?.shared_environments || 0, icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
            {cards.map((card, idx) => (
                <motion.div 
                    key={idx}
                    variants={itemVariants}
                    className="bg-card border border-border/80 rounded-xl p-5 flex flex-col justify-center relative overflow-hidden group hover:border-border transition-colors"
                >
                    <div className="flex items-center justify-between z-10">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</p>
                            <p className="text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
                        </div>
                        <div className={`p-3 rounded-full ${card.bg}`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                    </div>
                    {/* Subtle gradient flash on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-${card.color.split('-')[1]}-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>
                </motion.div>
            ))}
        </motion.div>
    );
}
