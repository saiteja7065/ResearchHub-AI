import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Send, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
    id: string;
    workspace_id: string;
    user_id: string;
    author_email: string;
    content: string;
    created_at: string;
    paper_id?: string;
    insight_id?: string;
}

interface CommentSectionProps {
    workspaceId: string;
    paperId?: string;
    insightId?: string;
}

export default function CommentSection({ workspaceId, paperId, insightId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isMounted = true;

        const loadComments = async () => {
            setLoading(true);
            try {
                let url = `/workspaces/${workspaceId}/comments?`;
                if (paperId) url += `paper_id=${paperId}`;
                if (insightId) url += `insight_id=${insightId}`;

                const data = await fetchApi(url);
                if (isMounted) setComments(data.comments || []);
            } catch (err: any) {
                if (isMounted) setError(err.message || 'Failed to load comments');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadComments();

        // Set up real-time subscription
        const channel = supabase
            .channel(`comments-${paperId || insightId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments',
                    filter: `workspace_id=eq.${workspaceId}`
                },
                (payload) => {
                    const newRecord = payload.new as Comment;
                    // Double check it belongs to this specific target
                    if (
                        (paperId && newRecord.paper_id === paperId) ||
                        (insightId && newRecord.insight_id === insightId)
                    ) {
                        if (isMounted) {
                            setComments((prev) => {
                                // Prevent duplicates if the sender is this user
                                if (prev.find((c) => c.id === newRecord.id)) return prev;
                                return [...prev, newRecord];
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [workspaceId, paperId, insightId]);

    useEffect(() => {
        // Scroll to bottom when new comments arrive
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || sending) return;

        setSending(true);
        setError('');

        try {
            await fetchApi(`/workspaces/${workspaceId}/comments`, {
                method: 'POST',
                body: JSON.stringify({
                    content: newComment.trim(),
                    paper_id: paperId || null,
                    insight_id: insightId || null
                })
            });
            setNewComment('');
        } catch (err: any) {
            setError(err.message || 'Failed to post comment');
        } finally {
            setSending(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#222] bg-gray-50/50 dark:bg-[#1A1A1A]/50">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Team Discussion
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs py-0.5 px-2 rounded-full">
                        {comments.length}
                    </span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No comments yet.</p>
                        <p className="text-xs mt-1">Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {comments.map((comment) => (
                            <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-3"
                            >
                                <div className="flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                                        {comment.author_email.substring(0, 2)}
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                            {comment.author_email.split('@')[0]}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(comment.created_at)}
                                        </span>
                                    </div>
                                    <div className="mt-1 bg-gray-100 dark:bg-[#222] text-gray-800 dark:text-gray-200 px-4 py-2 rounded-2xl rounded-tl-none inline-block text-sm">
                                        {comment.content}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {error && (
                <div className="px-4 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-t border-red-100 dark:border-red-900/30">
                    {error}
                </div>
            )}

            <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-[#222] bg-white dark:bg-[#121212]">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full bg-gray-100 dark:bg-[#222] border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1A1A] focus:ring-0 text-sm rounded-full pl-4 pr-12 py-3 transition-colors dark:text-white"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || sending}
                        className="absolute right-2 p-1.5 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
