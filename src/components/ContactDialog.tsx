"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Building2, Phone, ChevronDown, Send, CheckCircle2, Loader2, Search } from "lucide-react";
import { showToast } from "@/lib/toast";

// ── Country codes ──────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
    { country: "Afghanistan", code: "+93", flag: "🇦🇫" },
    { country: "Albania", code: "+355", flag: "🇦🇱" },
    { country: "Algeria", code: "+213", flag: "🇩🇿" },
    { country: "Andorra", code: "+376", flag: "🇦🇩" },
    { country: "Angola", code: "+244", flag: "🇦🇴" },
    { country: "Antigua & Barbuda", code: "+1-268", flag: "🇦🇬" },
    { country: "Argentina", code: "+54", flag: "🇦🇷" },
    { country: "Armenia", code: "+374", flag: "🇦🇲" },
    { country: "Australia", code: "+61", flag: "🇦🇺" },
    { country: "Austria", code: "+43", flag: "🇦🇹" },
    { country: "Azerbaijan", code: "+994", flag: "🇦🇿" },
    { country: "Bahamas", code: "+1-242", flag: "🇧🇸" },
    { country: "Bahrain", code: "+973", flag: "🇧🇭" },
    { country: "Bangladesh", code: "+880", flag: "🇧🇩" },
    { country: "Barbados", code: "+1-246", flag: "🇧🇧" },
    { country: "Belarus", code: "+375", flag: "🇧🇾" },
    { country: "Belgium", code: "+32", flag: "🇧🇪" },
    { country: "Belize", code: "+501", flag: "🇧🇿" },
    { country: "Benin", code: "+229", flag: "🇧🇯" },
    { country: "Bhutan", code: "+975", flag: "🇧🇹" },
    { country: "Bolivia", code: "+591", flag: "🇧🇴" },
    { country: "Bosnia & Herzegovina", code: "+387", flag: "🇧🇦" },
    { country: "Botswana", code: "+267", flag: "🇧🇼" },
    { country: "Brazil", code: "+55", flag: "🇧🇷" },
    { country: "Brunei", code: "+673", flag: "🇧🇳" },
    { country: "Bulgaria", code: "+359", flag: "🇧🇬" },
    { country: "Burkina Faso", code: "+226", flag: "🇧🇫" },
    { country: "Burundi", code: "+257", flag: "🇧🇮" },
    { country: "Cambodia", code: "+855", flag: "🇰🇭" },
    { country: "Cameroon", code: "+237", flag: "🇨🇲" },
    { country: "Canada", code: "+1", flag: "🇨🇦" },
    { country: "Cape Verde", code: "+238", flag: "🇨🇻" },
    { country: "Central African Republic", code: "+236", flag: "🇨🇫" },
    { country: "Chad", code: "+235", flag: "🇹🇩" },
    { country: "Chile", code: "+56", flag: "🇨🇱" },
    { country: "China", code: "+86", flag: "🇨🇳" },
    { country: "Colombia", code: "+57", flag: "🇨🇴" },
    { country: "Comoros", code: "+269", flag: "🇰🇲" },
    { country: "Congo (DRC)", code: "+243", flag: "🇨🇩" },
    { country: "Congo (Republic)", code: "+242", flag: "🇨🇬" },
    { country: "Costa Rica", code: "+506", flag: "🇨🇷" },
    { country: "Croatia", code: "+385", flag: "🇭🇷" },
    { country: "Cuba", code: "+53", flag: "🇨🇺" },
    { country: "Cyprus", code: "+357", flag: "🇨🇾" },
    { country: "Czech Republic", code: "+420", flag: "🇨🇿" },
    { country: "Denmark", code: "+45", flag: "🇩🇰" },
    { country: "Djibouti", code: "+253", flag: "🇩🇯" },
    { country: "Dominica", code: "+1-767", flag: "🇩🇲" },
    { country: "Dominican Republic", code: "+1-809", flag: "🇩🇴" },
    { country: "Ecuador", code: "+593", flag: "🇪🇨" },
    { country: "Egypt", code: "+20", flag: "🇪🇬" },
    { country: "El Salvador", code: "+503", flag: "🇸🇻" },
    { country: "Equatorial Guinea", code: "+240", flag: "🇬🇶" },
    { country: "Eritrea", code: "+291", flag: "🇪🇷" },
    { country: "Estonia", code: "+372", flag: "🇪🇪" },
    { country: "Eswatini", code: "+268", flag: "🇸🇿" },
    { country: "Ethiopia", code: "+251", flag: "🇪🇹" },
    { country: "Fiji", code: "+679", flag: "🇫🇯" },
    { country: "Finland", code: "+358", flag: "🇫🇮" },
    { country: "France", code: "+33", flag: "🇫🇷" },
    { country: "Gabon", code: "+241", flag: "🇬🇦" },
    { country: "Gambia", code: "+220", flag: "🇬🇲" },
    { country: "Georgia", code: "+995", flag: "🇬🇪" },
    { country: "Germany", code: "+49", flag: "🇩🇪" },
    { country: "Ghana", code: "+233", flag: "🇬🇭" },
    { country: "Greece", code: "+30", flag: "🇬🇷" },
    { country: "Grenada", code: "+1-473", flag: "🇬🇩" },
    { country: "Guatemala", code: "+502", flag: "🇬🇹" },
    { country: "Guinea", code: "+224", flag: "🇬🇳" },
    { country: "Guinea-Bissau", code: "+245", flag: "🇬🇼" },
    { country: "Guyana", code: "+592", flag: "🇬🇾" },
    { country: "Haiti", code: "+509", flag: "🇭🇹" },
    { country: "Honduras", code: "+504", flag: "🇭🇳" },
    { country: "Hungary", code: "+36", flag: "🇭🇺" },
    { country: "Iceland", code: "+354", flag: "🇮🇸" },
    { country: "India", code: "+91", flag: "🇮🇳" },
    { country: "Indonesia", code: "+62", flag: "🇮🇩" },
    { country: "Iran", code: "+98", flag: "🇮🇷" },
    { country: "Iraq", code: "+964", flag: "🇮🇶" },
    { country: "Ireland", code: "+353", flag: "🇮🇪" },
    { country: "Israel", code: "+972", flag: "🇮🇱" },
    { country: "Italy", code: "+39", flag: "🇮🇹" },
    { country: "Ivory Coast", code: "+225", flag: "🇨🇮" },
    { country: "Jamaica", code: "+1-876", flag: "🇯🇲" },
    { country: "Japan", code: "+81", flag: "🇯🇵" },
    { country: "Jordan", code: "+962", flag: "🇯🇴" },
    { country: "Kazakhstan", code: "+7", flag: "🇰🇿" },
    { country: "Kenya", code: "+254", flag: "🇰🇪" },
    { country: "Kiribati", code: "+686", flag: "🇰🇮" },
    { country: "Kosovo", code: "+383", flag: "🇽🇰" },
    { country: "Kuwait", code: "+965", flag: "🇰🇼" },
    { country: "Kyrgyzstan", code: "+996", flag: "🇰🇬" },
    { country: "Laos", code: "+856", flag: "🇱🇦" },
    { country: "Latvia", code: "+371", flag: "🇱🇻" },
    { country: "Lebanon", code: "+961", flag: "🇱🇧" },
    { country: "Lesotho", code: "+266", flag: "🇱🇸" },
    { country: "Liberia", code: "+231", flag: "🇱🇷" },
    { country: "Libya", code: "+218", flag: "🇱🇾" },
    { country: "Liechtenstein", code: "+423", flag: "🇱🇮" },
    { country: "Lithuania", code: "+370", flag: "🇱🇹" },
    { country: "Luxembourg", code: "+352", flag: "🇱🇺" },
    { country: "Madagascar", code: "+261", flag: "🇲🇬" },
    { country: "Malawi", code: "+265", flag: "🇲🇼" },
    { country: "Malaysia", code: "+60", flag: "🇲🇾" },
    { country: "Maldives", code: "+960", flag: "🇲🇻" },
    { country: "Mali", code: "+223", flag: "🇲🇱" },
    { country: "Malta", code: "+356", flag: "🇲🇹" },
    { country: "Marshall Islands", code: "+692", flag: "🇲🇭" },
    { country: "Mauritania", code: "+222", flag: "🇲🇷" },
    { country: "Mauritius", code: "+230", flag: "🇲🇺" },
    { country: "Mexico", code: "+52", flag: "🇲🇽" },
    { country: "Micronesia", code: "+691", flag: "🇫🇲" },
    { country: "Moldova", code: "+373", flag: "🇲🇩" },
    { country: "Monaco", code: "+377", flag: "🇲🇨" },
    { country: "Mongolia", code: "+976", flag: "🇲🇳" },
    { country: "Montenegro", code: "+382", flag: "🇲🇪" },
    { country: "Morocco", code: "+212", flag: "🇲🇦" },
    { country: "Mozambique", code: "+258", flag: "🇲🇿" },
    { country: "Myanmar", code: "+95", flag: "🇲🇲" },
    { country: "Namibia", code: "+264", flag: "🇳🇦" },
    { country: "Nauru", code: "+674", flag: "🇳🇷" },
    { country: "Nepal", code: "+977", flag: "🇳🇵" },
    { country: "Netherlands", code: "+31", flag: "🇳🇱" },
    { country: "New Zealand", code: "+64", flag: "🇳🇿" },
    { country: "Nicaragua", code: "+505", flag: "🇳🇮" },
    { country: "Niger", code: "+227", flag: "🇳🇪" },
    { country: "Nigeria", code: "+234", flag: "🇳🇬" },
    { country: "North Korea", code: "+850", flag: "🇰🇵" },
    { country: "North Macedonia", code: "+389", flag: "🇲🇰" },
    { country: "Norway", code: "+47", flag: "🇳🇴" },
    { country: "Oman", code: "+968", flag: "🇴🇲" },
    { country: "Pakistan", code: "+92", flag: "🇵🇰" },
    { country: "Palau", code: "+680", flag: "🇵🇼" },
    { country: "Palestine", code: "+970", flag: "🇵🇸" },
    { country: "Panama", code: "+507", flag: "🇵🇦" },
    { country: "Papua New Guinea", code: "+675", flag: "🇵🇬" },
    { country: "Paraguay", code: "+595", flag: "🇵🇾" },
    { country: "Peru", code: "+51", flag: "🇵🇪" },
    { country: "Philippines", code: "+63", flag: "🇵🇭" },
    { country: "Poland", code: "+48", flag: "🇵🇱" },
    { country: "Portugal", code: "+351", flag: "🇵🇹" },
    { country: "Qatar", code: "+974", flag: "🇶🇦" },
    { country: "Romania", code: "+40", flag: "🇷🇴" },
    { country: "Russia", code: "+7", flag: "🇷🇺" },
    { country: "Rwanda", code: "+250", flag: "🇷🇼" },
    { country: "Saint Kitts & Nevis", code: "+1-869", flag: "🇰🇳" },
    { country: "Saint Lucia", code: "+1-758", flag: "🇱🇨" },
    { country: "Saint Vincent & Grenadines", code: "+1-784", flag: "🇻🇨" },
    { country: "Samoa", code: "+685", flag: "🇼🇸" },
    { country: "San Marino", code: "+378", flag: "🇸🇲" },
    { country: "São Tomé & Príncipe", code: "+239", flag: "🇸🇹" },
    { country: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
    { country: "Senegal", code: "+221", flag: "🇸🇳" },
    { country: "Serbia", code: "+381", flag: "🇷🇸" },
    { country: "Seychelles", code: "+248", flag: "🇸🇨" },
    { country: "Sierra Leone", code: "+232", flag: "🇸🇱" },
    { country: "Singapore", code: "+65", flag: "🇸🇬" },
    { country: "Slovakia", code: "+421", flag: "🇸🇰" },
    { country: "Slovenia", code: "+386", flag: "🇸🇮" },
    { country: "Solomon Islands", code: "+677", flag: "🇸🇧" },
    { country: "Somalia", code: "+252", flag: "🇸🇴" },
    { country: "South Africa", code: "+27", flag: "🇿🇦" },
    { country: "South Korea", code: "+82", flag: "🇰🇷" },
    { country: "South Sudan", code: "+211", flag: "🇸🇸" },
    { country: "Spain", code: "+34", flag: "🇪🇸" },
    { country: "Sri Lanka", code: "+94", flag: "🇱🇰" },
    { country: "Sudan", code: "+249", flag: "🇸🇩" },
    { country: "Suriname", code: "+597", flag: "🇸🇷" },
    { country: "Sweden", code: "+46", flag: "🇸🇪" },
    { country: "Switzerland", code: "+41", flag: "🇨🇭" },
    { country: "Syria", code: "+963", flag: "🇸🇾" },
    { country: "Taiwan", code: "+886", flag: "🇹🇼" },
    { country: "Tajikistan", code: "+992", flag: "🇹🇯" },
    { country: "Tanzania", code: "+255", flag: "🇹🇿" },
    { country: "Thailand", code: "+66", flag: "🇹🇭" },
    { country: "Timor-Leste", code: "+670", flag: "🇹🇱" },
    { country: "Togo", code: "+228", flag: "🇹🇬" },
    { country: "Tonga", code: "+676", flag: "🇹🇴" },
    { country: "Trinidad & Tobago", code: "+1-868", flag: "🇹🇹" },
    { country: "Tunisia", code: "+216", flag: "🇹🇳" },
    { country: "Turkey", code: "+90", flag: "🇹🇷" },
    { country: "Turkmenistan", code: "+993", flag: "🇹🇲" },
    { country: "Tuvalu", code: "+688", flag: "🇹🇻" },
    { country: "Uganda", code: "+256", flag: "🇺🇬" },
    { country: "Ukraine", code: "+380", flag: "🇺🇦" },
    { country: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
    { country: "United Kingdom", code: "+44", flag: "🇬🇧" },
    { country: "United States", code: "+1", flag: "🇺🇸" },
    { country: "Uruguay", code: "+598", flag: "🇺🇾" },
    { country: "Uzbekistan", code: "+998", flag: "🇺🇿" },
    { country: "Vanuatu", code: "+678", flag: "🇻🇺" },
    { country: "Vatican City", code: "+39-06", flag: "🇻🇦" },
    { country: "Venezuela", code: "+58", flag: "🇻🇪" },
    { country: "Vietnam", code: "+84", flag: "🇻🇳" },
    { country: "Yemen", code: "+967", flag: "🇾🇪" },
    { country: "Zambia", code: "+260", flag: "🇿🇲" },
    { country: "Zimbabwe", code: "+263", flag: "🇿🇼" }
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface ContactDialogProps {
    isOpen: boolean;
    onClose: () => void;
    plan?: "Pro" | "Enterprise";
}

interface FormState {
    email: string;
    businessType: string;
    countryCode: string;
    phone: string;
    message: string;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function ContactDialog({ isOpen, onClose, plan = "Pro" }: ContactDialogProps) {
    const [form, setForm] = useState<FormState>({
        email: "",
        businessType: "",
        countryCode: "+91",
        phone: "",
        message: "",
    });
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [errors, setErrors] = useState<Partial<FormState>>({});

    // Professional flag matching: ignore formatting and support longest-prefix matching
    const cleanInput = form.countryCode.replace(/[^\d+]/g, "");
    
    // 1. Try exact match after stripping hyphens/spaces (e.g. "+1242" matches "+1-242")
    const exactMatch = COUNTRY_CODES.find(c => c.code.replace(/[^\d+]/g, "") === cleanInput);
    
    // 2. If no exact match, find the longest valid prefix (e.g. "+12425551234" correctly matches Bahamas "+1-242")
    const prefixMatches = COUNTRY_CODES.filter(c => cleanInput.startsWith(c.code.replace(/[^\d+]/g, "")));
    const bestPrefixMatch = prefixMatches.sort((a, b) => b.code.length - a.code.length)[0];

    const selectedCountry = exactMatch || bestPrefixMatch || { flag: "🌐", code: form.countryCode, country: "Unknown Region" };

    const filteredCountries = COUNTRY_CODES.filter(c => 
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.code.includes(searchQuery)
    );

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const validate = () => {
        const e: Partial<FormState> = {};
        if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            e.email = "Please enter a valid email.";
        if (!form.businessType.trim())
            e.businessType = "Please describe your business.";
        if (!form.phone.trim() || !/^\d{5,15}$/.test(form.phone.trim()))
            e.phone = "Please enter a valid phone number.";
        if (!form.message.trim() || form.message.trim().length < 10)
            e.message = "Please write at least 10 characters.";
        return e;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setSending(true);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    businessType: form.businessType,
                    countryCode: form.countryCode,
                    phone: form.phone,
                    message: form.message,
                    plan: plan
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to send enquiry");
            }

            setSent(true);
        } catch (error: any) {
            console.error("Resend error:", error);
            showToast(error.message || "Something went wrong. Please try again.", "error");
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setSent(false);
            setForm({ email: "", businessType: "", countryCode: "+91", phone: "", message: "" });
            setErrors({});
        }, 350);
    };

    const update = (field: keyof FormState, value: string) => {
        if (field === "countryCode" && !value.startsWith("+") && value.trim() !== "") {
            value = "+" + value.replace(/[^\d-]/g, "");
        }
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        key="dialog"
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
                            style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(234,88,12,0.10)" }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Accent stripe */}
                            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ea580c, #f97316, #fb923c)" }} />

                            {/* Header */}
                            <div className="px-7 pt-6 pb-0 flex items-start justify-between">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                                        {plan} Plan
                                    </span>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)] mt-0.5 leading-snug">
                                        {plan === "Enterprise" ? "Contact Sales" : "Get in Touch"}
                                    </h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Fill in your details and we'll get back to you within 24 hours.
                                    </p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition mt-0.5 -mr-1 cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-7 py-5">
                                {sent ? (
                                    // ── Success state ──
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.92 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-8 text-center gap-4"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-[var(--accent-glow)] flex items-center justify-center">
                                            <CheckCircle2 className="w-7 h-7 text-[var(--accent)]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">Enquiry sent!</p>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                                We&apos;ll reach out to <strong>{form.email || "you"}</strong> soon.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleClose}
                                            className="btn-primary text-sm px-6 py-2.5 mt-1"
                                        >
                                            Done
                                        </button>
                                    </motion.div>
                                ) : (
                                    // ── Form ──
                                    <form onSubmit={handleSubmit} noValidate className="space-y-4">

                                        {/* Email */}
                                        <div>
                                            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                <Mail className="w-3 h-3 text-[var(--accent)]" /> Business Email
                                            </label>
                                            <input
                                                id="contact-email"
                                                type="email"
                                                placeholder="you@company.com"
                                                value={form.email}
                                                onChange={e => update("email", e.target.value)}
                                                className={`input-field text-sm ${errors.email ? "border-[var(--danger)]" : ""}`}
                                            />
                                            {errors.email && <p className="text-[11px] text-[var(--danger)] mt-1">{errors.email}</p>}
                                        </div>

                                        {/* Type of business */}
                                        <div>
                                            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                <Building2 className="w-3 h-3 text-[var(--accent)]" /> Type of Business
                                            </label>
                                            <input
                                                id="contact-business-type"
                                                type="text"
                                                placeholder="e.g. E-commerce, Healthcare, SaaS…"
                                                value={form.businessType}
                                                onChange={e => update("businessType", e.target.value)}
                                                className={`input-field text-sm ${errors.businessType ? "border-[var(--danger)]" : ""}`}
                                            />
                                            {errors.businessType && <p className="text-[11px] text-[var(--danger)] mt-1">{errors.businessType}</p>}
                                        </div>

                                        {/* Phone with country code */}
                                        <div>
                                            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                <Phone className="w-3 h-3 text-[var(--accent)]" /> Contact Number
                                            </label>
                                            <div className="flex gap-2">
                                                {/* Country code selector */}
                                                <div className="relative">
                                                    <button
                                                        id="contact-country-code"
                                                        type="button"
                                                        onClick={() => setShowCountryDropdown(p => !p)}
                                                        className="flex items-center justify-between gap-2 h-full px-3.5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all whitespace-nowrap cursor-pointer min-w-[105px]"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base leading-none">{selectedCountry.flag}</span>
                                                            <span className="font-mono text-xs">{selectedCountry.code}</span>
                                                        </div>
                                                        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${showCountryDropdown ? "rotate-180" : ""}`} />
                                                    </button>

                                                    {/* Dropdown */}
                                                    <AnimatePresence>
                                                        {showCountryDropdown && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute top-full left-0 mt-1 w-64 bg-white border border-[var(--border-default)] rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col"
                                                            >
                                                                {/* Search */}
                                                                <div className="p-2 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                                                                    <div className="relative">
                                                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                                        <input 
                                                                            autoFocus
                                                                            type="text"
                                                                            placeholder="Search country..."
                                                                            value={searchQuery}
                                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                                            className="w-full bg-white border border-[var(--border-default)] rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[var(--accent)]"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <ul className="max-h-52 overflow-y-auto py-1">
                                                                    {filteredCountries.length > 0 ? (
                                                                        filteredCountries.map(c => (
                                                                            <li key={`${c.country}-${c.code}`}>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        update("countryCode", c.code);
                                                                                        setShowCountryDropdown(false);
                                                                                        setSearchQuery("");
                                                                                    }}
                                                                                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${form.countryCode === c.code ? "text-[var(--accent)] font-semibold bg-[var(--accent-glow)]" : "text-[var(--text-primary)]"}`}
                                                                                >
                                                                                    <span className="text-base shrink-0">{c.flag}</span>
                                                                                    <span className="flex-1 truncate">{c.country}</span>
                                                                                    <span className="text-[var(--text-muted)] font-mono text-[10px] shrink-0 font-medium">{c.code}</span>
                                                                                </button>
                                                                            </li>
                                                                        ))
                                                                    ) : (
                                                                        <li className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">
                                                                            No country found.
                                                                        </li>
                                                                    )}
                                                                </ul>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Number input */}
                                                <input
                                                    id="contact-phone"
                                                    type="tel"
                                                    placeholder="12345 67890"
                                                    value={form.phone}
                                                    onChange={e => update("phone", e.target.value.replace(/[^\d]/g, ""))}
                                                    className={`input-field flex-1 text-sm ${errors.phone ? "border-[var(--danger)]" : ""}`}
                                                />
                                            </div>
                                            {errors.phone && <p className="text-[11px] text-[var(--danger)] mt-1">{errors.phone}</p>}
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                                                Message
                                            </label>
                                            <textarea
                                                id="contact-message"
                                                rows={4}
                                                placeholder={`Tell us about your needs for the ${plan} plan — team size, use case, expected volume…`}
                                                value={form.message}
                                                onChange={e => update("message", e.target.value)}
                                                className={`input-field text-sm resize-none leading-relaxed ${errors.message ? "border-[var(--danger)]" : ""}`}
                                            />
                                            {errors.message && <p className="text-[11px] text-[var(--danger)] mt-1">{errors.message}</p>}
                                        </div>

                                        {/* Submit */}
                                        <button
                                            id="contact-submit"
                                            type="submit"
                                            disabled={sending}
                                            className="btn-primary w-full flex items-center justify-center gap-2 text-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {sending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending…
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Send Enquiry
                                                </>
                                            )}
                                        </button>

                                        <p className="text-[10px] text-center text-[var(--text-muted)]">
                                            We typically respond within 1 business day.
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
