"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Loader2, Send, User, Bot, Circle, Clock,
    AlertTriangle, Zap, MessageSquare, ChevronRight,
    CheckCircle2, Plus, X, Volume2, Mail, Shield, Phone,
} from "lucide-react";
import { getPusherClient, PUSHER_EVENTS } from "@/lib/pusher-client";
import { showToast } from "@/lib/toast";

interface AgentProfile { id: string; businessId: string; displayName: string; status: string; }
interface QueueConvo {
    id: string; customerName: string | null; customerEmail: string | null; customerPhone: string | null;
    status: string | null; assignedAgent: string | null; messageCount: number;
    lastMessage: { role: string; content: string; createdAt: string } | null;
    updatedAt: string; createdAt?: string;
}
interface ChatMsg { id: number | string; role: string; content: string; sentiment: string | null; createdAt: string; }
interface CannedResp { id: string; title: string; content: string; shortcut: string | null; }

export default function AgentDashboardPage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState<AgentProfile | null>(null);
    const [queue, setQueue] = useState<QueueConvo[]>([]);
    const [queueTab, setQueueTab] = useState<"escalated" | "active" | "all">("all");
    const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [cannedResponses, setCannedResponses] = useState<CannedResp[]>([]);
    const [agentStatus, setAgentStatus] = useState("offline");
    const [customerTyping, setCustomerTyping] = useState(false);
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [showCannedForm, setShowCannedForm] = useState(false);
    const [newCanned, setNewCanned] = useState({ title: "", content: "", shortcut: "" });
    const [resolving, setResolving] = useState(false);
    const [takingOver, setTakingOver] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastTypingSentRef = useRef<number>(0);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => { if (authStatus === "unauthenticated") router.push("/auth/login"); }, [authStatus, router]);

    // Init audio for notification
    useEffect(() => {
        audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jk42GfXN1gIiRjomBd3R8hI2SjoZ+dXZ/iJKPi4N5dXqDjJKQiYF4dHmCi5GQioJ5dXmBipCPioJ6dnqBiZCOiYJ7d3uBiI+NiIN8eHuAh46MhoN+eXx/ho2KhYN/en1/hYyJhIN/e35/hIuIg4KAfH5+g4mHgoGAfX5+goiGgYCAfn5+goeFgICAfn9+gYaEf3+Af39+gISDfn+AgH9+f4KCfn6AgIB+f4GBfX6AgIB/f4CBfX2AgYB/f4CAff2AgYCAgICAfv6AgICAgICAgP+AgICAgICAgA==");
    }, []);

    // Fetch or register agent
    useEffect(() => {
        async function initAgent() {
            try {
                const res = await fetch("/api/agent");
                const data = await res.json();
                if (data.agent) { setAgent(data.agent); setAgentStatus(data.agent.status); }
                else {
                    const regRes = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                    const regData = await regRes.json();
                    if (regData.agent) { setAgent(regData.agent); setAgentStatus(regData.agent.status); }
                }
            } catch (err) { showToast(err instanceof Error ? err.message : "Failed to load agent", "error"); }
            finally { setLoading(false); }
        }
        if (authStatus === "authenticated") initAgent();
    }, [authStatus]);

    // Fetch queue
    const fetchQueue = useCallback(async () => {
        try {
            const res = await fetch("/api/agent/conversations?view=all");
            if (!res.ok) return;
            const data = await res.json();
            setQueue(data.conversations || []);
        } catch { /* silent */ }
    }, []);

    // Pusher bindings for business channel
    useEffect(() => {
        if (!agent) return;
        fetchQueue();
        const interval = setInterval(fetchQueue, 30000);
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`private-business-${agent.businessId}`);

        channel.bind(PUSHER_EVENTS.NEW_CONVERSATION, () => fetchQueue());
        channel.bind(PUSHER_EVENTS.HANDOFF, (data: { conversationId: string; reason?: string }) => {
            fetchQueue();
            audioRef.current?.play().catch(() => {});
            showToast(`🔔 New handoff: ${data.reason || "Customer needs help"}`, "success");
        });
        channel.bind(PUSHER_EVENTS.AGENT_STATUS, (data: { agentId: string; status: string }) => {
            if (data.agentId === agent.id) setAgentStatus(data.status);
        });
        channel.bind(PUSHER_EVENTS.CONVERSATION_UPDATED, () => fetchQueue());

        return () => { clearInterval(interval); channel.unbind_all(); pusher.unsubscribe(`private-business-${agent.businessId}`); };
    }, [agent, fetchQueue]);

    // Fetch canned responses
    useEffect(() => {
        if (!agent) return;
        fetch("/api/canned-responses").then(r => r.json()).then(d => setCannedResponses(d.responses || [])).catch(() => {});
    }, [agent]);

    // Load conversation messages
    useEffect(() => {
        if (!selectedConvo) return;
        fetch(`/api/conversations/${selectedConvo}`).then(r => r.json()).then(d => setChatMessages(d.messages || [])).catch(() => {});
    }, [selectedConvo]);

    // Pusher bindings for selected conversation
    useEffect(() => {
        if (!selectedConvo) return;
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`private-conversation-${selectedConvo}`);

        channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: { id?: number | string; role: string; content: string }) => {
            setChatMessages(prev => {
                const messageId = String(data.id || "");
                
                // 1. Exact ID match (prevent duplicates from Pusher + initial fetch or re-triggers)
                if (messageId && prev.some(m => String(m.id) === messageId)) {
                    return prev;
                }

                // 2. Optimistic update upgrade
                if (data.role === "agent") {
                    const tempIndex = prev.findIndex(m => 
                        typeof m.id === "string" && 
                        m.id.startsWith("temp-") && 
                        m.content === data.content
                    );
                    
                    if (tempIndex !== -1) {
                        const updated = [...prev];
                        updated[tempIndex] = { 
                            ...updated[tempIndex], 
                            id: data.id || updated[tempIndex].id,
                            createdAt: new Date().toISOString() // Stabilize time
                        };
                        return updated;
                    }
                }

                // 3. New message append
                return [...prev, {
                    id: data.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    role: data.role,
                    content: data.content,
                    sentiment: null,
                    createdAt: new Date().toISOString()
                }];
            });
        });
        
        channel.bind(PUSHER_EVENTS.TYPING, (data?: { role: string }) => {
            // Only show customer typing to the agent
            if (data?.role === "user") {
                setCustomerTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setCustomerTyping(false), 3000);
            }
        });
        channel.bind(PUSHER_EVENTS.CONVERSATION_UPDATED, (data: { status: string }) => {
            if (data.status === "resolved") { setSelectedConvo(null); fetchQueue(); }
        });

        return () => { channel.unbind_all(); pusher.unsubscribe(`private-conversation-${selectedConvo}`); };
    }, [selectedConvo, fetchQueue]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

    const toggleStatus = async () => {
        const next = agentStatus === "online" ? "away" : agentStatus === "away" ? "offline" : "online";
        try {
            await fetch("/api/agent", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
            setAgentStatus(next);
        } catch { showToast("Failed to update status", "error"); }
    };

    const sendMessage = async () => {
        if (!input.trim() || !selectedConvo || sending) return;
        setSending(true);
        const content = input;
        setInput("");
        try {
            const tempId = `temp-${Date.now()}`;
            setChatMessages(prev => [...prev, { id: tempId, role: "agent", content, sentiment: null, createdAt: new Date().toISOString() }]);
            await fetch("/api/agent/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selectedConvo, content }) });
        } catch { showToast("Failed to send", "error"); }
        finally { setSending(false); }
    };

    const resolveConversation = async () => {
        if (!selectedConvo || resolving) return;
        setResolving(true);
        try {
            await fetch(`/api/conversations/${selectedConvo}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "resolved" }) });
            showToast("Conversation resolved", "success");
            setSelectedConvo(null);
            setMobileShowChat(false);
            fetchQueue();
        } catch { showToast("Failed to resolve", "error"); }
        finally { setResolving(false); }
    };

    const takeOverConversation = async () => {
        if (!selectedConvo || !agent || takingOver) return;
        setTakingOver(true);
        try {
            // Assign this agent to the conversation — this stops the LLM bot
            await fetch(`/api/conversations/${selectedConvo}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignedAgent: agent.id, status: "active" }),
            });
            showToast("You've taken over this conversation. The bot is now paused.", "success");
            fetchQueue();
        } catch { showToast("Failed to take over", "error"); }
        finally { setTakingOver(false); }
    };

    const createCannedResponse = async () => {
        if (!newCanned.title.trim() || !newCanned.content.trim()) return;
        try {
            const res = await fetch("/api/canned-responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCanned) });
            const data = await res.json();
            setCannedResponses(prev => [...prev, data.response]);
            setNewCanned({ title: "", content: "", shortcut: "" });
            setShowCannedForm(false);
        } catch { showToast("Failed to create", "error"); }
    };

    const deleteCannedResponse = async (id: string) => {
        try {
            await fetch(`/api/canned-responses?id=${id}`, { method: "DELETE" });
            setCannedResponses(prev => prev.filter(c => c.id !== id));
        } catch { showToast("Failed to delete", "error"); }
    };

    const statusColors: Record<string, string> = { online: "var(--success)", away: "var(--accent-light)", offline: "var(--text-muted)" };
    const escalatedCount = queue.filter(c => c.status === "escalated").length;
    const activeCount = queue.filter(c => c.status === "active").length;
    const filteredQueue = queue
        .filter(c => {
            if (queueTab === "escalated") return c.status === "escalated";
            if (queueTab === "active") return c.status === "active";
            return true;
        })
        .filter(c => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                c.customerName?.toLowerCase().includes(query) ||
                c.customerEmail?.toLowerCase().includes(query) ||
                c.lastMessage?.content.toLowerCase().includes(query)
            );
        });
    const selectedConvoData = queue.find(c => c.id === selectedConvo);

    if (authStatus === "loading" || loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" /></div>;
    }

    return (
        <main className="h-[100dvh] ambient-grid relative flex flex-col pt-14">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between shrink-0 backdrop-blur-xl border-b" style={{ background: "rgba(255, 255, 255, 0.8)", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-sm">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-[var(--text-primary)] leading-none">Agent Workspace</h1>
                        <p className="text-[12px] text-[var(--text-muted)] mt-1 font-medium tracking-wide uppercase">Business Command Center</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end mr-2">
                        <span className="text-[11px] font-semibold text-[var(--text-primary)]">{agent?.displayName}</span>
                        <span className="text-[12px] text-[var(--text-muted)]">Verified Expert</span>
                    </div>
                    <button onClick={toggleStatus} className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border active:scale-95" 
                        style={{ background: "white", borderColor: "var(--border-subtle)" }}>
                        <Circle className="w-2.5 h-2.5 fill-current" style={{ color: statusColors[agentStatus] }} />
                        <span className="capitalize text-[var(--text-secondary)]">{agentStatus}</span>
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Sidebar Queue */}
                <aside className={`${mobileShowChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 shrink-0 overflow-hidden`} style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border-subtle)" }}>
                    {/* Search & Tabs */}
                    <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white border border-[var(--border-subtle)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                            />
                            <MessageSquare className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
                        </div>
                        <div className="flex gap-1">
                            {([
                                { key: "all", label: "All", count: queue.length },
                                { key: "escalated", label: "Urgent", count: escalatedCount },
                                { key: "active", label: "Live", count: activeCount },
                            ] as const).map(tab => (
                                <button key={tab.key} onClick={() => setQueueTab(tab.key)}
                                    className={`flex-1 px-2 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer ${queueTab === tab.key ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-muted)] hover:bg-white"}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Queue List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredQueue.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
                                <p className="text-xs text-[var(--text-muted)]">No conversations</p>
                            </div>
                        ) : filteredQueue.map(c => (
                            <button key={c.id} onClick={() => { setSelectedConvo(c.id); setMobileShowChat(true); }}
                                className={`w-full p-3 flex items-start gap-3 text-left cursor-pointer ${selectedConvo === c.id ? "bg-[var(--accent-glow)]" : "bg-[var(--bg-card)]"}`}
                                style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <div className="shrink-0 mt-1">
                                    {c.status === "escalated"
                                        ? <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" />
                                        : <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{c.customerName || "Anonymous"}</p>
                                        {c.status === "escalated" && <span className="shrink-0 px-1 py-0.5 rounded text-[12px] font-bold uppercase bg-red-500/15 text-red-400">urgent</span>}
                                    </div>
                                    <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">{c.lastMessage?.content || `${c.messageCount} messages`}</p>
                                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{new Date(c.updatedAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</p>
                                </div>
                                <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0 mt-1" />
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Chat Panel */}
                <section className={`${!mobileShowChat ? "hidden md:flex" : "flex"} flex-1 flex-col`}>
                    {!selectedConvo ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
                                <p className="text-sm text-[var(--text-secondary)]">Select a conversation</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Pick one from the queue to start chatting</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Conversation Header */}
                            <div className="shrink-0 px-4 py-3 flex items-center justify-between" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setMobileShowChat(false); }} className="md:hidden text-[var(--text-muted)] cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center" style={{ border: "1px solid var(--border-subtle)" }}>
                                        <User className="w-4 h-4 text-[var(--text-muted)]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedConvoData?.customerName || "Anonymous"}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {selectedConvoData?.customerEmail && <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" /> {selectedConvoData.customerEmail}</span>}
                                            {selectedConvoData?.customerPhone && <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> {selectedConvoData.customerPhone}</span>}
                                            <span className={`text-[12px] font-bold uppercase px-1.5 py-0.5 rounded ${selectedConvoData?.status === "escalated" ? "bg-red-500/15 text-red-400" : "bg-[var(--accent-glow)] text-[var(--accent-light)]"}`}>{selectedConvoData?.status}</span>
                                            <span className="text-[12px] text-[var(--text-muted)]">{chatMessages.length} msgs</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Take Over — only show if agent is not already assigned */}
                                    {selectedConvoData?.assignedAgent !== agent?.id && (
                                        <button onClick={takeOverConversation} disabled={takingOver}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 disabled:opacity-40"
                                            style={{ border: "1px solid rgba(59,130,246,0.2)" }}>
                                            {takingOver ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                            Take Over
                                        </button>
                                    )}
                                    {/* Resolve */}
                                    <button onClick={resolveConversation} disabled={resolving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 disabled:opacity-40"
                                        style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                                        {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                        Resolve
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {chatMessages.map(msg => {
                                    const isCustomer = msg.role === "user";
                                    const isAgent = msg.role === "agent";
                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${isCustomer ? "" : "flex-row-reverse"}`}>
                                            <div className="shrink-0 mt-1">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${isCustomer ? "bg-white" : isAgent ? "bg-[var(--accent)]" : "bg-indigo-500/10"}`} style={{ border: "1px solid var(--border-subtle)" }}>
                                                    {isCustomer ? <User className="w-4 h-4 text-[var(--text-muted)]" /> : isAgent ? <Shield className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-500" />}
                                                </div>
                                            </div>
                                            <div className={`max-w-[70%] ${isCustomer ? "" : "text-right"}`}>
                                                <div className={`inline-block p-4 rounded-2xl text-sm leading-relaxed shadow-sm`}
                                                    style={{ 
                                                        background: isAgent ? "var(--accent-glow)" : "white", 
                                                        border: "1px solid var(--border-subtle)", 
                                                        textAlign: "left",
                                                        color: "var(--text-primary)"
                                                    }}>
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                                <div className={`flex items-center gap-2 mt-1 px-1 ${isCustomer ? "" : "flex-row-reverse"}`}>
                                                    <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                                        {isAgent ? "You" : msg.role === "assistant" ? "Bot" : "Customer"}
                                                    </span>
                                                    <span className="text-[12px] text-[var(--text-muted)] opacity-60">•</span>
                                                    <span className="text-[12px] text-[var(--text-muted)]">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {customerTyping && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm" style={{ border: "1px solid var(--border-subtle)" }}>
                                            <User className="w-4 h-4 text-[var(--text-muted)]" />
                                        </div>
                                        <div className="px-4 py-3 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-sm">
                                            <div className="flex gap-1.5 items-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                <span className="text-[12px] font-bold text-emerald-500 uppercase ml-2 tracking-widest">Typing</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Canned Responses Bar */}
                            <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                {cannedResponses.map(cr => (
                                    <div key={cr.id} className="shrink-0 flex items-center gap-1 group">
                                        <button onClick={() => setInput(cr.content)}
                                            className="px-2.5 py-1 rounded-full text-[12px] font-medium text-[var(--accent-light)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                                            title={cr.content}>
                                            {cr.shortcut || cr.title}
                                        </button>
                                        <button onClick={() => deleteCannedResponse(cr.id)}
                                            className="opacity-0 group-hover:opacity-100 transition cursor-pointer text-[var(--text-muted)] hover:text-red-400">
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => setShowCannedForm(!showCannedForm)}
                                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition cursor-pointer"
                                    style={{ border: "1px solid var(--border-subtle)" }}>
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Canned Response Form */}
                            {showCannedForm && (
                                <div className="px-4 py-3 flex gap-2 items-end shrink-0" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
                                    <input className="input-field text-xs flex-1" placeholder="Title" value={newCanned.title} onChange={e => setNewCanned(p => ({ ...p, title: e.target.value }))} />
                                    <input className="input-field text-xs flex-1" placeholder="Content" value={newCanned.content} onChange={e => setNewCanned(p => ({ ...p, content: e.target.value }))} />
                                    <input className="input-field text-xs w-20" placeholder="/shortcut" value={newCanned.shortcut} onChange={e => setNewCanned(p => ({ ...p, shortcut: e.target.value }))} />
                                    <button onClick={createCannedResponse} className="btn-primary py-1.5 px-3 text-xs">Save</button>
                                    <button onClick={() => setShowCannedForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-4 h-4" /></button>
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-4 shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                <div className="flex gap-3">
                                    <input className="input-field flex-1 text-sm" placeholder="Type a message..."
                                        value={input} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setInput(val);
                                            if (val.trim() && Date.now() - lastTypingSentRef.current > 2000) {
                                                lastTypingSentRef.current = Date.now();
                                                fetch("/api/chat/typing", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ conversationId: selectedConvo, role: "agent" }),
                                                }).catch(() => {});
                                            }
                                        }}
                                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                                    <button onClick={sendMessage} disabled={sending || !input.trim()}
                                        className="btn-primary py-2 px-4 flex items-center gap-2 text-sm disabled:opacity-30">
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
