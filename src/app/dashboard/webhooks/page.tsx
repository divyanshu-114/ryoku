"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    Globe,
    Plus,
    Trash2,
    Send,
    Check,
    X,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    Zap,
    Package,
    ArrowLeft,
    AlertCircle,
} from "lucide-react";

interface WebhookEndpoint {
    id: string;
    name: string;
    url: string;
    signingSecret: string;
    events: string[];
    active: boolean;
    lastPingedAt: string | null;
    createdAt: string;
}

interface ReturnRequest {
    id: string;
    orderId: string;
    reason: string;
    status: string;
    customerName: string | null;
    refundId: string | null;
    webhookDelivered: boolean;
    createdAt: string;
}

export default function WebhooksPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [slug, setSlug] = useState<string | null>(null);
    const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [pingResult, setPingResult] = useState<Record<string, { success: boolean; statusCode?: number; error?: string } | null>>({});
    const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

    // New endpoint form
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: "", url: "", events: "*" });
    const [newSecret, setNewSecret] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async (businessSlug: string) => {
        const [epRes, retRes] = await Promise.all([
            fetch(`/api/webhook-endpoints?slug=${businessSlug}`),
            fetch(`/api/returns?slug=${businessSlug}`),
        ]);
        if (epRes.ok) { const d = await epRes.json(); setEndpoints(d.endpoints || []); }
        if (retRes.ok) { const d = await retRes.json(); setReturns(d.returns || []); }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") { router.push("/auth/login"); return; }
        if (status !== "authenticated") return;

        const fetchBusiness = async () => {
            const res = await fetch("/api/profile");
            if (res.ok) {
                const data = await res.json();
                if (data.business) {
                    setSlug(data.business.slug);
                    fetchData(data.business.slug);
                } else {
                    router.push("/dashboard");
                }
            }
        };
        fetchBusiness();
    }, [status, router, fetchData]);

    const handleCreate = async () => {
        if (!slug || !formData.name || !formData.url) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/webhook-endpoints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slug,
                    name: formData.name,
                    url: formData.url,
                    events: formData.events === "*" ? ["*"] : formData.events.split(",").map(e => e.trim()),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setNewSecret(data.endpoint.signingSecret);
                setShowForm(false);
                setFormData({ name: "", url: "", events: "*" });
                fetchData(slug);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!slug || !confirm("Remove this webhook endpoint?")) return;
        await fetch(`/api/webhook-endpoints?id=${id}&slug=${slug}`, { method: "DELETE" });
        setEndpoints(prev => prev.filter(e => e.id !== id));
    };

    const handleToggle = async (id: string, active: boolean) => {
        if (!slug) return;
        await fetch("/api/webhook-endpoints", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, slug, active: !active }),
        });
        setEndpoints(prev => prev.map(e => e.id === id ? { ...e, active: !active } : e));
    };

    const handlePing = async (id: string) => {
        if (!slug) return;
        setPingResult(prev => ({ ...prev, [id]: null }));
        const res = await fetch("/api/webhook-endpoints/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, slug }),
        });
        const data = await res.json();
        setPingResult(prev => ({ ...prev, [id]: data }));
    };

    const statusBadge = (s: string) => {
        const styles: Record<string, string> = {
            pending: "bg-amber-50 text-amber-700 border-amber-200",
            approved: "bg-green-50 text-green-700 border-green-200",
            rejected: "bg-red-50 text-red-700 border-red-200",
            cancelled: "bg-gray-50 text-gray-600 border-gray-200",
        };
        return styles[s] || styles.pending;
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
                <RefreshCw className="w-6 h-6 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    if (!session) return null;

    return (
        <main className="min-h-screen pt-28 pb-16 px-4 sm:px-6" style={{ background: "var(--bg-secondary)" }}>
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard")}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-warm)] transition cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Webhooks</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                            Register endpoints to receive return & escalation events from Ryoku
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5"
                    >
                        <Plus className="w-4 h-4" /> Add Endpoint
                    </button>
                </div>

                {/* New secret banner */}
                {newSecret && (
                    <div className="bg-amber-50 rounded-2xl p-5 flex items-start gap-4" style={{ border: "1px solid rgba(217,119,6,0.2)" }}>
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-amber-800 mb-1">Save your signing secret — shown once only</p>
                            <div className="flex items-center gap-3">
                                <code className="text-xs text-amber-700 bg-amber-100 px-3 py-2 rounded-lg font-mono break-all flex-1">
                                    {revealedSecret === "new" ? newSecret : "rsec_••••••••••••••••••••"}
                                </code>
                                <button onClick={() => setRevealedSecret(r => r === "new" ? null : "new")}
                                    className="p-2 rounded-lg hover:bg-amber-100 cursor-pointer">
                                    {revealedSecret === "new" ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-amber-600" />}
                                </button>
                                <button onClick={() => { navigator.clipboard.writeText(newSecret); }}
                                    className="p-2 rounded-lg hover:bg-amber-100 cursor-pointer">
                                    <Copy className="w-4 h-4 text-amber-600" />
                                </button>
                            </div>
                        </div>
                        <button onClick={() => setNewSecret(null)} className="p-1 rounded-lg hover:bg-amber-100 cursor-pointer">
                            <X className="w-4 h-4 text-amber-600" />
                        </button>
                    </div>
                )}

                {/* Add form */}
                {showForm && (
                    <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid var(--border-subtle)" }}>
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Register Endpoint</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">Name</label>
                                <input className="input-field" placeholder="e.g. Amazon Production"
                                    value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">URL</label>
                                <input className="input-field" placeholder="https://yoursite.com/ryoku-webhook"
                                    value={formData.url} onChange={e => setFormData(p => ({ ...p, url: e.target.value }))} />
                            </div>
                        </div>
                        <div className="mb-5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                                Events <span className="text-[var(--text-muted)]">(comma-separated, or * for all)</span>
                            </label>
                            <input className="input-field" placeholder="* or ryoku.return.requested,ryoku.escalation.created"
                                value={formData.events} onChange={e => setFormData(p => ({ ...p, events: e.target.value }))} />
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleCreate} disabled={submitting}
                                className="btn-primary text-sm py-2.5 px-5 disabled:opacity-50">
                                {submitting ? "Creating..." : "Create Endpoint"}
                            </button>
                            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2.5 px-5">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Existing endpoints */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Registered Endpoints
                    </h2>
                    {endpoints.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center" style={{ border: "1px solid var(--border-subtle)" }}>
                            <Globe className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--text-secondary)] font-medium">No endpoints yet</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
                                Add an endpoint so Ryoku can deliver return and escalation events to your backend
                            </p>
                        </div>
                    ) : (
                        endpoints.map(ep => (
                            <div key={ep.id} className="bg-white rounded-2xl p-6" style={{ border: "1px solid var(--border-subtle)" }}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="font-semibold text-[var(--text-primary)]">{ep.name}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ep.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                {ep.active ? "Active" : "Disabled"}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] truncate flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5 shrink-0" /> {ep.url}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            Events: {Array.isArray(ep.events) ? ep.events.join(", ") : ep.events}
                                            {ep.lastPingedAt && ` · Last pinged ${new Date(ep.lastPingedAt).toLocaleDateString()}`}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                                            Secret: {ep.signingSecret}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => handlePing(ep.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-glow)] transition cursor-pointer"
                                            style={{ border: "1px solid rgba(234,88,12,0.2)" }}
                                            title="Send test ping"
                                        >
                                            <Send className="w-3.5 h-3.5" /> Test
                                        </button>
                                        <button onClick={() => handleToggle(ep.id, ep.active)}
                                            className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-warm)] transition cursor-pointer"
                                            title={ep.active ? "Disable" : "Enable"}
                                        >
                                            {ep.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleDelete(ep.id)}
                                            className="p-2 rounded-xl text-[var(--danger)] hover:bg-red-50 transition cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {pingResult[ep.id] !== undefined && (
                                    <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${pingResult[ep.id]?.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                                        style={{ border: `1px solid ${pingResult[ep.id]?.success ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
                                        {pingResult[ep.id]?.success
                                            ? <><Check className="w-3.5 h-3.5" /> Ping delivered (HTTP {pingResult[ep.id]?.statusCode})</>
                                            : <><X className="w-3.5 h-3.5" /> Ping failed: {pingResult[ep.id]?.error || `HTTP ${pingResult[ep.id]?.statusCode}`}</>
                                        }
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Return Requests */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Return Requests
                        </h2>
                        {slug && (
                            <button onClick={() => fetchData(slug)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer">
                                <RefreshCw className="w-3 h-3" /> Refresh
                            </button>
                        )}
                    </div>
                    {returns.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1px solid var(--border-subtle)" }}>
                            <Package className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--text-secondary)] font-medium">No return requests yet</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                They&apos;ll appear here when customers initiate returns via the AI agent
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Order</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Customer</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Reason</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Webhook</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returns.map((r, i) => (
                                        <tr key={r.id} style={{ borderBottom: i < returns.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                                            className="hover:bg-[var(--bg-warm-subtle)] transition">
                                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[var(--text-primary)]">#{r.orderId}</td>
                                            <td className="px-5 py-3.5 text-[var(--text-secondary)]">{r.customerName || "—"}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="capitalize text-[var(--text-secondary)]">{r.reason.replace("_", " ")}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusBadge(r.status)}`}>
                                                    {r.status}
                                                    {r.refundId && <span className="ml-1 opacity-60">· {r.refundId}</span>}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {r.webhookDelivered
                                                    ? <Check className="w-4 h-4 text-[var(--success)]" />
                                                    : <Zap className="w-4 h-4 text-amber-400" />
                                                }
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-[var(--text-muted)]">
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Integration guide */}
                <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid var(--border-subtle)" }}>
                    <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">How your backend should handle events</h2>
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 font-mono text-xs text-[var(--text-secondary)] overflow-x-auto leading-relaxed">
                        <div className="text-[var(--text-muted)] mb-2">{"// 1. Verify the signature"}</div>
                        <div>{"const ts = req.headers['x-ryoku-timestamp'];"}</div>
                        <div>{"const sig = req.headers['x-ryoku-signature'];"}</div>
                        <div>{"const expected = `sha256=${hmacSha256(secret, ts + '.' + rawBody)}`;"}</div>
                        <div>{"if (sig !== expected || Date.now()/1000 - ts > 300) return 401;"}</div>
                        <div className="mt-3 text-[var(--text-muted)]">{"// 2. Handle the event"}</div>
                        <div>{"const { event, data } = JSON.parse(rawBody);"}</div>
                        <div>{"if (event === 'ryoku.return.requested') {"}</div>
                        <div className="pl-4">{"// Process refund in your system (Razorpay, PayU, etc.)"}</div>
                        <div className="pl-4">{"// Then POST back to data.callbackUrl:"}</div>
                        <div className="pl-4">{"// { status: 'approved', refundId: 'R123', refundAmount: '999' }"}</div>
                        <div>{"}"}</div>
                    </div>
                </div>
            </div>
        </main>
    );
}
