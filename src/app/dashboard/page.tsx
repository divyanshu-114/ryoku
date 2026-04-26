"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getFaqPack, getDefaultConfig } from "@/lib/faq-packs";
import {
    Loader2,
    ChevronRight,
    ChevronLeft,
    Check,
    Building2,
    ShoppingBag,
    FileText,
    Headphones,
    HelpCircle,
    Upload,
    Plus,
    Trash2,
    ExternalLink,
    Copy,
    Key,
    Zap,
    Settings,
    Bot,
    AlertCircle,
    BarChart3,


    Globe,
    TrendingUp,

    BadgeCheck,
    Rocket,
    Laptop,
    Utensils,
    Stethoscope,
    Home,
    GraduationCap,
    Dumbbell,
    Briefcase,
    AlertTriangle,
} from "lucide-react";

// ── Business Type Config ──
const BUSINESS_TYPES = [
    { id: "ecommerce", label: "E-Commerce", icon: ShoppingBag, desc: "Online retail & marketplace" },
    { id: "saas", label: "SaaS / Tech", icon: Laptop, desc: "Software & technology" },
    { id: "restaurant", label: "Restaurant", icon: Utensils, desc: "Food & beverage" },
    { id: "healthcare", label: "Healthcare", icon: Stethoscope, desc: "Clinics & medical" },
    { id: "realestate", label: "Real Estate", icon: Home, desc: "Property & rental" },
    { id: "education", label: "Education", icon: GraduationCap, desc: "Courses & training" },
    { id: "fitness", label: "Fitness", icon: Dumbbell, desc: "Gyms & wellness" },
    { id: "professional", label: "Professional", icon: Briefcase, desc: "Legal, accounting, etc." },
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number]["id"];

// ── Dynamic questions per business type ──
const BUSINESS_QUESTIONS: Record<BusinessType, { step2: { label: string; placeholder: string; field: string; type: string; options?: string[] }[]; step3: { label: string; placeholder: string; field: string; type: string; options?: string[] }[] }> = {
    ecommerce: {
        step2: [
            { label: "Product Categories", placeholder: "e.g. Electronics, Clothing, Home & Garden", field: "productCategories", type: "text" },
            { label: "Price Range", placeholder: "e.g. $10 - $500", field: "priceRange", type: "text" },
            { label: "Shipping Carriers", placeholder: "e.g. FedEx, UPS, USPS", field: "shippingCarriers", type: "text" },
        ],
        step3: [
            { label: "Return Window (days)", placeholder: "30", field: "returnWindow", type: "select", options: ["7", "14", "30", "60", "90"] },
            { label: "Exchange Policy", placeholder: "Describe your exchange policy...", field: "exchangePolicy", type: "textarea" },
            { label: "Warranty Offered?", placeholder: "", field: "warranty", type: "select", options: ["Yes", "No", "Product-specific"] },
            { label: "Shipping Policy", placeholder: "Describe your shipping policy...", field: "shippingPolicy", type: "textarea" },
        ],
    },
    saas: {
        step2: [
            { label: "Product Description", placeholder: "What does your software do?", field: "productDesc", type: "textarea" },
            { label: "Pricing Tiers", placeholder: "e.g. Free, Pro $29/mo, Enterprise custom", field: "pricingTiers", type: "text" },
            { label: "Free Trial?", placeholder: "", field: "freeTrial", type: "select", options: ["Yes - 7 days", "Yes - 14 days", "Yes - 30 days", "No"] },
        ],
        step3: [
            { label: "Refund Policy", placeholder: "Describe your refund policy...", field: "refundPolicy", type: "textarea" },
            { label: "Common Technical Issues", placeholder: "List common issues users face...", field: "commonIssues", type: "textarea" },
            { label: "API Documentation URL", placeholder: "https://docs.example.com", field: "apiDocsUrl", type: "text" },
        ],
    },
    restaurant: {
        step2: [
            { label: "Cuisine Type", placeholder: "e.g. Italian, Japanese, American", field: "cuisineType", type: "text" },
            { label: "Menu Highlights", placeholder: "Describe your popular dishes...", field: "menuHighlights", type: "textarea" },
            { label: "Delivery Available?", placeholder: "", field: "delivery", type: "select", options: ["Yes - Own delivery", "Yes - Via DoorDash/UberEats", "No - Dine-in only"] },
        ],
        step3: [
            { label: "Reservation Policy", placeholder: "How do customers make reservations?", field: "reservationPolicy", type: "textarea" },
            { label: "Dietary Options", placeholder: "e.g. Vegan, Gluten-free, Halal", field: "dietaryOptions", type: "text" },
            { label: "Peak Hours", placeholder: "e.g. 12-2pm, 6-9pm", field: "peakHours", type: "text" },
        ],
    },
    healthcare: {
        step2: [
            { label: "Services Offered", placeholder: "e.g. General Practice, Dermatology, Dental", field: "services", type: "textarea" },
            { label: "Appointment Types", placeholder: "e.g. In-person, Telehealth, Walk-in", field: "appointmentTypes", type: "text" },
            { label: "Insurance Accepted", placeholder: "e.g. Medicare, Blue Cross, Aetna", field: "insurance", type: "text" },
        ],
        step3: [
            { label: "Emergency Protocols", placeholder: "What should patients do in emergencies?", field: "emergencyProtocol", type: "textarea" },
            { label: "Working Hours", placeholder: "e.g. Mon-Fri 9am-5pm", field: "workingHours", type: "text" },
            { label: "Cancellation Policy", placeholder: "Your cancellation/rescheduling policy...", field: "cancellationPolicy", type: "textarea" },
        ],
    },
    realestate: {
        step2: [
            { label: "Property Types", placeholder: "e.g. Residential, Commercial, Rental", field: "propertyTypes", type: "text" },
            { label: "Service Areas", placeholder: "e.g. New York City, San Francisco Bay Area", field: "serviceAreas", type: "text" },
            { label: "Financing Options", placeholder: "What financing do you help with?", field: "financing", type: "textarea" },
        ],
        step3: [
            { label: "Viewing/Booking Process", placeholder: "How do clients schedule viewings?", field: "viewingProcess", type: "textarea" },
            { label: "Commission Structure", placeholder: "Brief overview of fees...", field: "commission", type: "textarea" },
        ],
    },
    education: {
        step2: [
            { label: "Courses Offered", placeholder: "e.g. Web Development, Data Science, Design", field: "courses", type: "textarea" },
            { label: "Enrollment Process", placeholder: "How do students enroll?", field: "enrollment", type: "textarea" },
            { label: "Certification", placeholder: "", field: "certification", type: "select", options: ["Yes - Accredited", "Yes - Certificate of Completion", "No"] },
        ],
        step3: [
            { label: "Fee Structure", placeholder: "Monthly, per-course, or subscription pricing...", field: "feeStructure", type: "textarea" },
            { label: "Refund Policy", placeholder: "Your refund policy for courses...", field: "refundPolicy", type: "textarea" },
        ],
    },
    fitness: {
        step2: [
            { label: "Class Types", placeholder: "e.g. Yoga, CrossFit, Pilates, Personal Training", field: "classTypes", type: "text" },
            { label: "Membership Tiers", placeholder: "e.g. Basic $29/mo, Premium $59/mo", field: "membershipTiers", type: "text" },
            { label: "Trainer Availability", placeholder: "Number of trainers, specializations...", field: "trainerAvailability", type: "textarea" },
        ],
        step3: [
            { label: "Cancellation Policy", placeholder: "Membership cancellation terms...", field: "cancellationPolicy", type: "textarea" },
            { label: "Trial Offer", placeholder: "Any free trial or first-visit offer?", field: "trialOffer", type: "text" },
        ],
    },
    professional: {
        step2: [
            { label: "Service Areas", placeholder: "e.g. Tax Preparation, Corporate Law, HR Consulting", field: "serviceAreas", type: "textarea" },
            { label: "Pricing Model", placeholder: "e.g. Hourly $200/hr, Flat fee, Retainer", field: "pricingModel", type: "text" },
            { label: "Consultation Booking", placeholder: "How do clients book a consultation?", field: "consultationBooking", type: "textarea" },
        ],
        step3: [
            { label: "Confidentiality Policy", placeholder: "How do you handle client confidentiality?", field: "confidentiality", type: "textarea" },
            { label: "Payment Terms", placeholder: "Net 30, upfront, etc.", field: "paymentTerms", type: "text" },
        ],
    },
};

