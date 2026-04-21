"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    BarChart3,
    MessageSquare,
    TrendingUp,
    Users,
    Star,
    AlertTriangle,
    Download,
    ArrowLeft,
    Loader2,
    Activity,
} from "lucide-react";

interface Stats {
    totalConversations: number;
    activeConversations: number;
    escalatedCount: number;
    totalMessages: number;
    avgRating: number | null;
    ratedCount: number;
}

interface DailyData {
    date: string;
    count: number;
}

interface EventBreakdown {
    event: string;
    count: number;
}

interface SentimentData {
    sentiment: string;
    count: number;
}

export default function AnalyticsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [period, setPeriod] = useState("7d");
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [daily, setDaily] = useState<DailyData[]>([]);
    const [events, setEvents] = useState<EventBreakdown[]>([]);
    const [sentiment, setSentiment] = useState<SentimentData[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/auth/login");
    }, [status, router]);

    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            try {
                const res = await fetch(`/api/analytics?period=${period}`);
                const data = await res.json();
                setStats(data.stats);
                setDaily(data.dailyConversations || []);
                setEvents(data.eventBreakdown || []);
                setSentiment(data.sentimentBreakdown || []);
            } catch {
                // Error handling
            } finally {
                setLoading(false);
            }
        }
        fetchAnalytics();
    }, [period]);

    const handleExport = async (format: string) => {
        const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
        window.open(`/api/analytics/export?format=${format}&days=${days}`, "_blank");
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    const maxDaily = Math.max(...daily.map((d) => Number(d.count)), 1);

    const sentimentColors: Record<string, string> = {
        positive: "var(--success)",
        neutral: "var(--accent)",
        negative: "#f59e0b",
        frustrated: "var(--danger)",
    };

    const totalSentiment = sentiment.reduce((sum, s) => sum + Number(s.count), 0);

    return (
        <main className="min-h-screen px-4 py-24 md:py-20 ambient-grid relative">
            <div className="ambient-glow" style={{ top: "-100px", right: "-100px" }} />
            <div className="max-w-6xl mx-auto relative z-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition mb-3 cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Analytics</span>
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Performance Dashboard</h1>
                    </div>
                    <div className="flex gap-3">
                        {/* Period selector */}
                        {(["7d", "30d", "90d"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${period === p
                                    ? "bg-[var(--accent-glow)] text-[var(--accent-light)] ring-1 ring-[var(--accent)]"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
                            </button>
                        ))}
                        {/* Export */}
                        <button
                            onClick={() => handleExport("csv")}
                            className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                        >
                            <Download className="w-3.5 h-3.5" /> Export
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Conversations", value: stats?.totalConversations || 0, icon: MessageSquare, color: "var(--accent)" },
                        { label: "Messages", value: stats?.totalMessages || 0, icon: Activity, color: "var(--accent-light)" },
                        { label: "Avg. CSAT", value: stats?.avgRating ? `${stats.avgRating}/5` : "—", icon: Star, color: "#f59e0b" },
                        { label: "Escalated", value: stats?.escalatedCount || 0, icon: AlertTriangle, color: "var(--danger)" },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-5"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                                <span className="text-xs text-[var(--text-muted)] font-medium">{stat.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daily Conversations Bar Chart */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Daily Conversations</span>
                        </div>
                        {daily.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)]">No data yet.</p>
                        ) : (
                            <div className="flex items-end gap-1 h-40">
                                {daily.map((d) => (
                                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-[var(--text-muted)]">{Number(d.count)}</span>
                                        <div
                                            className="w-full rounded-t-md transition-all"
                                            style={{
                                                height: `${(Number(d.count) / maxDaily) * 100}%`,
                                                minHeight: 4,
                                                background: "linear-gradient(180deg, var(--accent), var(--accent-glow))",
                                            }}
                                        />
                                        <span className="text-[9px] text-[var(--text-muted)] -rotate-45 origin-top-left whitespace-nowrap">
                                            {new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sentiment Breakdown */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Users className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Sentiment Overview</span>
                        </div>
                        {sentiment.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)]">No sentiment data yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {sentiment.map((s) => (
                                    <div key={s.sentiment} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[var(--text-secondary)] capitalize">{s.sentiment}</span>
                                            <span className="text-[var(--text-muted)]">{Number(s.count)} ({totalSentiment > 0 ? Math.round((Number(s.count) / totalSentiment) * 100) : 0}%)</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-[var(--bg-primary)]">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${totalSentiment > 0 ? (Number(s.count) / totalSentiment) * 100 : 0}%`,
                                                    background: sentimentColors[s.sentiment] || "var(--accent)",
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Event Breakdown */}
                {events.length > 0 && (
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Event Breakdown</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {events.map((e) => (
                                <div key={e.event} className="p-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">{e.event.replace(/_/g, " ")}</p>
                                    <p className="text-lg font-bold text-[var(--text-primary)]">{e.count}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Links */}
                <div className="flex gap-4">
                    <button onClick={() => router.push("/dashboard/conversations")} className="btn-secondary py-3 px-6 text-sm flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> View Conversations
                    </button>
                    <button onClick={() => handleExport("json")} className="btn-secondary py-3 px-6 text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export JSON
                    </button>
                </div>
            </div>
        </main>
    );
}
