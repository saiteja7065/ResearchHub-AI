import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, BookOpen, Loader2, ChevronDown, Mic, MicOff } from "lucide-react";
import { fetchApi, API_BASE_URL } from "../lib/api";
import { useAuth } from "../store/AuthContext";
import { supabase } from "../lib/supabase";
import InsightsPanel from "../components/InsightsPanel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
interface Message {
    role: "user" | "assistant";
    content: string;
    contextUsed?: number;
}

interface Workspace {
    id: string;
    name: string;
}

interface Paper {
    id: string;
    title: string;
}

export default function AIAgentsView() {
    const { user } = useAuth();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);

    // Dropdown states
    const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

    // Paper selector states
    const [papers, setPapers] = useState<Paper[]>([]);
    const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
    const [showPaperDropdown, setShowPaperDropdown] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Try to get the SpeechRecognition constructor
        const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognitionConstructor) {
            try {
                const recognition = new SpeechRecognitionConstructor();
                recognition.continuous = true;
                recognition.interimResults = true;
                // Set language explicitly just in case
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    // Append to existing input, or replace if we are starting fresh
                    setInput((prevInput) => {
                        // If we just started listening, maybe overwrite. Otherwise, concatenate safely.
                        // But for simplicity of dictation, we just take the current full sentence.
                        return finalTranscript + interimTranscript;
                    });

                    if (textareaRef.current) {
                        textareaRef.current.style.height = "auto";
                        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error);
                    if (event.error !== 'no-speech') {
                        setIsListening(false);
                    }
                };

                recognition.onend = () => {
                    // It naturally ends sometimes, turn off UI state
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            } catch (err) {
                console.error("Failed to initialize Speech Recognition:", err);
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (recognitionRef.current) {
                setInput("");
                recognitionRef.current.start();
                setIsListening(true);
            } else {
                alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
            }
        }
    };

    useEffect(() => {
        if (user) fetchWorkspaces();
    }, [user]);

    useEffect(() => {
        if (selectedWorkspace) {
            fetchPapers(selectedWorkspace.id);
            setSelectedPaper(null); // Reset when changing workspace
        } else {
            setPapers([]);
        }
    }, [selectedWorkspace]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchWorkspaces = async () => {
        const { data } = await supabase.from("workspaces").select("id, name");
        if (data) {
            setWorkspaces(data);
            if (data.length > 0) setSelectedWorkspace(data[0]);
        }
    };

    const fetchPapers = async (workspaceId: string) => {
        const { data } = await supabase.from("papers")
            .select("id, title")
            .eq("workspace_id", workspaceId);
        if (data) setPapers(data);
    };

    const sendMessage = async () => {
        if (!input.trim() || !selectedWorkspace || isLoading) return;

        const userMessage: Message = { role: "user", content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        if (textareaRef.current) textareaRef.current.style.height = "auto";

        try {
            const bodyPayload: any = {
                workspace_id: selectedWorkspace.id,
                message: userMessage.content,
                history: messages.map((m) => ({ role: m.role, content: m.content })),
            };
            if (selectedPaper) {
                bodyPayload.paper_id = selectedPaper.id;
            }

            // Get auth token for the streaming request
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${API_BASE_URL}/chat/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(bodyPayload),
            });

            if (!response.ok || !response.body) {
                throw new Error("Stream failed");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = "";
            let contextUsed = 0;

            const streamingMessages = [...newMessages, { role: "assistant" as const, content: "", contextUsed: 0 }];
            setMessages(streamingMessages);
            setIsLoading(false);
            setIsStreaming(true);

            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.context_used !== undefined) {
                            contextUsed = data.context_used;
                        } else if (data.token) {
                            assistantContent += data.token;
                            setMessages([
                                ...newMessages,
                                { role: "assistant", content: assistantContent, contextUsed },
                            ]);
                        } else if (data.done) {
                            // Final update with complete content
                            setMessages([
                                ...newMessages,
                                { role: "assistant", content: assistantContent, contextUsed },
                            ]);
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }
        } catch {
            setMessages([
                ...newMessages,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please check your Groq API key in the backend `.env` file.",
                },
            ]);
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
    };

    return (
        <div className="flex w-full h-full bg-[#0a0a0f] overflow-hidden">
            {/* Left Column: Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/30">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-semibold text-sm">AI Research Agent</h1>
                            <p className="text-white/40 text-xs">Powered by Llama 3 · RAG-enabled</p>
                        </div>
                    </div>

                    {/* Workspace Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm text-white/70"
                        >
                            <BookOpen size={13} className="text-purple-400" />
                            <span>{selectedWorkspace?.name || "Select Workspace"}</span>
                            <ChevronDown size={13} className={`transition-transform ${showWorkspaceDropdown ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {showWorkspaceDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute right-0 top-full mt-2 w-56 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() => {
                                                setSelectedWorkspace(ws);
                                                setShowWorkspaceDropdown(false);
                                                setMessages([]);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${selectedWorkspace?.id === ws.id ? "text-purple-400" : "text-white/70"
                                                }`}
                                        >
                                            {ws.name}
                                        </button>
                                    ))}
                                    {workspaces.length === 0 && (
                                        <p className="px-4 py-3 text-sm text-white/40">No workspaces yet</p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-full text-center gap-4 py-16"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-700/20 border border-purple-500/20 flex items-center justify-center">
                                <Sparkles size={28} className="text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-lg mb-1">Ask About Your Research</h2>
                                <p className="text-white/40 text-sm max-w-sm">
                                    Upload documents to your workspace, then ask me anything about them. I'll find the most relevant information.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                                {[
                                    "Summarize the key findings",
                                    "What are the main methodologies used?",
                                    "Identify any research gaps mentioned",
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setInput(suggestion)}
                                        className="text-left px-4 py-2.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/8 text-white/50 hover:text-white/80 text-sm transition-all"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex-shrink-0 flex items-center justify-center mt-1">
                                        <Bot size={14} className="text-white" />
                                    </div>
                                )}

                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                        ? "bg-violet-600 text-white rounded-tr-sm"
                                        : "bg-white/5 border border-white/8 text-white/85 rounded-tl-sm"
                                        }`}
                                >
                                    {msg.role === "assistant" ? (
                                        <div className="prose-chat">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                            {isStreaming && i === messages.length - 1 && (
                                                <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />
                                            )}
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                    {msg.role === "assistant" && msg.contextUsed !== undefined && msg.contextUsed > 0 && (
                                        <p className="text-purple-400/60 text-xs mt-2 flex items-center gap-1">
                                            <BookOpen size={10} />
                                            Based on {msg.contextUsed} document chunk{msg.contextUsed !== 1 ? "s" : ""}
                                            {selectedPaper ? ` from "${selectedPaper.title}"` : ""}
                                        </p>
                                    )}
                                </div>

                                {msg.role === "user" && (
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex-shrink-0 flex items-center justify-center mt-1">
                                        <User size={14} className="text-white/70" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex-shrink-0 flex items-center justify-center">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex items-center gap-2 text-white/40">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-6 py-4 border-t border-white/5 relative">

                    {/* Paper Context Selector */}
                    {selectedWorkspace && papers.length > 0 && (
                        <div className="absolute -top-12 left-6 z-10">
                            <button
                                onClick={() => setShowPaperDropdown(!showPaperDropdown)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedPaper
                                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white/50"
                                    }`}
                            >
                                <BookOpen size={12} />
                                <span className="max-w-[200px] truncate">
                                    {selectedPaper ? selectedPaper.title : "All Workspace Documents"}
                                </span>
                                <ChevronDown size={12} className={`transition-transform ${showPaperDropdown ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                                {showPaperDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute left-0 bottom-full mb-2 w-72 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                                    >
                                        <button
                                            onClick={() => {
                                                setSelectedPaper(null);
                                                setShowPaperDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${!selectedPaper ? "text-purple-400" : "text-white/70"}`}
                                        >
                                            All Workspace Documents
                                        </button>
                                        <div className="h-px bg-white/5 my-1" />
                                        <div className="max-h-60 overflow-y-auto">
                                            {papers.map((paper) => (
                                                <button
                                                    key={paper.id}
                                                    onClick={() => {
                                                        setSelectedPaper(paper);
                                                        setShowPaperDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors truncate ${selectedPaper?.id === paper.id ? "text-purple-400" : "text-white/70"}`}
                                                    title={paper.title}
                                                >
                                                    {paper.title}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Chat Input Box */}
                    <div className="flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-purple-500/50 transition-colors">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedWorkspace ? (isListening ? "Listening..." : `Ask about "${selectedPaper ? selectedPaper.title : selectedWorkspace.name}"…`) : "Select a workspace first"}
                            disabled={!selectedWorkspace}
                            rows={1}
                            className="flex-1 bg-transparent text-white placeholder-white/25 text-sm resize-none outline-none max-h-36 disabled:opacity-40"
                        />
                        <button
                            onClick={toggleListening}
                            disabled={!selectedWorkspace || isLoading}
                            title="Voice Dictation"
                            className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isListening
                                ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-rose-500/30"
                                : "bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                                }`}
                        >
                            {isListening ? <MicOff size={14} className={isListening ? "animate-pulse" : ""} /> : <Mic size={14} />}
                        </button>
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || !selectedWorkspace || isLoading}
                            className="w-8 h-8 flex-shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95"
                        >
                            {isLoading ? (
                                <Loader2 size={14} className="text-white animate-spin" />
                            ) : (
                                <Send size={14} className="text-white" />
                            )}
                        </button>
                    </div>
                    <p className="text-white/20 text-xs text-center mt-2">
                        Press Enter to send · Shift+Enter for new line
                    </p>
                </div>
            </div>

            {/* Right Column: Insights Panel */}
            <div className="w-80 md:w-96 flex-shrink-0 hidden lg:block">
                <InsightsPanel workspaceId={selectedWorkspace?.id || null} />
            </div>
        </div>
    );
}
