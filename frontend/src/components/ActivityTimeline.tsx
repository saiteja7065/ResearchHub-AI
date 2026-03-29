import { motion } from 'framer-motion';
import { UploadCloud, MessageSquare, PlusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityFeedItem {
    id: string;
    type: 'upload' | 'comment' | 'workspace';
    description: string;
    workspace: string;
    created_at: string;
}

interface ActivityTimelineProps {
    activities: ActivityFeedItem[];
    isLoading: boolean;
}

export default function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col shadow-sm">
                <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
                <div className="space-y-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-secondary animate-pulse shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-secondary rounded w-3/4 animate-pulse"></div>
                                <div className="h-3 bg-secondary rounded w-1/4 animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/80 rounded-xl p-6 h-full flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-tight">Recent Activity</h3>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">Live feed</span>
            </div>

            {activities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-xl text-muted-foreground">
                    <p className="text-sm">No recent activity detected.</p>
                    <p className="text-xs mt-1">Upload papers or leave comments to populate this feed.</p>
                </div>
            ) : (
                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {activities.map((activity, idx) => {
                        const isUpload = activity.type === 'upload';
                        const isComment = activity.type === 'comment';
                        
                        return (
                            <motion.div 
                                key={activity.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex gap-4 relative"
                            >
                                {/* Timeline line */}
                                {idx !== activities.length - 1 && (
                                    <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border/60"></div>
                                )}
                                
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm z-10 ${
                                    isUpload ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 
                                    isComment ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                                    'bg-purple-500/10 border-purple-500/20 text-purple-500'
                                }`}>
                                    {isUpload && <UploadCloud className="w-4 h-4" />}
                                    {isComment && <MessageSquare className="w-4 h-4" />}
                                    {!isUpload && !isComment && <PlusCircle className="w-4 h-4" />}
                                </div>
                                
                                <div className="flex-1 pb-1">
                                    <p className="text-sm font-medium text-foreground leading-snug">
                                        {activity.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                        <span className="font-semibold px-1.5 py-0.5 bg-secondary rounded-md">{activity.workspace}</span>
                                        <span>•</span>
                                        <time>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</time>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
