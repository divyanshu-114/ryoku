"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Bot,
    Loader2,
    ThumbsUp,
    ThumbsDown,
    ArrowDown,
    RefreshCcw,
    Zap,
    Heart,
} from "lucide-react";

export default function ChatPage() {
    const { slug } = useParams<{ slug: string }>();
    const [conversationId] = useState(() => 
        typeof crypto !== "undefined" && crypto.randomUUID 
            ? crypto.randomUUID() 
            : "00000000-0000-0000-0000-000000000000"
    );

    // Setup useChat to hit our specific route
    const { messages, status, error, regenerate, sendMessage } = useChat({
        id: conversationId,
        // @ts-expect-error api is incorrectly missing from UseChatOptions type in this version
        api: `/api/chat/${slug}`,
        body: { conversationId, slug },
    });

    // Fallback to reload if regenerate is not available (in some beta versions)
    const reloadChat = regenerate || (() => { });

    const isLoading = status === "submitted" || status === "streaming";
    const [input, setInput] = useState("");
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);
    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage({ text: input });
        setInput("");
    };

    const [accentColor] = useState("var(--accent)");
    const [welcomeMessage] = useState("Hi! How can I help you?");
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [rated, setRated] = useState<"up" | "down" | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const businessName = slug?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Support";

    // Fetch business info
    useEffect(() => {
        async function fetchBusiness() {
            try {
                await fetch(`/api/chat/${slug}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messages: [{ role: "user", content: "__init__" }] }),
                });
            } catch {
                // Ignore
            }
        }
        fetchBusiness();
    }, [slug]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Scroll detection
    useEffect(() => {
        const el = scrollAreaRef.current;
        if (!el) return;
        const handleScroll = () => {
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            setShowScrollBtn(!isNearBottom);
        };
        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <main className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
            {/* Header */}
            <header
                className="flex items-center gap-3 px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}
            >
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: accentColor }}
                >
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{businessName}</p>
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }}
                        />
                        <span className="text-[11px] text-[var(--success)]">Online</span>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative">
                {/* Welcome */}
                {messages.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Welcome bubble */}
                        <div className="flex gap-3 max-w-lg">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1"
                                style={{ background: accentColor }}
                            >
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div
                                className="px-4 py-3 rounded-2xl rounded-tl-md text-sm"
                                style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border-subtle)",
                                    color: "var(--text-primary)",
                                }}
                            >
                                {welcomeMessage}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Message List */}
                {messages.map((msg, i) => (
                    <motion.div
                        key={msg.id || i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {msg.role === "assistant" && (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1"
                                style={{ background: accentColor }}
                            >
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                ? "rounded-2xl rounded-br-md text-white"
                                : "rounded-2xl rounded-tl-md"
                                }`}
                            style={
                                msg.role === "user"
                                    ? { background: accentColor }
                                    : {
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border-subtle)",
                                        color: "var(--text-primary)",
                                    }
                            }
                        >
                            {/* Render text content */}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {msg.parts?.map((part: any, j: number) => {
                                if (part.type === "text") {
                                    return <p key={j} className="whitespace-pre-wrap">{part.text}</p>;
                                }
                                if (part.type === "tool-invocation" || part.type === "tool-call") {
                                    return (
                                        <div key={j} className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ background: "var(--accent-glow)", border: "1px solid rgba(234,88,12,0.15)" }}>
                                            <Zap className="w-3 h-3 text-[var(--accent-light)]" />
                                            <span className="text-[var(--accent-light)] font-medium">{part.toolInvocation?.toolName || part.toolName || "Tool Call"}</span>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </motion.div>
                ))}

                {/* Loading */}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: accentColor }}>
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-md" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <span className="text-[var(--danger)]">Something went wrong.</span>
                        <button onClick={() => reloadChat()} className="text-[var(--accent-light)] font-medium hover:underline flex items-center gap-1 cursor-pointer">
                            <RefreshCcw className="w-3 h-3" /> Retry
                        </button>
                    </div>
                )}

                {/* CSAT */}
                {messages.length > 4 && !rated && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 pl-11"
                    >
                        <span className="text-xs text-[var(--text-muted)]">Was this helpful?</span>
                        <button onClick={() => setRated("up")} className="p-1.5 rounded-lg hover:bg-[var(--accent-glow)] transition cursor-pointer">
                            <ThumbsUp className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--success)]" />
                        </button>
                        <button onClick={() => setRated("down")} className="p-1.5 rounded-lg hover:bg-[var(--accent-glow)] transition cursor-pointer">
                            <ThumbsDown className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--danger)]" />
                        </button>
                    </motion.div>
                )}
                {rated && (
                    <p className="text-xs text-[var(--text-muted)] pl-11 flex items-center gap-2">
                        <Heart className="w-3 h-3 text-[var(--accent)]" />
                        Thank you for your feedback!
                    </p>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom */}
            <AnimatePresence>
                {showScrollBtn && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-24 right-6 w-10 h-10 rounded-full flex items-center justify-center z-10 cursor-pointer"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-md)" }}
                    >
                        <ArrowDown className="w-4 h-4 text-[var(--text-secondary)]" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Input */}
            <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
                <form
                    id="chat-form"
                    onSubmit={handleSubmit}
                    className="flex items-center gap-3 max-w-3xl mx-auto"
                >
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        className="input-field flex-1 py-3"
                        disabled={isLoading}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                        style={{ background: accentColor }}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 text-white" />
                        )}
                    </button>
                </form>
                <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
                    Powered by <span className="font-semibold text-[var(--accent-light)]">Ryoku</span>
                </p>
            </div>
        </main>
    );
}
