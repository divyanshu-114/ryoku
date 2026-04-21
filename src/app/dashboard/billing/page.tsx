"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    CreditCard,
    Check,
    AlertCircle,
    ExternalLink,
    Zap,
} from "lucide-react";

interface Plan {
    id: string;
    name: string;
    monthlyPrice: number;
    maxConversations: number;
    maxApiKeys: number;
    features: string[];
}

interface Sub {
    id: string;
    planId: string;
    status: string;
    currentPeriodEnd: string | null;
}

function BillingContent() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscription, setSubscription] = useState<Sub | null>(null);
    const [checkingOut, setCheckingOut] = useState(false);

    const success = searchParams.get("success") === "true";
    const cancelled = searchParams.get("cancelled") === "true";

    useEffect(() => {
        if (authStatus === "unauthenticated") router.push("/auth/login");
    }, [authStatus, router]);

    useEffect(() => {
        async function fetchBilling() {
            try {
                const res = await fetch("/api/billing");
                const data = await res.json();
                setPlans(data.plans || []);
                setSubscription(data.subscription || null);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }
        fetchBilling();
    }, []);

    const handleCheckout = async (planId: string) => {
        setCheckingOut(true);
        try {
            const res = await fetch("/api/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "checkout", planId }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch { /* ignore */ }
        finally { setCheckingOut(false); }
    };

    const handlePortal = async () => {
        const res = await fetch("/api/billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "portal" }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
    };

    if (authStatus === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    // Default plans if none in DB yet
    const displayPlans = plans.length > 0 ? plans : [
        { id: "free", name: "Free", monthlyPrice: 0, maxConversations: 1000, maxApiKeys: 1, features: ["FAQ chatbot only", "No order tracking/returns", "Basic analytics", "Community support"] },
        { id: "paid", name: "Paid", monthlyPrice: 4900, maxConversations: -1, maxApiKeys: 10, features: ["Fully customizable AI", "Order & payment integrations", "Return & refund processing", "Advanced analytics", "Priority support", "Remove Ryoku branding"] },
    ];

    return (
        <main className="min-h-screen px-4 py-24 md:py-20 ambient-grid relative">
            <div className="ambient-glow" style={{ top: "-100px", right: "-100px" }} />
            <div className="max-w-5xl mx-auto relative z-10 space-y-8">
                {/* Header */}
                <div>
                    <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition mb-3 cursor-pointer">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Billing</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Plans & Pricing</h1>
                </div>

                {/* Status messages */}
                {success && (
                    <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <Check className="w-5 h-5 text-[var(--success)]" />
                        <p className="text-sm text-[var(--success)]">Subscription activated successfully!</p>
                    </div>
                )}
                {cancelled && (
                    <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
                        <p className="text-sm text-[var(--danger)]">Checkout was cancelled.</p>
                    </div>
                )}

                {/* Current subscription */}
                {subscription && (
                    <div className="glass-card p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Current Plan</p>
                            <p className="text-lg font-bold text-[var(--text-primary)] capitalize">{subscription.status}</p>
                            {subscription.currentPeriodEnd && (
                                <p className="text-xs text-[var(--text-muted)]">
                                    Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <button onClick={handlePortal} className="btn-secondary py-2 px-4 text-xs flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" /> Manage Subscription
                        </button>
                    </div>
                )}

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {displayPlans.map((plan, i) => {
                        const isPaid = plan.name === "Paid";
                        const isCurrent = subscription?.planId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`glass-card p-6 flex flex-col relative ${isPaid ? "ring-2 ring-[var(--accent)] glow-accent" : ""}`}
                            >
                                {isPaid && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase" style={{ background: "var(--accent)", color: "white" }}>
                                        Full Customization
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-[var(--text-primary)]">${(plan.monthlyPrice / 100).toFixed(0)}</span>
                                    <span className="text-sm text-[var(--text-muted)]">/mo</span>
                                </div>
                                <ul className="space-y-2 flex-1 mb-6">
                                    {plan.features.map((f, fi) => (
                                        <li key={fi} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                            <Zap className="w-3 h-3 text-[var(--accent)] shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                {isCurrent ? (
                                    <div className="btn-secondary py-2.5 text-center text-xs opacity-50">Current Plan</div>
                                ) : (
                                    <button
                                        onClick={() => handleCheckout(plan.id)}
                                        disabled={checkingOut}
                                        className={`${isPaid ? "btn-primary" : "btn-secondary"} py-2.5 text-xs text-center`}
                                    >
                                        {checkingOut ? "Loading..." : plan.monthlyPrice === 0 ? "Get Started" : "Upgrade"}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        }>
            <BillingContent />
        </Suspense>
    );
}
