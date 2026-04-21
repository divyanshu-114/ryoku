"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    Send,
    User,
    Bot,
    Circle,
    Clock,
    AlertTriangle,
    Zap,
    MessageSquare,
    ChevronRight,
} from "lucide-react";
import { getPusherClient, PUSHER_EVENTS } from "@/lib/pusher";

interface AgentProfile {
    id: string;
    businessId: string;
    displayName: string;
    status: string;
}

interface QueueConvo {
    id: string;
    customerName: string | null;
    customerEmail: string | null;
    status: string | null;
    assignedAgent: string | null;
    messageCount: number;
    lastMessage: { role: string; content: string; createdAt: string } | null;
    updatedAt: string;
}

interface ChatMsg {
    id: number;
    role: string;
    content: string;
    sentiment: string | null;
    createdAt: string;
}

interface CannedResp {
    id: string;
    title: string;
    content: string;
    shortcut: string | null;
}

export default function AgentDashboardPage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState<AgentProfile | null>(null);
    const [queue, setQueue] = useState<QueueConvo[]>([]);
    const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [cannedResponses, setCannedResponses] = useState<CannedResp[]>([]);
    const [agentStatus, setAgentStatus] = useState("offline");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (authStatus === "unauthenticated") router.push("/auth/login");
    }, [authStatus, router]);

    // Fetch or register agent
    useEffect(() => {
        async function initAgent() {
            try {
                const res = await fetch("/api/agent");
                const data = await res.json();
                if (data.agent) {
                    setAgent(data.agent);
                    setAgentStatus(data.agent.status);
                } else {
                    // Auto-register as agent
                    const regRes = await fetch("/api/agent", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({}),
                    });
                    const regData = await regRes.json();
                    if (regData.agent) {
                        setAgent(regData.agent);
                        setAgentStatus(regData.agent.status);
                    }
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }
        if (authStatus === "authenticated") initAgent();
    }, [authStatus]);

    // Fetch conversation queue
    const fetchQueue = useCallback(async () => {
        try {
            const res = await fetch("/api/agent/conversations?view=all");
            const data = await res.json();
            setQueue(data.conversations || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (agent) {
            fetchQueue();
            const interval = setInterval(fetchQueue, 30000); // Reduce polling to 30s since we have Pusher

            const pusher = getPusherClient();
            const channel = pusher.subscribe(`private-business-${agent.businessId}`);

            channel.bind(PUSHER_EVENTS.NEW_CONVERSATION, (data: any) => {
                setQueue((prev) => {
                    // Check if already in queue
                    if (prev.find((c) => c.id === data.id)) return prev;
                    return [data, ...prev];
                });
            });

            channel.bind(PUSHER_EVENTS.AGENT_STATUS, (data: { agentId: string; status: string }) => {
                if (data.agentId === agent.id) {
                    setAgentStatus(data.status as any);
                }
            });

            return () => {
                clearInterval(interval);
                channel.unbind_all();
                pusher.unsubscribe(`private-business-${agent.businessId}`);
            };
        }
    }, [agent, fetchQueue]);

    // Fetch canned responses
    useEffect(() => {
        async function fetchCanned() {
            try {
                const res = await fetch("/api/canned-responses");
                const data = await res.json();
                setCannedResponses(data.responses || []);
            } catch { /* ignore */ }
        }
        if (agent) fetchCanned();
    }, [agent]);

    // Load conversation messages
    useEffect(() => {
        async function loadMessages() {
            if (!selectedConvo) return;
            try {
                const res = await fetch(`/api/conversations/${selectedConvo}`);
                const data = await res.json();
                setChatMessages(data.messages || []);
            } catch { /* ignore */ }
        }
        loadMessages();
    }, [selectedConvo]);

    // Real-time messages via Pusher
    useEffect(() => {
        if (!selectedConvo) return;
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`private-conversation-${selectedConvo}`);

        channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: { role: string; content: string; sender?: string }) => {
            setChatMessages((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    role: data.role,
                    content: data.content,
                    sentiment: null,
                    createdAt: new Date().toISOString(),
                },
            ]);
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`private-conversation-${selectedConvo}`);
        };
    }, [selectedConvo]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // Toggle agent status
    const toggleStatus = async () => {
        const next = agentStatus === "online" ? "away" : agentStatus === "away" ? "offline" : "online";
        await fetch("/api/agent", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
        });
        setAgentStatus(next);
    };

    // Send message
    const sendMessage = async () => {
        if (!input.trim() || !selectedConvo || sending) return;
        setSending(true);
        const content = input;
        setInput("");

        try {
            await fetch("/api/agent/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: selectedConvo, content }),
            });
            // Message will appear via Pusher, but also add locally for instant feedback
            setChatMessages((prev) => [
                ...prev,
                { id: Date.now(), role: "agent", content, sentiment: null, createdAt: new Date().toISOString() },
            ]);
        } catch { /* ignore */ }
        finally { setSending(false); }
    };

    const statusColors: Record<string, string> = {
        online: "var(--success)",
        away: "#f59e0b",
        offline: "var(--text-muted)",
    };

    if (authStatus === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen ambient-grid relative flex flex-col">
            <div className="ambient-glow" style={{ top: "-100px", left: "-100px" }} />

            {/* Top Bar */}
            <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-sm font-bold text-[var(--text-primary)]">Agent Workspace</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleStatus} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                        <Circle className="w-2.5 h-2.5 fill-current" style={{ color: statusColors[agentStatus] }} />
                        <span className="capitalize text-[var(--text-secondary)]">{agentStatus}</span>
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">{agent?.displayName}</span>
                </div>
            </header>

            {/* Main Layout: Queue + Chat */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Conversation Queue */}
                <aside className="w-80 shrink-0 overflow-y-auto" style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border-subtle)" }}>
                    <div className="p-4">
                        <p className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider mb-3">
                            Queue ({queue.length})
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        {queue.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                                <p className="text-xs text-[var(--text-muted)]">No conversations in queue</p>
                            </div>
                        ) : (
                            queue.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedConvo(c.id)}
                                    className={`w-full p-3 flex items-start gap-3 text-left transition cursor-pointer ${selectedConvo === c.id ? "bg-[var(--accent-glow)]" : "hover:bg-[var(--bg-card)]"}`}
                                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                >
                                    <div className="shrink-0 mt-1">
                                        {c.status === "escalated" ? (
                                            <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" />
                                        ) : (
                                            <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                                            {c.customerName || "Anonymous"}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                                            {c.lastMessage?.content || `${c.messageCount} messages`}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0 mt-1" />
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* Chat Panel */}
                <section className="flex-1 flex flex-col">
                    {!selectedConvo ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                                <p className="text-sm text-[var(--text-secondary)]">Select a conversation from the queue</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {chatMessages.map((msg) => {
                                    const isCustomer = msg.role === "user";
                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${isCustomer ? "" : "flex-row-reverse"}`}>
                                            <div className="shrink-0 mt-1">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isCustomer ? "bg-[var(--bg-card)]" : msg.role === "agent" ? "bg-[var(--accent)]" : "bg-[var(--accent-glow)]"}`} style={{ border: "1px solid var(--border-subtle)" }}>
                                                    {isCustomer ? <User className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <Bot className="w-3.5 h-3.5 text-[var(--text-primary)]" />}
                                                </div>
                                            </div>
                                            <div className={`max-w-[70%] ${isCustomer ? "" : "text-right"}`}>
                                                <div className={`inline-block p-3 rounded-xl text-sm ${isCustomer ? "bg-[var(--bg-card)]" : msg.role === "agent" ? "bg-[var(--accent-glow)]" : "bg-[var(--accent-glow)]"} text-[var(--text-secondary)]`} style={{ border: "1px solid var(--border-subtle)", textAlign: "left" }}>
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 px-1">
                                                    {msg.role === "agent" ? "You" : msg.role === "assistant" ? "Bot" : "Customer"} • {new Date(msg.createdAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Canned Responses */}
                            {cannedResponses.length > 0 && (
                                <div className="px-6 py-2 flex gap-2 overflow-x-auto" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                    {cannedResponses.map((cr) => (
                                        <button
                                            key={cr.id}
                                            onClick={() => setInput(cr.content)}
                                            className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium text-[var(--accent-light)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                                            title={cr.content}
                                        >
                                            {cr.shortcut || cr.title}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                <div className="flex gap-3">
                                    <input
                                        className="input-field flex-1 text-sm"
                                        placeholder="Type a message..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={sending || !input.trim()}
                                        className="btn-primary py-2 px-4 flex items-center gap-2 text-sm disabled:opacity-30"
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}
