import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, X } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

export default function UpgradeModal({ isOpen, onClose, title = "Upgrade to Pro", message = "You've reached the limits of the freemium plan. Upgrade to unlock advanced capabilities." }: UpgradeModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                    className="bg-card w-full max-w-lg rounded-2xl border border-primary/20 shadow-2xl overflow-hidden relative"
                >
                    <button 
                        onClick={onClose}
                        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10 p-1 rounded-full hover:bg-secondary"
                    >
                        <X size={20} />
                    </button>

                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center border-b border-border/50">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 shadow-inner">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 tracking-tight text-foreground">{title}</h2>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="p-8 bg-secondary/10">
                        <h3 className="text-sm font-semibold mb-4 tracking-wide text-foreground uppercase">Pro Plan Includes:</h3>
                        <ul className="space-y-4 mb-8">
                            {[
                                "Unlimited Academic Paper Uploads",
                                "Unlimited AI Vector Semantic Searches",
                                "Export Intelligence to PowerPoint (.pptx)",
                                "Export Templates to LaTeX (.tex)",
                                "Priority Access to Llama-3-70B Logic"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-foreground/90">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button 
                            className="w-full py-4 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-[0_0_20px_rgba(109,40,217,0.3)] hover:shadow-[0_0_25px_rgba(109,40,217,0.5)] transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                            onClick={() => {
                                alert("Stripe Checkout Session Initiated (Simulation)");
                                onClose();
                            }}
                        >
                            <Sparkles className="w-4 h-4" />
                            Upgrade Now for $15/mo
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
