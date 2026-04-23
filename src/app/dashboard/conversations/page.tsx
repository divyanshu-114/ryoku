"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    MessageSquare,
    ArrowLeft,
    Loader2,
    Star,
    AlertTriangle,
    Check,
    Clock,
    ChevronRight,
    Search,
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface ConversationItem {
    id: string;
    customerName: string | null;
    customerEmail: string | null;
    status: string | null;
    rating: number | null;
    summary: string | null;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Check }> = {
    active: { label: "Active", color: "var(--accent)", icon: Clock },
    escalated: { label: "Escalated", color: "var(--danger)", icon: AlertTriangle },
    resolved: { label: "Resolved", color: "var(--success)", icon: Check },
};

export default function ConversationsPage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (authStatus === "unauthenticated") router.push("/auth/login");
    }, [authStatus, router]);

    useEffect(() => {
        async function fetchConversations() {
            setLoading(true);
            try {
                let url = `/api/conversations?page=${page}&limit=20`;
                if (statusFilter) url += `&status=${statusFilter}`;
                if (search) url += `&search=${encodeURIComponent(search)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("Failed to load conversations");
                const data = await res.json();
                setConversations(data.conversations || []);
                setTotal(data.total || 0);
            } catch (err) {
                showToast(err instanceof Error ? err.message : "Failed to load conversations", "error");
                setConversations([]);
                setTotal(0);
            }
            finally { setLoading(false); }
        }
        fetchConversations();
    }, [page, statusFilter, search]);

    // Auto-reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, search]);

    const totalPages = Math.ceil(total / 20);

    if (authStatus === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen px-4 py-24 md:py-20 ambient-grid relative">
            <div className="ambient-glow" style={{ top: "-100px", left: "-100px" }} />
            <div className="max-w-5xl mx-auto relative z-10 space-y-6">
                {/* Header */}
                <div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition mb-3 cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Conversations</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Conversation History</h1>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            className="input-field pl-10 text-sm"
                            placeholder="Search by name, email, or summary..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {[null, "active", "escalated", "resolved"].map((s) => (
                            <button
                                key={s || "all"}
                                onClick={() => { setStatusFilter(s); setPage(1); }}
                                className={`px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${statusFilter === s
                                    ? "bg-[var(--accent-glow)] text-[var(--accent-light)] ring-1 ring-[var(--accent)]"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                {s ? STATUS_CONFIG[s]?.label || s : "All"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-secondary)]">No conversations found.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map((convo, i) => {
                            const statusInfo = STATUS_CONFIG[convo.status || "active"] || STATUS_CONFIG.active;
                            const StatusIcon = statusInfo.icon;
                            return (
                                <motion.button
                                    key={convo.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    onClick={() => router.push(`/dashboard/conversations/${convo.id}`)}
                                    className="w-full glass-card p-4 flex items-center gap-4 text-left hover:ring-1 hover:ring-[var(--accent)] transition-all cursor-pointer"
                                >
                                    <div className="shrink-0">
                                        <StatusIcon className="w-4 h-4" style={{ color: statusInfo.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                                {convo.customerName || "Anonymous"}
                                            </span>
                                            {convo.customerEmail && (
                                                <span className="text-[10px] text-[var(--text-muted)] truncate hidden md:inline">
                                                    {convo.customerEmail}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                            {convo.summary || `${convo.messageCount} messages`}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-3">
                                        {convo.rating && (
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-amber-400" />
                                                <span className="text-xs text-[var(--text-muted)]">{convo.rating}</span>
                                            </div>
                                        )}
                                        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                                            {new Date(convo.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium transition cursor-pointer ${page === p
                                    ? "bg-[var(--accent)] text-[var(--text-primary)]"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
