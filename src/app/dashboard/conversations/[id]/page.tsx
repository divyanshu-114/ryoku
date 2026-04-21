"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    User,
    Bot,
    Star,
    AlertTriangle,
    Check,
    Clock,
} from "lucide-react";

interface ConvoMessage {
    id: number;
    role: string;
    content: string;
    sentiment: string | null;
    createdAt: string;
}

interface ConvoDetail {
    id: string;
    customerName: string | null;
    customerEmail: string | null;
    status: string | null;
    rating: number | null;
    summary: string | null;
    assignedAgent: string | null;
    createdAt: string;
}

const SENTIMENT_BADGE: Record<string, { label: string; color: string }> = {
    positive: { label: "😊 Positive", color: "var(--success)" },
    neutral: { label: "😐 Neutral", color: "var(--accent)" },
    negative: { label: "😟 Negative", color: "#f59e0b" },
    frustrated: { label: "😡 Frustrated", color: "var(--danger)" },
};

export default function ConversationDetailPage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [conversation, setConversation] = useState<ConvoDetail | null>(null);
    const [messages, setMessages] = useState<ConvoMessage[]>([]);

    useEffect(() => {
        if (authStatus === "unauthenticated") router.push("/auth/login");
    }, [authStatus, router]);

    useEffect(() => {
        async function fetchConversation() {
            setLoading(true);
            try {
                const res = await fetch(`/api/conversations/${params.id}`);
                const data = await res.json();
                setConversation(data.conversation);
                setMessages(data.messages || []);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }
        if (params.id) fetchConversation();
    }, [params.id]);

    if (authStatus === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm text-[var(--text-muted)]">Conversation not found.</p>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        active: "var(--accent)",
        escalated: "var(--danger)",
        resolved: "var(--success)",
    };

    return (
        <main className="min-h-screen px-4 py-24 md:py-20 ambient-grid relative">
            <div className="ambient-glow" style={{ top: "-100px", right: "-100px" }} />
            <div className="max-w-3xl mx-auto relative z-10 space-y-6">
                {/* Header */}
                <div>
                    <button
                        onClick={() => router.push("/dashboard/conversations")}
                        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition mb-3 cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> All Conversations
                    </button>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        {conversation.customerName || "Anonymous Customer"}
                    </h1>
                    {conversation.customerEmail && (
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">{conversation.customerEmail}</p>
                    )}
                </div>

                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-4 glass-card p-4">
                    <div className="flex items-center gap-1.5">
                        {conversation.status === "active" && <Clock className="w-3.5 h-3.5" style={{ color: statusColors.active }} />}
                        {conversation.status === "escalated" && <AlertTriangle className="w-3.5 h-3.5" style={{ color: statusColors.escalated }} />}
                        {conversation.status === "resolved" && <Check className="w-3.5 h-3.5" style={{ color: statusColors.resolved }} />}
                        <span className="text-xs font-medium capitalize" style={{ color: statusColors[conversation.status || "active"] }}>
                            {conversation.status}
                        </span>
                    </div>
                    {conversation.rating && (
                        <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs text-[var(--text-secondary)]">{conversation.rating}/5</span>
                        </div>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                        {messages.length} messages • {new Date(conversation.createdAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                </div>

                {/* Summary */}
                {conversation.summary && (
                    <div className="glass-card p-4">
                        <p className="text-xs font-semibold text-[var(--accent-light)] mb-1.5 uppercase tracking-wider">AI Summary</p>
                        <p className="text-sm text-[var(--text-secondary)]">{conversation.summary}</p>
                    </div>
                )}

                {/* Messages */}
                <div className="space-y-3">
                    {messages.map((msg) => {
                        const isUser = msg.role === "user";
                        const isAgent = msg.role === "agent";
                        const sentimentInfo = msg.sentiment ? SENTIMENT_BADGE[msg.sentiment] : null;
                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${isUser ? "" : "flex-row-reverse"}`}
                            >
                                <div className="shrink-0 mt-1">
                                    {isUser ? (
                                        <div className="w-7 h-7 rounded-full bg-[var(--bg-card)] flex items-center justify-center" style={{ border: "1px solid var(--border-subtle)" }}>
                                            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                        </div>
                                    ) : (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isAgent ? "var(--success)" : "var(--accent-glow)", border: "1px solid var(--border-subtle)" }}>
                                            <Bot className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                                        </div>
                                    )}
                                </div>
                                <div className={`flex-1 max-w-[80%] ${isUser ? "" : "text-right"}`}>
                                    <div
                                        className={`inline-block p-3 rounded-xl text-sm ${isUser
                                            ? "bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                            : "bg-[var(--accent-glow)] text-[var(--text-primary)]"
                                            }`}
                                        style={{ border: "1px solid var(--border-subtle)", textAlign: "left" }}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 px-1">
                                        <span className="text-[10px] text-[var(--text-muted)]">
                                            {new Date(msg.createdAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                                        </span>
                                        {sentimentInfo && (
                                            <span className="text-[10px]" style={{ color: sentimentInfo.color }}>
                                                {sentimentInfo.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
