import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Camera, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { supabase } from "../lib/supabase";

export default function SettingsView() {
    const { user } = useAuth();

    // Profile state
    const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || user?.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Feedback
    const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploadingAvatar(true);
        try {
            const fileExt = file.name.split(".").pop();
            const filePath = `avatars/${user.id}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            // Update user metadata with avatar URL
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;
            setAvatarUrl(publicUrl);
            setProfileMsg({ type: "success", text: "Profile photo updated!" });
        } catch (err: any) {
            console.error("Avatar upload error:", err);
            setProfileMsg({ type: "error", text: err.message || "Failed to upload photo" });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        setProfileMsg(null);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { display_name: displayName, full_name: displayName }
            });

            if (error) throw error;
            setProfileMsg({ type: "success", text: "Profile updated successfully!" });
        } catch (err: any) {
            setProfileMsg({ type: "error", text: err.message || "Failed to update profile" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordMsg(null);

        if (newPassword.length < 6) {
            setPasswordMsg({ type: "error", text: "Password must be at least 6 characters" });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: "error", text: "Passwords do not match" });
            return;
        }

        setIsChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            setNewPassword("");
            setConfirmPassword("");
            setPasswordMsg({ type: "success", text: "Password changed successfully!" });
        } catch (err: any) {
            setPasswordMsg({ type: "error", text: err.message || "Failed to change password" });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const createdAt = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "Unknown";

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

                {/* Page Header */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your profile and account preferences.</p>
                </motion.div>

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-xl p-6 space-y-6"
                >
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Profile
                    </h2>

                    {/* Avatar */}
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/30">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-primary uppercase">
                                        {displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-all"
                            >
                                {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{displayName || "No name set"}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ""}
                            readOnly
                            className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground text-sm cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground">Member since {createdAt}</p>
                    </div>

                    {/* Save Button + Feedback */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSavingProfile}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                        {profileMsg && (
                            <span className={`text-sm flex items-center gap-1 ${profileMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                                {profileMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {profileMsg.text}
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* Password Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-xl p-6 space-y-5"
                >
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        Change Password
                    </h2>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword || !newPassword}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            Update Password
                        </button>
                        {passwordMsg && (
                            <span className={`text-sm flex items-center gap-1 ${passwordMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                                {passwordMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {passwordMsg.text}
                            </span>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
