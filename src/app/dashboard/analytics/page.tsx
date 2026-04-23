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
    Loader2,
    Activity,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface Stats {
    totalConversations: number;
    activeConversations: number;
    escalatedCount: number;
    resolvedCount: number;
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
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [daily, setDaily] = useState<DailyData[]>([]);
    const [events, setEvents] = useState<EventBreakdown[]>([]);
    const [sentiment, setSentiment] = useState<SentimentData[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/auth/login");
    }, [status, router]);

    const fetchAnalytics = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const res = await fetch(`/api/analytics?period=${period}`);
            if (!res.ok) throw new Error("Failed to load analytics");
            const data = await res.json();
            setStats(data.stats);
            setDaily(data.dailyConversations || []);
            setEvents(data.eventBreakdown || []);
            setSentiment(data.sentimentBreakdown || []);
        } catch (err) {
            if (!isRefresh) showToast(err instanceof Error ? err.message : "Failed to load analytics", "error");
            if (!isRefresh) { setStats(null); setDaily([]); setEvents([]); setSentiment([]); }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchAnalytics(); }, [period]);

    // Auto-refresh every 60s
    useEffect(() => {
        const interval = setInterval(() => fetchAnalytics(true), 60000);
        return () => clearInterval(interval);
    }, [period]);

    const handleExport = async (format: string) => {
        try {
            const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
            const res = await fetch(`/api/analytics/export?format=${format}&days=${days}`);
            if (!res.ok) throw new Error("Failed to export data");
            showToast(`Analytics exported as ${format.toUpperCase()}`, "success");
            window.open(`/api/analytics/export?format=${format}&days=${days}`, "_blank");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to export analytics", "error");
        }
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
        <main className="h-[100dvh] ambient-grid relative overflow-hidden flex flex-col">
            <div className="ambient-glow" style={{ top: "-100px", right: "-100px" }} />
            <div className="flex-1 overflow-y-auto pt-20 px-6 pb-20 scroll-smooth">
                <div className="max-w-6xl mx-auto w-full relative z-10 pr-2 pb-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
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
                        {/* Refresh */}
                        <button
                            onClick={() => fetchAnalytics(true)}
                            className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "" : "Refresh"}
                        </button>
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: "Conversations", value: stats?.totalConversations || 0, icon: MessageSquare, color: "var(--accent)" },
                        { label: "Messages", value: stats?.totalMessages || 0, icon: Activity, color: "var(--accent-light)" },
                        { label: "Resolved", value: stats?.resolvedCount || 0, icon: CheckCircle2, color: "var(--success)" },
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
                            <div className="h-40 flex flex-col items-center justify-center border border-dashed border-[var(--border-subtle)] rounded-lg">
                                <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-20" />
                                <p className="text-sm text-[var(--text-muted)]">No data for this period.</p>
                            </div>
                        ) : (
                            <div className="flex items-end gap-2 h-48 pt-4 pb-6 mt-2">
                                {daily.map((d, i) => {
                                    const countVal = Number(d.count) || 0;
                                    const barHeight = maxDaily > 0 ? (countVal / maxDaily) * 100 : 0;
                                    const dateObj = new Date(d.date);
                                    const label = isNaN(dateObj.getTime()) ? d.date : dateObj.toLocaleDateString("en", { month: "short", day: "numeric" });
                                    
                                    return (
                                        <div key={d.date || i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative h-full">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-sm">
                                                {countVal} msgs
                                            </div>
                                            <span className="text-[10px] text-[var(--text-muted)] font-medium z-10">{countVal}</span>
                                            
                                            {/* Bar Track Wrapper */}
                                            <div className="w-full max-w-[32px] flex-1 flex flex-col justify-end">
                                                <div
                                                    className="w-full rounded-t-sm transition-all duration-500 ease-out hover:brightness-125 cursor-help"
                                                    style={{
                                                        height: `${Math.max(barHeight, 4)}%`,
                                                        background: "linear-gradient(180deg, var(--accent), var(--accent-glow))",
                                                        boxShadow: countVal > 0 ? "0 0 10px var(--accent-glow)" : "none"
                                                    }}
                                                />
                                            </div>

                                            {/* Label Wrapper to prevent overlap */}
                                            <div className="h-6 relative w-full flex justify-center mt-1">
                                                <span className="absolute top-0 text-[9px] text-[var(--text-muted)] -rotate-45 whitespace-nowrap text-right pr-1">
                                                    {label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
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
                    <button onClick={() => handleExport("csv")} className="btn-secondary py-3 px-6 text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export Customer Data
                    </button>
                </div>
                </div>
            </div>
        </main>
    );
}
