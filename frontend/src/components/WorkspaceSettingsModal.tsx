import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Mail, Loader2, UserMinus } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface Member {
    user_id: string;
    role: string;
    email?: string;
}

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    workspaceName: string;
}

export default function WorkspaceSettingsModal({ isOpen, onClose, workspaceId, workspaceName }: WorkspaceSettingsModalProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [inviteLoading, setInviteLoading] = useState(false);
    
    // Authorization State
    const [currentUserRole, setCurrentUserRole] = useState<string>('viewer');

    useEffect(() => {
        if (!isOpen) return;
        fetchMembers();
    }, [isOpen]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const data = await fetchApi(`/workspaces/${workspaceId}/members`);
            setMembers(data.members || []);
            setCurrentUserRole(data.current_user_role || 'viewer');
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setInviteLoading(true);
        try {
            await fetchApi(`/workspaces/${workspaceId}/members/invite`, {
                method: "POST",
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            setInviteEmail('');
            await fetchMembers();
        } catch (err: any) {
            alert(`Failed to invite: ${err.message}`);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        
        try {
            await fetchApi(`/workspaces/${workspaceId}/members/${userId}`, {
                method: "DELETE"
            });
            await fetchMembers();
        } catch (err: any) {
            alert(`Failed to remove: ${err.message}`);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await fetchApi(`/workspaces/${workspaceId}/members/${userId}`, {
                method: "PUT",
                body: JSON.stringify({ role: newRole })
            });
            await fetchMembers();
        } catch (err: any) {
            alert(`Failed to update role: ${err.message}`);
            // Reset dropdown by re-fetching
            await fetchMembers();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/50">
                        <div>
                            <h2 className="text-lg font-bold">Workspace Settings</h2>
                            <p className="text-xs text-muted-foreground">{workspaceName}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        
                        {/* Invite Section (Only visible to Owners) */}
                        {currentUserRole === 'owner' && (
                            <div className="mb-8 p-4 bg-secondary/20 border border-border/50 rounded-xl">
                                <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                                    <Users className="w-4 h-4 text-primary" /> Invite Members
                                </h3>
                                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                    <div className="relative flex-1 w-full">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input 
                                            type="text" 
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            placeholder="user@example.com" 
                                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <select 
                                        value={inviteRole}
                                        onChange={e => setInviteRole(e.target.value)}
                                        className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button 
                                        type="submit" 
                                        disabled={inviteLoading || !inviteEmail.trim()}
                                        className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Send Invite
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Members List */}
                        <div>
                            <h3 className="text-sm font-bold mb-4">Current Members ({members.length})</h3>
                            
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : error ? (
                                <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                                    {error}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between p-3 border border-border/60 bg-secondary/30 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {member.role === 'owner' ? '👑' : member.user_id.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-mono text-xs font-semibold text-foreground">{member.email || member.user_id}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{member.role}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Only Owner can change roles or remove members */}
                                            {currentUserRole === 'owner' && member.role !== 'owner' && (
                                                <div className="flex items-center gap-2">
                                                    <select 
                                                        value={member.role}
                                                        onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                                                        className="px-2 py-1 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                    >
                                                        <option value="viewer">Viewer</option>
                                                        <option value="editor">Editor</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <button 
                                                        onClick={() => handleRemove(member.user_id)}
                                                        className="p-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                                        title="Remove Member"
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
