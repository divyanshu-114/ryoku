"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
    Heart,
    Headphones,
    X,
    CheckCircle2,
    Shield,
    Clock,
} from "lucide-react";
import { getPusherClient, PUSHER_EVENTS } from "@/lib/pusher-client";

export default function ChatPage() {
    const { slug } = useParams<{ slug: string }>();
    const [conversationId, setConversationId] = useState("00000000-0000-0000-0000-000000000000");

    useEffect(() => {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            setConversationId(crypto.randomUUID());
        }
    }, []);

    const apiTarget = slug ? `/api/chat/${slug}` : "/api/chat/athena";
    console.log(`[ChatPage] useChat initializing with api: ${apiTarget}`);

    // Setup useChat to hit our specific route
    const { messages, status, error, regenerate, sendMessage } = useChat({
        id: conversationId,
        // @ts-expect-error api is incorrectly missing from UseChatOptions type in this version
        api: apiTarget,
        body: { conversationId, slug },
    });

    // Fallback to reload if regenerate is not available
    const reloadChat = regenerate || (() => { });
    const isLoading = status === "submitted" || status === "streaming";
    const [localInput, setLocalInput] = useState("");

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalInput(val);

        // Send typing event every 2 seconds
        if (val.trim() && Date.now() - lastTypingSentRef.current > 2000) {
            lastTypingSentRef.current = Date.now();
            fetch("/api/chat/typing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, role: "user" }),
            }).catch(() => {});
        }
    };
    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!localInput.trim() || isLoading) return;
        sendMessage({ text: localInput });
        setLocalInput("");
    };

    const [accentColor] = useState("var(--accent)");
    const [welcomeMessage] = useState("Hi! How can I help you?");
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [rated, setRated] = useState<"up" | "down" | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Agent takeover and real-time chat state
    const [agentActive, setAgentActive] = useState(false);
    const [realTimeMessages, setRealTimeMessages] = useState<{ id: string; role: string; content: string; createdAt: string; sender?: string }[]>([]);

    type ChatMessage = {
        id: string;
        role: "user" | "assistant" | "agent" | "system";
        content: string;
        createdAt: string;
        sender?: string;
    };
    type SdkMessagePart = { type?: string; text?: string };
    type SdkMessage = {
        id?: string;
        role?: string;
        content?: string | SdkMessagePart[];
        parts?: SdkMessagePart[];
        createdAt?: Date | string;
        sender?: string;
    };

    // Track stable timestamps for messages that lack them (e.g. optimistic SDK messages)
    const messageTimestamps = useRef<Record<string, string>>({});

    const normalizeSdkMessage = useCallback((msg: SdkMessage, index: number): ChatMessage => {
        const content = typeof msg.content === "string"
            ? msg.content
            : Array.isArray(msg.content)
                ? msg.content.filter((part: { type?: string }) => part?.type === "text").map((part: { text?: string }) => part.text || "").join("")
                : Array.isArray(msg.parts)
                    ? msg.parts.map((part: { text?: string }) => part.text || "").join("")
                    : "";

        const id = msg.id ?? `sdk-${index}-${msg.role}-${Math.random().toString(36).slice(2, 8)}`;
        
        // Ensure stable createdAt
        if (!messageTimestamps.current[id]) {
            const rawDate = msg.createdAt;
            messageTimestamps.current[id] = rawDate instanceof Date 
                ? rawDate.toISOString() 
                : typeof rawDate === "string" 
                    ? rawDate 
                    : new Date(Date.now() + index).toISOString();
        }

        return {
            id,
            role: msg.role === "agent" ? "agent" : msg.role === "system" ? "system" : msg.role === "user" ? "user" : "assistant",
            content: content.trim(),
            createdAt: messageTimestamps.current[id],
            sender: msg.sender,
        };
    }, []);

    const combinedMessages = useMemo(() => {
        const normalizedHistory = messages.map(normalizeSdkMessage);
        
        // Deduplicate and filter
        const sdkIds = new Set(normalizedHistory.map(m => m.id));
        const sdkContentKeys = new Set(normalizedHistory.map(m => `${m.role}::${m.content.trim()}`));

        const deduplicatedRealTime = realTimeMessages.filter((m) => {
            // Filter out if already in SDK history by ID or by role/content match
            if (sdkIds.has(m.id)) return false;
            if (sdkContentKeys.has(`${m.role}::${m.content.trim()}`)) return false;
            return true;
        });

        const allMessages = [...normalizedHistory, ...deduplicatedRealTime]
            .filter(msg => msg.content.trim().length > 0);

        // Final sort by timestamp, fallback to ID
        return allMessages.sort((a, b) => {
            const aTime = Date.parse(a.createdAt) || 0;
            const bTime = Date.parse(b.createdAt) || 0;
            if (aTime === bTime) return a.id.localeCompare(b.id);
            return aTime - bTime;
        });
    }, [messages, realTimeMessages, normalizeSdkMessage]);

    // Contact form state
    const [contactSubmitted, setContactSubmitted] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [emailInput, setEmailInput] = useState("");
    const [phoneInput, setPhoneInput] = useState("");
    const [contactLoading, setContactLoading] = useState(false);
    const [contactError, setContactError] = useState("");
    const [agentOnline, setAgentOnline] = useState(true);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [offlineForm, setOfflineForm] = useState({ name: "", email: "", query: "" });
    const [offlineLoading, setOfflineLoading] = useState(false);
    const [offlineError, setOfflineError] = useState("");
    const [agentTyping, setAgentTyping] = useState(false);
    const agentTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypingSentRef = useRef<number>(0);

    // Check agent status
    useEffect(() => {
        if (!slug) return;
        fetch(`/api/chat/${slug}`).then(r => r.json()).then(d => setAgentOnline(d.online)).catch(() => {});
    }, [slug]);

    // Pusher: listen for agent messages and conversation updates
    useEffect(() => {
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`private-conversation-${conversationId}`);

        channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: { id?: number | string; role: string; content: string; sender?: string }) => {
            if (data.role === "agent") {
                setAgentActive(true);
                setRealTimeMessages(prev => {
                    const msgId = data.id ? `${data.id}` : `agent-${Date.now()}`;
                    // Avoid duplicate agent messages
                    if (prev.some(m => m.id === msgId)) return prev;
                    return [...prev, {
                        id: msgId,
                        role: "agent",
                        content: data.content,
                        createdAt: new Date().toISOString(),
                        sender: data.sender,
                    }];
                });
            } else if (data.role === "user") {
                // After agent takeover, useChat returns empty stream so user messages
                // must be captured via Pusher to remain visible in the chat
                setRealTimeMessages(prev => {
                    const msgId = `pusher-user-${data.id || Date.now()}`;
                    if (prev.some(m => m.id === msgId)) return prev;
                    return [...prev, {
                        id: msgId,
                        role: "user",
                        content: data.content,
                        createdAt: new Date().toISOString(),
                    }];
                });
            } else if (data.role === "assistant") {
                // Handle instant bot replies (like escalation wait message)
                setRealTimeMessages(prev => {
                    const msgId = data.id ? `${data.id}` : `assistant-${Date.now()}`;
                    if (prev.some(m => m.id === msgId)) return prev;
                    return [...prev, {
                        id: msgId,
                        role: "assistant",
                        content: data.content,
                        createdAt: new Date().toISOString(),
                    }];
                });
            }
        });

        channel.bind(PUSHER_EVENTS.CONVERSATION_UPDATED, (data: { status: string }) => {
            if (data.status === "resolved") {
                setAgentActive(false);
                setRealTimeMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    role: "system",
                    content: "This conversation has been resolved. Thank you!",
                    createdAt: new Date().toISOString(),
                }]);
            } else if (data.status === "active") {
                setAgentActive(true);
            }
        });
        
        channel.bind(PUSHER_EVENTS.TYPING, (data?: { role: string }) => {
            if (data?.role === "agent" || data?.role === "assistant") {
                setAgentTyping(true);
                if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
                agentTypingTimeoutRef.current = setTimeout(() => setAgentTyping(false), 3000);
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`private-conversation-${conversationId}`);
        };
    }, [conversationId]);

    // Delete anonymous chat on session close
    useEffect(() => {
        if (!slug || !conversationId) return;
        const handleSessionClose = () => {
            if (!contactSubmitted) {
                fetch(`/api/chat/${slug}?conversationId=${conversationId}`, {
                    method: "DELETE",
                    keepalive: true,
                }).catch(() => {});
            }
        };

        window.addEventListener("pagehide", handleSessionClose);
        window.addEventListener("beforeunload", handleSessionClose);
        
        return () => {
            window.removeEventListener("pagehide", handleSessionClose);
            window.removeEventListener("beforeunload", handleSessionClose);
        };
    }, [conversationId, slug, contactSubmitted]);

    const handleEscalate = async (email: string, phone: string) => {
        if (!slug) return;
        try {
            await fetch("/api/chat/escalate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, slug, reason: "User explicitly requested human agent", email, phone }),
            });
            // Use sendMessage to add a message to the chat
            sendMessage({ 
                text: "I would like to speak to a human agent, please." 
            });
        } catch (err) {
            console.error("Escalation failed", err);
        }
    };

    const handleTalkToAgentClick = async () => {
        // Re-check status just in case
        try {
            const res = await fetch(`/api/chat/${slug}`);
            const data = await res.json();
            setAgentOnline(data.online);
            
            if (!data.online) {
                setShowOfflineModal(true);
                return;
            }

            if (contactSubmitted) {
                handleEscalate(emailInput, phoneInput);
            } else {
                setShowContactModal(true);
            }
        } catch {
            setShowContactModal(true);
        }
    };

    const handleSubmitContact = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!emailInput.trim() || !emailInput.includes("@")) {
            setContactError("Please enter a valid email address.");
            return;
        }
        if (!phoneInput.trim()) {
            setContactError("Please enter a valid phone number.");
            return;
        }
        setContactLoading(true);
        setContactError("");
        try {
            await handleEscalate(emailInput, phoneInput);
            setContactSubmitted(true);
            setShowContactModal(false);
        } catch (err) {
            setContactError(err instanceof Error ? err.message : "Failed to submit request.");
        } finally {
            setContactLoading(false);
        }
    };

    const handleSubmitOfflineQuery = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!offlineForm.email || !offlineForm.query) return;
        setOfflineLoading(true);
        setOfflineError("");
        try {
            const res = await fetch("/api/chat/offline-query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...offlineForm, slug }),
            });
            if (!res.ok) throw new Error("Failed to send");
            setContactSubmitted(true);
            setShowOfflineModal(false);
            // System message in chat
            setRealTimeMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                role: "system",
                content: "Your query has been sent to our team. We'll get back to you via email soon!",
                createdAt: new Date().toISOString(),
            }]);
        } catch {
            setOfflineError("Failed to send message. Please try again.");
        } finally {
            setOfflineLoading(false);
        }
    };

    const businessName = slug?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Support";

    // Fetch business info
    useEffect(() => {
        if (!slug) return;
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
    }, [combinedMessages]);

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
        <main key={slug || "athena"} className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
            {/* Header */}
            <header
                className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5 shrink-0 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300"
                style={{ 
                    borderBottom: "1px solid var(--border-subtle)", 
                    background: "rgba(255, 255, 255, 0.7)",
                    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.03)"
                }}
            >
                <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 transition-transform hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, var(--accent-light))` }}
                >
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{businessName}</p>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ background: "var(--success)", boxShadow: "0 0 8px var(--success)" }}
                        />
                        <span className="text-[11px] font-medium text-[var(--success)] uppercase tracking-wider">Live & Active</span>
                    </div>
                </div>
                {agentActive && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <Shield className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Verified Agent</span>
                    </div>
                )}
            </header>

            {/* Agent Active Banner */}
            {agentActive && (
                <div className="px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium"
                    style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))", borderBottom: "1px solid rgba(16,185,129,0.2)", color: "rgb(52,211,153)" }}>
                    <Shield className="w-3.5 h-3.5" />
                    You&apos;re now chatting with a live agent
                </div>
            )}

            {/* Messages */}
            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative">
                {/* Welcome */}
                {combinedMessages.length === 0 && (
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
                {combinedMessages.map((msg, i) => (
                    <motion.div
                        key={msg.id || i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}
                    >
                        {msg.role !== "user" && (
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${msg.role === "agent" ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md" : "bg-[var(--bg-card)]"}`}
                            >
                                {msg.role === "agent" ? <Shield className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[var(--text-primary)]" />}
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                ? "rounded-2xl rounded-br-md text-white"
                                : msg.role === "system"
                                    ? "rounded-full text-center"
                                    : "rounded-2xl rounded-tl-md"
                                }}`}
                            style={
                                msg.role === "user"
                                    ? { background: `linear-gradient(135deg, ${accentColor}, var(--accent-light))`, boxShadow: "0 4px 15px -3px rgba(234, 88, 12, 0.2)" }
                                    : msg.role === "system"
                                        ? { background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "11px" }
                                        : { background: "white", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", boxShadow: "0 4px 20px -8px rgba(0,0,0,0.12)" }
                            }
                        >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.role === "agent" && (
                                <div className="flex items-center justify-between mt-2 gap-4 text-[9px] text-[var(--text-muted)]">
                                    <span className="font-bold text-emerald-500 uppercase tracking-widest">Official Agent</span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {/* Agent Typing Indicator (Real-time) */}
                <AnimatePresence>
                    {(isLoading || agentTyping) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-3"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ background: agentTyping ? "#10b981" : accentColor }}>
                                {agentTyping ? <Shield className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                            </div>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm">
                                <div className="flex gap-1.5 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    {agentTyping && <span className="text-[10px] font-bold text-emerald-500 uppercase ml-2 tracking-widest">Agent Typing</span>}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                {combinedMessages.length > 4 && !rated && (
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

            {/* Input & Suggested Actions */}
            <div className="px-4 py-4 shrink-0 space-y-3" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
                {/* Amazon-style quick actions */}
                {!agentActive && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start max-w-3xl mx-auto px-1"
                    >
                        <button
                            onClick={handleTalkToAgentClick}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border shadow-sm hover:shadow-md cursor-pointer group active:scale-95"
                            style={{ 
                                borderColor: "var(--border-subtle)", 
                                color: "var(--text-secondary)",
                                background: "white"
                            }}
                        >
                            <Headphones className="w-3.5 h-3.5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                            <span>Speak to a human</span>
                        </button>
                    </motion.div>
                )}

                <form
                    id="chat-form"
                    onSubmit={handleSubmit}
                    className="flex items-center gap-3 max-w-3xl mx-auto"
                >
                    <input
                        value={localInput}
                        onChange={onInputChange}
                        placeholder="Type a message..."
                        className="input-field flex-1 py-3"
                        disabled={isLoading}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !localInput.trim()}
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

            {/* Contact Details Modal */}
            <AnimatePresence>
                {showContactModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm rounded-2xl p-6 relative"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xl)" }}
                        >
                            <button
                                onClick={() => setShowContactModal(false)}
                                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--accent-glow)" }}>
                                    <Headphones className="w-6 h-6 text-[var(--accent)]" />
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Talk to an Agent</h3>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Please provide your contact details so we can reach you if disconnected.
                                </p>
                            </div>

                            {contactError && (
                                <div className="mb-4 p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-500 text-center">
                                    {contactError}
                                </div>
                            )}

                            <form onSubmit={handleSubmitContact} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        className="input-field w-full"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        disabled={contactLoading}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        className="input-field w-full"
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(e.target.value)}
                                        disabled={contactLoading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={contactLoading || !emailInput || !phoneInput}
                                    className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
                                    style={{ background: accentColor, marginTop: "24px" }}
                                >
                                    {contactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Offline Query Modal */}
            <AnimatePresence>
                {showOfflineModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm rounded-2xl p-6 relative"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xl)" }}
                        >
                            <button onClick={() => setShowOfflineModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X className="w-4 h-4" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                                    <Clock className="w-6 h-6 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">No live agents available</h3>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Our team is currently offline. Leave a message and we&apos;ll get back to you via email.
                                </p>
                            </div>

                            {offlineError && <div className="mb-4 p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-500 text-center">{offlineError}</div>}

                            <form onSubmit={handleSubmitOfflineQuery} className="space-y-4">
                                <input placeholder="Your Name" className="input-field w-full" value={offlineForm.name} onChange={e => setOfflineForm(p => ({ ...p, name: e.target.value }))} />
                                <input type="email" placeholder="Email Address" className="input-field w-full" value={offlineForm.email} onChange={e => setOfflineForm(p => ({ ...p, email: e.target.value }))} required />
                                <textarea placeholder="How can we help?" className="input-field w-full min-h-[100px] py-3 resize-none" value={offlineForm.query} onChange={e => setOfflineForm(p => ({ ...p, query: e.target.value }))} required />
                                <button type="submit" disabled={offlineLoading || !offlineForm.email || !offlineForm.query} className="btn-primary w-full py-2.5" style={{ background: accentColor }}>
                                    {offlineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Message"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}