// ── Types ──
interface FAQ {
    question: string;
    answer: string;
}

interface BusinessConfig {
    businessName: string;
    businessType: BusinessType | "";
    websiteUrl: string;
    welcomeMessage: string;
    accentColor: string;
    // Dynamic fields stored here
    [key: string]: string | FAQ[] | File | null | undefined;
    faqs: FAQ[];
    faqFile: File | null;
}

interface ExistingBusiness {
    id: string;
    slug: string;
    name: string;
    type: string;
    branding: Record<string, unknown>;
    planName?: string;
}

interface BotHealthSummary {
    week: {
        chats: number;
        escalated: number;
        escalationRate: number;
        handledRate: number;
        apiRequests: number;
    };
    topUnansweredQuestions: { id: number; question: string; frequency: number }[];
}

const STEPS = [
    { label: "Business Info", icon: Building2 },
    { label: "Products & Services", icon: ShoppingBag },
    { label: "Policies", icon: FileText },
    { label: "Support Config", icon: Headphones },
    { label: "Knowledge Base", icon: HelpCircle },
];

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchingBusiness, setFetchingBusiness] = useState(true);
    const [existingBusiness, setExistingBusiness] = useState<ExistingBusiness | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState("");
    const [slug, setSlug] = useState("");
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedApi, setCopiedApi] = useState(false);
    const [generatedLink, setGeneratedLink] = useState("");
    const [apiKeysList, setApiKeysList] = useState<{ id: string; keyPrefix: string; name: string; active: boolean; createdAt: string }[]>([]);
    const [newKeyName, setNewKeyName] = useState("");
    const [generatingKey, setGeneratingKey] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState("");
    const [snippetTab, setSnippetTab] = useState<"curl" | "react" | "js">("curl");
    const [copiedSnippet, setCopiedSnippet] = useState(false);
    const [botHealth, setBotHealth] = useState<BotHealthSummary | null>(null);
    const [quickLaunchMode, setQuickLaunchMode] = useState(false);

    // ── Website import / AI FAQ generation ──
    const [scrapeUrl, setScrapeUrl] = useState("");
    const [scrapeLoading, setScrapeLoading] = useState(false);
    const [scrapeError, setScrapeError] = useState("");
    const [draftFaqs, setDraftFaqs] = useState<{ question: string; answer: string; accepted: boolean }[]>([]);
    const [showDraftFaqs, setShowDraftFaqs] = useState(false);
    const [lastScrapedContent, setLastScrapedContent] = useState("");

    const [config, setConfig] = useState<BusinessConfig>({
        businessName: "",
        businessType: "",
        websiteUrl: "",
        welcomeMessage: "Hi! How can I help you?",
        accentColor: "#6366f1",
        faqs: [{ question: "", answer: "" }],
        faqFile: null,
        // Support config
        businessHours: "Mon-Fri 9am-5pm",
        escalationEmail: "",
    });

    // Redirect if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") router.push("/auth/login");
    }, [status, router]);

    // Fetch existing business
    const fetchBusiness = useCallback(async () => {
        try {
            const res = await fetch("/api/profile");
            const data = await res.json();
            if (data.business) {
                setExistingBusiness(data.business);
                setSlug(data.business.slug);
                setGeneratedLink(`${window.location.origin}/chat/${data.business.slug}`);
                
                // Map existing data to config state for editing
                setConfig({
                    businessName: data.business.name || "",
                    businessType: data.business.type || "",
                    websiteUrl: data.business.config?.websiteUrl || "",
                    welcomeMessage: data.business.branding?.welcomeMessage || "Hi! How can I help you?",
                    accentColor: data.business.branding?.accentColor || "#6366f1",
                    faqs: data.business.config?.faqs || [{ question: "", answer: "" }],
                    faqFile: null,
                    businessHours: data.business.config?.businessHours || "Mon-Fri 9am-5pm",
                    escalationEmail: data.business.config?.escalationEmail || "",
                    ...data.business.config // Include any dynamic fields
                });
                setScrapeUrl(data.business.config?.websiteUrl || "");
            }
        } catch {
            // No existing business
        } finally {
            setFetchingBusiness(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user) fetchBusiness();
    }, [session, fetchBusiness]);

    // Fetch API keys when business exists
    const fetchApiKeys = useCallback(async () => {
        try {
            const res = await fetch("/api/keys");
            const data = await res.json();
            if (data.keys) setApiKeysList(data.keys);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (existingBusiness) fetchApiKeys();
    }, [existingBusiness, fetchApiKeys]);

    // Fetch bot health summary
    const fetchBotHealth = useCallback(async () => {
        try {
            const res = await fetch("/api/analytics/summary");
            if (res.ok) {
                const data = await res.json();
                setBotHealth(data);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (existingBusiness) fetchBotHealth();
    }, [existingBusiness, fetchBotHealth]);

    const generateApiKey = async () => {
        setGeneratingKey(true);
        try {
            const res = await fetch("/api/keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newKeyName || "Default" }),
            });
            const data = await res.json();
            if (data.key) {
                setNewlyCreatedKey(data.key);
                setNewKeyName("");
                fetchApiKeys();
            }
        } catch { setError("Failed to generate key"); }
        finally { setGeneratingKey(false); }
    };

    const revokeApiKey = async (keyId: string) => {
        if (!confirm("Revoke this API key?")) return;
        await fetch(`/api/keys?id=${keyId}`, { method: "DELETE" });
        fetchApiKeys();
    };

    // Slug check
    useEffect(() => {
        if (!slug || slug.length < 3) {
            setSlugAvailable(null);
            return;
        }
        const timer = setTimeout(async () => {
            setCheckingSlug(true);
            try {
                const res = await fetch(`/api/check-slug?slug=${slug}&userId=${session?.user?.id || ""}`);
                const data = await res.json();
                setSlugAvailable(data.available);
            } catch {
                //
            } finally {
                setCheckingSlug(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [slug, session?.user?.id]);

    const updateConfig = (field: string, value: string | FAQ[] | File | null) => {
        setConfig((prev) => ({ ...prev, [field]: value }));
    };

    const addFaq = () => {
        updateConfig("faqs", [...config.faqs, { question: "", answer: "" }]);
    };

    const removeFaq = (index: number) => {
        updateConfig("faqs", config.faqs.filter((_, i) => i !== index));
    };

    const updateFaq = (index: number, field: "question" | "answer", value: string) => {
        const updated = [...config.faqs];
        updated[index] = { ...updated[index], [field]: value };
        updateConfig("faqs", updated);
    };

    // ── Website scrape → AI FAQ draft pipeline ──
    const handleScrapeAndGenerate = async (moreArg?: boolean | React.MouseEvent) => {
        const more = moreArg === true;
        if (!scrapeUrl && !lastScrapedContent) return;
        setScrapeLoading(true);
        setScrapeError("");
        if (!more) {
            setDraftFaqs([]);
            setShowDraftFaqs(false);
        }

        try {
            let content = lastScrapedContent;
            
            // Only scrape if we don't have content or if it's a new request (not "more")
            if (!more || !content) {
                const scrapeRes = await fetch("/api/scrape", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: scrapeUrl }),
                });
                const scrapeData = await scrapeRes.json();
                if (!scrapeRes.ok) throw new Error(scrapeData.error || "Scrape failed");
                content = scrapeData.content;
                setLastScrapedContent(content);
            }

            // Step 2: generate FAQs from scraped content
            const genRes = await fetch("/api/generate-faqs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: content,
                    businessType: config.businessType || "general",
                    businessName: config.businessName || "your business",
                    count: 10,
                }),
            });
            const genData = await genRes.json();
            if (!genRes.ok) throw new Error(genData.error || "FAQ generation failed");

            const newFaqs = (genData.faqs || []).map((f: { question: string; answer: string }) => ({ ...f, accepted: true }));
            
            if (more) {
                setDraftFaqs(prev => [...prev, ...newFaqs]);
            } else {
                setDraftFaqs(newFaqs);
                setShowDraftFaqs(true);
            }
        } catch (err) {
            setScrapeError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setScrapeLoading(false);
        }
    };

    const acceptDraftFaqs = () => {
        const accepted = draftFaqs.filter((f) => f.accepted).map(({ question, answer }) => ({ question, answer }));
        if (accepted.length > 0) {
            updateConfig("faqs", [...config.faqs.filter((f) => f.question), ...accepted]);
        }
        setShowDraftFaqs(false);
        setDraftFaqs([]);
        setScrapeUrl("");
    };

    // ── Quick Launch: skip wizard, use smart defaults + FAQ pack ──
    const handleQuickLaunch = async () => {
        if (!config.businessName || !config.businessType || !slug || slugAvailable === false) return;
        const defaults = getDefaultConfig(config.businessType as string);
        const faqPack = getFaqPack(config.businessType as string);
        const quickConfig = {
            ...config,
            ...defaults,
            faqs: faqPack.length > 0 ? faqPack : config.faqs,
        };
        setLoading(true);
        setError("");
        const formData = new FormData();
        formData.append("slug", slug);
        formData.append("config", JSON.stringify(quickConfig));
        try {
            const res = await fetch("/api/ingest", { method: "POST", body: formData });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to generate chatbot");
            }
            await fetchBusiness();
            setIsEditing(false);
            setGeneratedLink(`${window.location.origin}/chat/${slug}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("slug", slug);
        formData.append("config", JSON.stringify(config));
        if (config.faqFile) formData.append("faqFile", config.faqFile);

        try {
            const res = await fetch("/api/ingest", { method: "POST", body: formData });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to generate chatbot");
            }
            await fetchBusiness();
            setIsEditing(false);
            setGeneratedLink(`${window.location.origin}/chat/${slug}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete your chatbot? This cannot be undone.")) return;
        setLoading(true);
        try {
            await fetch("/api/profile", { method: "DELETE" });
            setExistingBusiness(null);
            setGeneratedLink("");
            setSlug("");
            setConfig({
                businessName: "",
                businessType: "",
                websiteUrl: "",
                welcomeMessage: "Hi! How can I help you?",
                accentColor: "#6366f1",
                faqs: [{ question: "", answer: "" }],
                faqFile: null,
                businessHours: "Mon-Fri 9am-5pm",
                escalationEmail: "",
            });
        } catch {
            setError("Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading" || fetchingBusiness) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    const businessType = config.businessType as BusinessType;
    const questions = businessType ? BUSINESS_QUESTIONS[businessType] : null;

    // ── Render Step Content ──
    const renderStep = () => {
        switch (step) {
            case 0: // Business Info
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
                        {/* Left Column: Core Details */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Business Name *</label>
                                <input
                                    className="input-field"
                                    placeholder="Your Business Name"
                                    value={config.businessName}
                                    onChange={(e) => updateConfig("businessName", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Website URL</label>
                                <input
                                    className="input-field"
                                    placeholder="https://yourbusiness.com"
                                    value={config.websiteUrl}
                                    onChange={(e) => updateConfig("websiteUrl", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Chat Handle *</label>
                                <div className="relative">
                                    <input
                                        className="input-field pr-20"
                                        placeholder="your-business"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {checkingSlug ? (
                                            <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                                        ) : slugAvailable === true ? (
                                            <span className="text-[10px] font-bold text-[var(--success)] uppercase">Available</span>
                                        ) : slugAvailable === false ? (
                                            <span className="text-[10px] font-bold text-[var(--danger)] uppercase">Taken</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Business Type */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Business Type *</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {BUSINESS_TYPES.map((bt) => (
                                    <button
                                        key={bt.id}
                                        onClick={() => updateConfig("businessType", bt.id)}
                                        className={`p-3 rounded-xl text-left ${config.businessType === bt.id
                                            ? "ring-2 ring-[var(--accent)] bg-[var(--accent-glow)]"
                                            : "bg-[var(--bg-card)]"
                                            }`}
                                        style={{ border: config.businessType === bt.id ? "1px solid var(--accent)" : "1px solid var(--border-subtle)" }}
                                    >
                                        <bt.icon className="w-5 h-5 text-[var(--accent)] mb-2" />
                                        <p className="text-xs font-medium text-[var(--text-primary)]">{bt.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 1: // Products & Services (dynamic)
                return (
                    <div>
                        {!questions ? (
                            <p className="text-[var(--text-secondary)] text-sm">Please select a business type in Step 1.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {questions.step2.map((q) => (
                                    <div key={q.field}>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{q.label}</label>
                                        {q.type === "textarea" ? (
                                            <textarea
                                                className="input-field min-h-[60px] resize-y"
                                                placeholder={q.placeholder}
                                                value={(config[q.field] as string) || ""}
                                                onChange={(e) => updateConfig(q.field, e.target.value)}
                                            />
                                        ) : q.type === "select" ? (
                                            <select
                                                className="input-field"
                                                value={(config[q.field] as string) || ""}
                                                onChange={(e) => updateConfig(q.field, e.target.value)}
                                            >
                                                <option value="">Select...</option>
                                                {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                className="input-field"
                                                placeholder={q.placeholder}
                                                value={(config[q.field] as string) || ""}
                                                onChange={(e) => updateConfig(q.field, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 2: // Policies (dynamic)
                return (
                    <div>
                        {!questions ? (
                            <p className="text-[var(--text-secondary)] text-sm">Please select a business type in Step 1.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {questions.step3.map((q) => (
                                    <div key={q.field}>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{q.label}</label>
                                        {q.type === "textarea" ? (
                                            <textarea
                                                className="input-field min-h-[60px] resize-y"
                                                placeholder={q.placeholder}
                                                value={(config[q.field] as string) || ""}
                                                onChange={(e) => updateConfig(q.field, e.target.value)}
                                            />
                                        ) : q.type === "select" ? (
                                            <select
                                                className="input-field"
                                                value={(config[q.field] as string) || ""}
                                                onChange={(e) => updateConfig(q.field, e.target.value)}
                                            >
                                                <option value="">Select...</option>
                                                {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                className="input-field"
                                                placeholder={q.placeholder}
                                                value={(config[q.field] as string) || ""}
                                                onChange={(e) => updateConfig(q.field, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 3: // Support Config
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Business Hours</label>
                            <input
                                className="input-field"
                                placeholder="Mon-Fri 9am-5pm"
                                value={(config.businessHours as string) || ""}
                                onChange={(e) => updateConfig("businessHours", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Escalation Email</label>
                            <input
                                className="input-field"
                                type="email"
                                placeholder="support@yourbusiness.com"
                                value={(config.escalationEmail as string) || ""}
                                onChange={(e) => updateConfig("escalationEmail", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Welcome Message</label>
                            <input
                                className="input-field"
                                placeholder="Hi! How can I help you?"
                                value={config.welcomeMessage}
                                onChange={(e) => updateConfig("welcomeMessage", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Accent Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={config.accentColor}
                                    onChange={(e) => updateConfig("accentColor", e.target.value)}
                                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                                />
                                <span className="text-sm text-[var(--text-muted)]">{config.accentColor}</span>
                            </div>
                        </div>
                    </div>
                );

            case 4: // Knowledge Base
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Automated Ingestion */}
                        <div className="space-y-6">
                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Upload FAQ Document (PDF / DOCX)
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx,.doc"
                                        onChange={(e) => updateConfig("faqFile", e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="faq-upload"
                                    />
                                    <label
                                        htmlFor="faq-upload"
                                        className="flex items-center justify-center gap-3 p-6 rounded-xl cursor-pointer"
                                        style={{ background: "var(--bg-card)", border: "2px dashed var(--border-default)" }}
                                    >
                                        <Upload className="w-5 h-5 text-[var(--accent-light)]" />
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            {config.faqFile ? (config.faqFile as File).name : "Click to upload PDF or DOCX"}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* ── Import from Website ── */}
                            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                                <div className="px-4 py-3 flex items-center gap-2" style={{ background: "var(--bg-card)" }}>
                                    <Globe className="w-4 h-4 text-[var(--accent)]" />
                                    <span className="text-xs font-semibold text-[var(--text-primary)]">Import from Website</span>
                                </div>
                                <div className="p-4 space-y-3" style={{ background: "var(--bg-primary)" }}>
                                    <div className="flex gap-2">
                                        <input
                                            className="input-field text-sm flex-1"
                                            placeholder="https://yourbusiness.com"
                                            value={scrapeUrl}
                                            onChange={(e) => { setScrapeUrl(e.target.value); setScrapeError(""); }}
                                            onKeyDown={(e) => e.key === "Enter" && handleScrapeAndGenerate()}
                                        />
                                        <button
                                            onClick={handleScrapeAndGenerate}
                                            disabled={scrapeLoading || !scrapeUrl}
                                            className="btn-primary py-2 px-3 text-xs flex items-center gap-2 whitespace-nowrap disabled:opacity-40"
                                        >
                                            {scrapeLoading
                                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading…</>
                                                : <><Zap className="w-3.5 h-3.5" /> Generate</>
                                            }
                                        </button>
                                    </div>
                                    {scrapeError && (
                                        <p className="text-xs text-[var(--danger)] flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {scrapeError}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-[var(--text-muted)]">
                                        AI reads your site and drafts up to 10 Q&As automatically.
                                    </p>
                                </div>
                            </div>

                            {/* ── AI-Drafted FAQ Review ── */}
                            {showDraftFaqs && draftFaqs.length > 0 && (
                                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(74,222,128,0.3)" }}>
                                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(74,222,128,0.06)" }}>
                                        <BadgeCheck className="w-4 h-4 text-[var(--success)]" />
                                        <span className="text-xs font-semibold text-[var(--success)]">
                                            {draftFaqs.filter(f => f.accepted).length} AI-drafted Q&As
                                        </span>
                                    </div>
                                    <div className="divide-y max-h-[200px] overflow-y-auto" style={{ borderColor: "rgba(74,222,128,0.1)" }}>
                                        {draftFaqs.map((faq, i) => (
                                            <div
                                                key={i}
                                                className="p-3 flex items-start gap-3 transition-colors"
                                                style={{ background: faq.accepted ? "rgba(74,222,128,0.03)" : "var(--bg-primary)", opacity: faq.accepted ? 1 : 0.45 }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={faq.accepted}
                                                    onChange={() => setDraftFaqs(prev => prev.map((f, j) => j === i ? { ...f, accepted: !f.accepted } : f))}
                                                    className="mt-1 accent-[var(--accent)] cursor-pointer w-3.5 h-3.5 shrink-0"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{faq.question}</p>
                                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{faq.answer}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 flex gap-3" style={{ background: "var(--bg-card)", borderTop: "1px solid rgba(74,222,128,0.1)" }}>
                                        <button
                                            onClick={acceptDraftFaqs}
                                            disabled={draftFaqs.filter(f => f.accepted).length === 0}
                                            className="btn-primary py-1.5 px-4 text-xs flex items-center gap-2 disabled:opacity-40"
                                        >
                                            <Check className="w-3.5 h-3.5" /> Load Selected
                                        </button>
                                        <button
                                            onClick={() => handleScrapeAndGenerate(true)}
                                            disabled={scrapeLoading}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-light)] border border-[var(--border-subtle)] bg-white hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40"
                                        >
                                            {scrapeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Generate 10 More"}
                                        </button>
                                        <button
                                            onClick={() => { setShowDraftFaqs(false); setDraftFaqs([]); setLastScrapedContent(""); }}
                                            className="btn-secondary py-1.5 px-3 text-xs"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Starter FAQ Pack */}
                            {config.businessType && getFaqPack(config.businessType as string).length > 0 && config.faqs.length <= 1 && !config.faqs[0]?.question && (
                                <div className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <BadgeCheck className="w-4 h-4 text-[var(--accent)]" />
                                            <span className="text-xs font-semibold text-[var(--accent-light)]">Starter Pack</span>
                                        </div>
                                        <button
                                            onClick={() => updateConfig("faqs", getFaqPack(config.businessType as string))}
                                            className="text-xs font-bold text-[var(--accent)] cursor-pointer"
                                        >
                                            Load {getFaqPack(config.businessType as string).length} Qs →
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-muted)]">Pre-written Q&As for your industry.</p>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Manual FAQs */}
                        <div className="flex flex-col max-h-[60vh] lg:max-h-[500px]">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Custom Q&A Pairs</label>
                                <button onClick={addFaq} className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-light)] cursor-pointer">
                                    <Plus className="w-3.5 h-3.5" /> Add Question
                                </button>
                            </div>
                            <div className="space-y-4 overflow-y-auto pr-2 flex-1 pb-4">
                                {config.faqs.map((faq, i) => (
                                    <div key={i} className="p-4 rounded-xl space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                        <div className="flex items-start justify-between gap-2">
                                            <input
                                                className="input-field text-sm"
                                                placeholder="Question (e.g. What is your shipping time?)"
                                                value={faq.question}
                                                onChange={(e) => updateFaq(i, "question", e.target.value)}
                                            />
                                            {config.faqs.length > 1 && (
                                                <button onClick={() => removeFaq(i)} className="p-2 text-[var(--text-muted)] cursor-pointer">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <textarea
                                            className="input-field text-sm min-h-[80px] resize-y"
                                            placeholder="Answer..."
                                            value={faq.answer}
                                            onChange={(e) => updateFaq(i, "answer", e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // ── Existing Business View ──
    if (existingBusiness && !isEditing) {
        const chatLink = generatedLink;
        const apiEndpoint = `${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/chat/${existingBusiness.slug}`;

        return (
            <main className="h-[100dvh] ambient-grid relative overflow-hidden flex flex-col">
                <div className="max-w-6xl mx-auto w-full relative z-10 flex-1 overflow-y-auto pt-20 px-4 pb-10 space-y-8 scroll-smooth">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Bot className="w-4 h-4 text-[var(--accent)]" />
                                <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Dashboard</span>
                            </div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{existingBusiness.name}</h1>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Your AI customer service bot is live</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditing(true)} className="btn-secondary text-xs py-2.5 px-5 flex items-center gap-2">
                                <Settings className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={handleDelete} className="btn-secondary text-xs py-2.5 px-5 text-[var(--danger)]">
                                Delete
                            </button>
                        </div>
                    </div>

                    {/* Status Card */}
                    <div className="glass-card p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)]" />
                            <span className="text-sm font-semibold text-[var(--success)]">Bot Online</span>
                            <span className="text-xs text-[var(--text-muted)] ml-auto uppercase">{existingBusiness.type}</span>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <a href={chatLink} target="_blank" rel="noopener noreferrer" className="btn-primary py-3 px-6 flex items-center gap-2 text-sm">
                                <ExternalLink className="w-4 h-4" /> Launch Chat
                            </a>
                            <button
                                onClick={() => { navigator.clipboard.writeText(chatLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                                className="btn-secondary py-3 px-6 flex items-center gap-2 text-sm"
                            >
                                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copiedLink ? "Copied!" : "Copy Link"}
                            </button>
                        </div>
                    </div>

                    {/* ── Bot Health Card ── */}
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                                <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Bot Health · Last 7 Days</span>
                            </div>
                            <button onClick={() => router.push("/dashboard/analytics")} className="text-xs font-medium text-[var(--text-muted)] cursor-pointer">
                                Full analytics →
                            </button>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{botHealth?.week.chats ?? "—"}</p>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Chats handled</p>
                            </div>
                            <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                <p className="text-2xl font-bold" style={{ color: (botHealth?.week.handledRate ?? 100) > 80 ? "var(--success)" : "var(--warning)" }}>
                                    {botHealth ? `${botHealth.week.handledRate}%` : "—"}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Handled by AI</p>
                            </div>
                        </div>

                        {botHealth && botHealth.week.chats === 0 && (
                            <p className="text-xs text-[var(--text-muted)] text-center py-2">No chats yet this week. Share your bot link to get started!</p>
                        )}
                    </div>

                    {/* Navigation Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics", desc: "Performance & CSAT", free: true },
                            { href: "/dashboard/agent", icon: Headphones, label: "Agent Workspace", desc: "Live chat & handoff", free: true },
                        ].filter(item => item.free || (existingBusiness?.planName?.toLowerCase() === "paid")).map(({ href, icon: Icon, label, desc }) => (
                            <button
                                key={href}
                                onClick={() => router.push(href)}
                                className="glass-card p-4 flex items-center gap-3 text-left border border-[var(--border-subtle)] cursor-pointer"
                            >
                                <Icon className="w-5 h-5 text-[var(--accent)] shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate">{desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* API Endpoint */}
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Headless API</span>
                        </div>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            <code className="flex-1 text-xs p-3 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)] break-all" style={{ border: "1px solid var(--border-subtle)" }}>
                                POST {apiEndpoint}
                            </code>
                            <button
                                onClick={() => { navigator.clipboard.writeText(apiEndpoint); setCopiedApi(true); setTimeout(() => setCopiedApi(false), 2000); }}
                                className="text-xs font-semibold text-[var(--accent-light)] cursor-pointer"
                            >
                                {copiedApi ? "Copied!" : "[ Copy ]"}
                            </button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                            Send POST requests with <code className="text-[var(--accent-light)]">{`{ "messages": [...] }`}</code> body. Add <code className="text-[var(--accent-light)]">Authorization: Bearer rk_...</code> header.
                        </p>
                    </div>

                    {/* API Key Management */}
                    <div className="glass-card p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-[var(--accent)]" />
                                <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">API Keys</span>
                            </div>
                        </div>

                        {/* Generate new key */}
                        <div className="flex gap-3">
                            <input
                                className="input-field text-sm flex-1"
                                placeholder="Key name (e.g. Production)"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                            />
                            <button
                                onClick={generateApiKey}
                                disabled={generatingKey}
                                className="btn-primary py-2 px-4 text-xs flex items-center gap-2 whitespace-nowrap"
                            >
                                {generatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Generate Key
                            </button>
                        </div>

                        {/* Newly created key warning */}
                        {newlyCreatedKey && (
                            <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                <p className="text-xs font-semibold text-[var(--success)] flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Save this key — it won&apos;t be shown again!
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs text-[var(--text-primary)] bg-[var(--bg-primary)] p-2 rounded flex-1 break-all" style={{ border: "1px solid var(--border-subtle)" }}>
                                        {newlyCreatedKey}
                                    </code>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(newlyCreatedKey); }}
                                        className="text-xs text-[var(--accent-light)] cursor-pointer"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Key list */}
                        {apiKeysList.length > 0 && (
                            <div className="space-y-2">
                                {apiKeysList.filter(k => k.active).map((k) => (
                                    <div key={k.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                        <div>
                                            <span className="text-sm text-[var(--text-primary)] font-medium">{k.name}</span>
                                            <code className="text-xs text-[var(--text-muted)] ml-3">{k.keyPrefix}</code>
                                        </div>
                                        <button
                                            onClick={() => revokeApiKey(k.id)}
                                            className="text-xs text-[var(--danger)] cursor-pointer"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Code Snippets */}
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">Integration Snippets</span>
                        </div>
                        <div className="flex gap-2 mb-4">
                            {(["curl", "react", "js"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setSnippetTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-xs font-medium ${
                                        snippetTab === tab
                                            ? "bg-[var(--accent-glow)] text-[var(--accent-light)] ring-1 ring-[var(--accent)]"
                                            : "text-[var(--text-muted)]"
                                    }`}
                                >
                                    {tab === "curl" ? "cURL" : tab === "react" ? "React" : "Vanilla JS"}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <pre className="text-xs p-4 rounded-xl overflow-x-auto" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                                {snippetTab === "curl" && `curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'`}
                                {snippetTab === "react" && `import { useChat } from "@ai-sdk/react";

function Chat() {
  const { messages, sendMessage, status } = useChat({
    api: "${apiEndpoint}",
    headers: { Authorization: "Bearer YOUR_API_KEY" },
  });
  // Render messages...
}`}
                                {snippetTab === "js" && `const response = await fetch("${apiEndpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }],
  }),
});
const reader = response.body.getReader();
// Read streaming response...`}
                            </pre>
                            <button
                                onClick={() => {
                                    const text = snippetTab === "curl"
                                        ? `curl -X POST ${apiEndpoint} -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_API_KEY" -d '{"messages": [{"role": "user", "content": "Hello!"}]}'`
                                        : snippetTab === "react"
                                        ? `import { useChat } from "@ai-sdk/react";\nfunction Chat() { const { messages, sendMessage } = useChat({ api: "${apiEndpoint}" }); }`
                                        : `fetch("${apiEndpoint}", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer YOUR_API_KEY" }, body: JSON.stringify({ messages: [{ role: "user", content: "Hello!" }] }) })`;
                                    navigator.clipboard.writeText(text);
                                    setCopiedSnippet(true);
                                    setTimeout(() => setCopiedSnippet(false), 2000);
                                }}
                                className="absolute top-3 right-3 text-xs text-[var(--accent-light)] cursor-pointer"
                            >
                                {copiedSnippet ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Chat Preview removed */}
                </div>
            </main>
        );
    }

    // ── Loading Overlay ──
    // ── Onboarding Wizard ──
    return (
        <main className="h-[100dvh] ambient-grid relative overflow-hidden flex flex-col">
            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
                        style={{ background: "rgba(6,8,15,0.95)", backdropFilter: "blur(4px)" }}
                    >
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Zap className="w-8 h-8 text-[var(--accent)]" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Building Your AI Agent</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Generating persona & knowledge base...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto pt-20 px-4 pb-20 scroll-smooth">
                <div className="max-w-6xl mx-auto w-full relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wider">
                            {isEditing ? "Edit Bot" : "Setup Wizard"}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                        {isEditing ? "Update Your Chatbot" : "Create Your AI Chatbot"}
                    </h1>
                    {!isEditing && (
                        <p className="text-sm text-[var(--text-muted)] mt-2">
                            Fill in the steps below, or{" "}
                            <button
                                onClick={() => setQuickLaunchMode(true)}
                                className="text-[var(--accent-light)] font-semibold cursor-pointer"
                            >
                                use Quick Launch
                            </button>{" "}
                            to go live in under 2 minutes.
                        </p>
                    )}
                </div>

                {/* Quick Launch Panel */}
                {quickLaunchMode && !isEditing && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 mb-6"
                        style={{ border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.06)" }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Rocket className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-sm font-bold text-[var(--text-primary)]">Quick Launch</span>
                            <span className="ml-auto text-[10px] bg-[var(--accent)] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">2 min setup</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-4">
                            Fill in Step 1 (Business Info + Handle), then hit &ldquo;Launch Now&rdquo;. We&apos;ll pre-fill your policies, welcome message, and industry-specific Q&As. You can customize everything after.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleQuickLaunch}
                                disabled={loading || !config.businessName || !config.businessType || !slug || slugAvailable === false}
                                className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2 disabled:opacity-30"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                Launch Now
                            </button>
                            <button
                                onClick={() => setQuickLaunchMode(false)}
                                className="btn-secondary py-2.5 px-4 text-sm"
                            >
                                Use full wizard instead
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step Indicator - Sticky */}
                <div className="sticky top-14 z-30 mb-10 -mx-4 px-4 py-3" style={{ 
                    background: "rgba(255, 255, 255, 0.7)", 
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderBottom: "1px solid var(--border-subtle)"
                }}>
                    <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
                        {STEPS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => setStep(i)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${step === i
                                    ? "bg-[var(--accent)] text-white"
                                    : i < step
                                        ? "text-[var(--success)]"
                                        : "text-[var(--text-muted)]"
                                    }`}
                            >
                                {i < step ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                                <span className="whitespace-nowrap">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="glass-card p-8 mb-8"
                    >
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            {(() => { const Icon = STEPS[step].icon; return <Icon className="w-5 h-5 text-[var(--accent)]" />; })()}
                            {STEPS[step].label}
                        </h2>
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-3 p-4 rounded-xl mb-6 bg-[var(--danger)]/10" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
                        <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />
                        <p className="text-sm text-[var(--danger)]">{error}</p>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                    <button
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        className="btn-secondary py-3 px-6 flex items-center gap-2 text-sm disabled:opacity-30"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="btn-primary py-3 px-6 flex items-center gap-2 text-sm"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !config.businessName || !config.businessType || !slug || slugAvailable === false}
                            className="btn-primary py-3 px-8 flex items-center gap-2 text-sm disabled:opacity-30"
                        >
                            <Zap className="w-4 h-4" />
                            {isEditing ? "Update Bot" : "Generate Bot"}
                        </button>
                    )}
                    </div>
                </div>
            </div>
        </main>
    );
}
