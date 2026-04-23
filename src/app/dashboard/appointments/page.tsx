"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    Calendar,
    Check,
    X,
    Clock,
    Plus,
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface Appt {
    id: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    service: string | null;
    date: string;
    duration: number;
    status: string;
    notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
    confirmed: "var(--accent)",
    completed: "var(--success)",
    cancelled: "var(--danger)",
    no_show: "#f59e0b",
};

export default function AppointmentsPage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appt[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ customerName: "", customerEmail: "", service: "", date: "", duration: "30" });

    useEffect(() => {
        if (authStatus === "unauthenticated") router.push("/auth/login");
    }, [authStatus, router]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/appointments");
            if (!res.ok) throw new Error("Failed to load appointments");
            const data = await res.json();
            setAppointments(data.appointments || []);
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to load appointments", "error");
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAppointments(); }, []);

    const createAppointment = async () => {
        if (!form.customerName.trim()) {
            showToast("Customer name is required", "warning");
            return;
        }
        if (!form.date) {
            showToast("Date and time are required", "warning");
            return;
        }

        try {
            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, duration: parseInt(form.duration) }),
            });
            if (!res.ok) throw new Error("Failed to create appointment");
            showToast("Appointment created successfully", "success");
            setShowForm(false);
            setForm({ customerName: "", customerEmail: "", service: "", date: "", duration: "30" });
            fetchAppointments();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to create appointment", "error");
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch("/api/appointments", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });
            if (!res.ok) throw new Error("Failed to update appointment");
            showToast(`Appointment marked as ${status}`, "success");
            fetchAppointments();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to update appointment", "error");
        }
    };

    if (authStatus === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    // Group by date
    const grouped: Record<string, Appt[]> = {};
    appointments.forEach((a) => {
        const date = new Date(a.date).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(a);
    });

    return (
        <main className="min-h-screen px-4 py-24 md:py-20 ambient-grid relative">
            <div className="ambient-glow" style={{ top: "-100px", left: "-100px" }} />
            <div className="max-w-4xl mx-auto relative z-10 space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition mb-3 cursor-pointer">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Appointments</span>
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Booking Calendar</h1>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2 px-4 text-xs flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> New Booking
                    </button>
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="glass-card p-6 space-y-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">New Appointment</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="input-field text-sm" placeholder="Customer Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                            <input className="input-field text-sm" placeholder="Email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
                            <input className="input-field text-sm" placeholder="Service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
                            <input className="input-field text-sm" type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={createAppointment} disabled={!form.customerName || !form.date} className="btn-primary py-2 px-6 text-xs disabled:opacity-30">Create</button>
                            <button onClick={() => setShowForm(false)} className="btn-secondary py-2 px-6 text-xs">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Appointments List */}
                {Object.keys(grouped).length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <Calendar className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-secondary)]">No appointments yet.</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([date, appts]) => (
                        <div key={date}>
                            <p className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider mb-3">{date}</p>
                            <div className="space-y-2">
                                {appts.map((a) => (
                                    <div key={a.id} className="glass-card p-4 flex items-center gap-4">
                                        <div className="w-1.5 h-10 rounded-full" style={{ background: STATUS_COLORS[a.status] || "var(--accent)" }} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-[var(--text-primary)]">{a.customerName}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: `${STATUS_COLORS[a.status]}20`, color: STATUS_COLORS[a.status] }}>{a.status.replace("_", " ")}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(a.date).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })} · {a.duration}min
                                                </span>
                                                {a.service && <span className="text-xs text-[var(--text-muted)]">{a.service}</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {a.status === "confirmed" && (
                                                <>
                                                    <button onClick={() => updateStatus(a.id, "completed")} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-card)] transition cursor-pointer" title="Complete">
                                                        <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                                                    </button>
                                                    <button onClick={() => updateStatus(a.id, "cancelled")} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-card)] transition cursor-pointer" title="Cancel">
                                                        <X className="w-3.5 h-3.5 text-[var(--danger)]" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
