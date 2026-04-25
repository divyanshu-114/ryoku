"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    CreditCard,
    Zap,
    Mail,
} from "lucide-react";
import { ContactDialog } from "@/components/ContactDialog";

function BillingContent() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<"Pro" | "Enterprise">("Pro");

    const openContact = (plan: "Pro" | "Enterprise") => {
        setSelectedPlan(plan);
        setContactDialogOpen(true);
    };

    useEffect(() => {
        if (authStatus === "unauthenticated") router.push("/auth/login");
    }, [authStatus, router]);

    if (authStatus === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen px-4 py-24 md:py-20 ambient-grid relative">
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

                {/* Plans Grid - All Three Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Plan */}
                    <div className="glass-card p-6 flex flex-col">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Free</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-4">For teams getting started</p>
                        <div className="mb-4">
                            <span className="text-3xl font-bold text-[var(--text-primary)]">$0</span>
                            <span className="text-sm text-[var(--text-muted)]">/month</span>
                        </div>
                        <ul className="space-y-2 flex-1 mb-6">
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                FAQ chatbot with knowledge base
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Basic agent handoff
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Dashboard & analytics
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Unanswered question tracking
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Community support
                            </li>
                        </ul>
                        <div className="text-center py-2.5 text-xs font-medium text-[var(--accent-light)]">
                            Your Current Plan
                        </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="glass-card p-6 flex flex-col ring-2 ring-[var(--accent)] glow-accent">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Pro</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-4">For businesses with real customers</p>
                        <div className="mb-4">
                            <span className="text-2xl text-[var(--text-muted)]">Custom</span>
                            <p className="text-xs text-[var(--text-muted)]">Based on your needs</p>
                        </div>
                        <ul className="space-y-2 flex-1 mb-6">
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                <span><strong>Everything in Free</strong></span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Payment integrations
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Return & refund processing
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Full API access
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Priority support
                            </li>
                        </ul>
                        <button
                            onClick={() => openContact("Pro")}
                            className="btn-primary py-2.5 text-xs font-medium flex items-center justify-center gap-2"
                        >
                            <Mail className="w-4 h-4" />
                            Get in Touch
                        </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="glass-card p-6 flex flex-col">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Enterprise</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-4">Personalized for your business</p>
                        <div className="mb-4">
                            <span className="text-2xl text-[var(--text-muted)]">Custom</span>
                            <p className="text-xs text-[var(--text-muted)]">Contact for pricing</p>
                        </div>
                        <ul className="space-y-2 flex-1 mb-6">
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                <span><strong>Everything in Pro</strong></span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Custom AI persona & training
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Dedicated onboarding team
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                Appointment booking engine
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                SLA guarantee
                            </li>
                        </ul>
                        <button
                            onClick={() => openContact("Enterprise")}
                            className="btn-primary py-2.5 text-xs font-medium flex items-center justify-center gap-2"
                        >
                            <Mail className="w-4 h-4" />
                            Contact Sales
                        </button>
                    </div>
                </div>

                {/* What's Included Section */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Plan Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Feature</th>
                                    <th className="text-center py-3 px-2 font-semibold text-[var(--text-secondary)]">Free</th>
                                    <th className="text-center py-3 px-2 font-semibold text-[var(--text-secondary)]">Pro</th>
                                    <th className="text-center py-3 px-2 font-semibold text-[var(--text-secondary)]">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">FAQ Chatbot</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Agent Handoff</td>
                                    <td className="text-center text-[var(--accent)]">Basic</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Payment Integrations</td>
                                    <td className="text-center text-[var(--text-muted)]">✗</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Return & Refund Processing</td>
                                    <td className="text-center text-[var(--text-muted)]">✗</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Full API Access</td>
                                    <td className="text-center text-[var(--text-muted)]">✗</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Analytics Dashboard</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Custom AI Training</td>
                                    <td className="text-center text-[var(--text-muted)]">✗</td>
                                    <td className="text-center text-[var(--text-muted)]">✗</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Appointment Booking</td>
                                    <td className="text-center text-[var(--text-muted)]">✗</td>
                                    <td className="text-center text-[var(--text-muted)]">✗</td>
                                    <td className="text-center text-[var(--accent)]">✓</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-2 text-[var(--text-secondary)]">Support</td>
                                    <td className="text-center text-[var(--text-secondary)]">Community</td>
                                    <td className="text-center text-[var(--accent)]">Priority</td>
                                    <td className="text-center text-[var(--accent)]">Dedicated + SLA</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Support Section */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Ready to Scale?</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Start with our free plan and upgrade to Pro or Enterprise as your business grows. Each plan is designed to scale with you.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--text-secondary)]">
                        <div>
                            <strong className="text-[var(--text-primary)]">Free</strong>
                            <p className="mt-1">Perfect for getting started and testing the platform</p>
                        </div>
                        <div>
                            <strong className="text-[var(--text-primary)]">Pro</strong>
                            <p className="mt-1">For businesses ready to process payments and handle returns</p>
                        </div>
                        <div>
                            <strong className="text-[var(--text-primary)]">Enterprise</strong>
                            <p className="mt-1">For established businesses needing custom solutions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Dialog */}
            <ContactDialog
                isOpen={contactDialogOpen}
                onClose={() => setContactDialogOpen(false)}
                plan={selectedPlan}
            />
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
