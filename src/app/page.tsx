"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight, ArrowRight, ShieldCheck, Zap, Globe, MessageSquare, BarChart3, RefreshCcw, Box } from "lucide-react";
import { ContactDialog } from "@/components/ContactDialog";

// ── Components ──

const LetterReveal = ({ text, className, style, delay = 0 }: { text: string, className?: string, style?: React.CSSProperties, delay?: number }) => {
  const letters = Array.from(text);
  return (
    <span className={className} style={style}>
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.8,
            delay: delay + (i * 0.03),
            ease: [0.22, 1, 0.36, 1]
          }}
          style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : "normal" }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
};

const AmbientBlobs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-[20%] -left-[10%] w-[30vw] h-[30vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.05)_0%,transparent_70%)] animate-blob" />
    <div className="absolute -bottom-[20%] -right-[10%] w-[30vw] h-[30vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.05)_0%,transparent_70%)] animate-blob" style={{ animationDelay: "-5s" }} />
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stagger: any = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const AmbientAgentActivity = () => {
  const activities = [
    { id: 1, type: "msg", role: "user", text: "How do I return my order #4209?", delay: 0, x: "10%", y: "15%", scale: 0.9 },
    { id: 2, type: "action", label: "Searching Knowledge Base", icon: <Globe className="w-3 h-3" />, delay: 2, x: "70%", y: "10%", scale: 0.85 },
    { id: 3, type: "msg", role: "agent", text: "I can help with that! Looking up your order...", delay: 4, x: "15%", y: "40%", scale: 1 },
    { id: 4, type: "action", label: "Connecting to Shopify API", icon: <Zap className="w-3 h-3" />, delay: 6, x: "80%", y: "35%", scale: 0.8 },
    { id: 5, type: "msg", role: "user", text: "Can I get a refund to my original card?", delay: 8, x: "12%", y: "65%", scale: 0.9 },
    { id: 6, type: "action", label: "Processing Refund Request", icon: <RefreshCcw className="w-3 h-3" />, delay: 10, x: "75%", y: "70%", scale: 0.95 },
    { id: 7, type: "msg", role: "agent", text: "Refund initiated! You'll see it in 3-5 days.", delay: 12, x: "20%", y: "85%", scale: 1.05 },
    { id: 8, type: "action", label: "Handoff to Human Agent", icon: <MessageSquare className="w-3 h-3" />, delay: 14, x: "85%", y: "60%", scale: 0.85 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {activities.map((act) => (
        <motion.div
          key={act.id}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: act.scale,
            y: [0, -80],
            x: [0, (Math.random() - 0.5) * 80],
          }}
          transition={{
            duration: 12,
            delay: act.delay,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut",
          }}
          style={{ left: act.x, top: act.y }}
          className="absolute z-0"
        >
          {act.type === "msg" ? (
            <div
              className={`px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-2xl border ${
                act.role === "agent"
                  ? "bg-white/70 text-[var(--text-primary)] border-[var(--accent)]/10"
                  : "bg-[var(--accent)] text-white border-white/10"
              } max-w-[240px] opacity-80`}
            >
              <p className="text-[10px] md:text-[11px] font-bold leading-relaxed tracking-tight">
                {act.text}
              </p>
              <div className="mt-2 flex items-center gap-1.5 opacity-40">
                <div className={`w-1 h-1 rounded-full ${act.role === 'agent' ? 'bg-[var(--accent)]' : 'bg-white'}`} />
                <span className={`text-[8px] uppercase font-black tracking-widest ${act.role === 'agent' ? 'text-[var(--accent)]' : 'text-white'}`}>
                  {act.role === "agent" ? "Ryoku AI" : "Customer"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/30 border border-[var(--accent)]/5 backdrop-blur-md shadow-xl opacity-60">
              <div className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                {act.icon}
              </div>
              <span className="text-[9px] font-bold text-[var(--text-primary)] opacity-60 uppercase tracking-widest">
                {act.label}
              </span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default function LandingPage() {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";

      if (!window.location.hash) {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  return (
    <main className="bg-white selection:bg-[var(--accent)] selection:text-white relative">
      <AmbientBlobs />
      {/* ── HERO ── */}
      <section className="relative w-full min-h-[100dvh] lg:min-h-screen flex flex-col justify-center snap-start py-16 px-4 sm:px-8 md:px-14 lg:px-20 max-w-[1400px] mx-auto overflow-hidden">
        {/* Ambient Agent Activity Visual - Outer Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden md:block">
          <AmbientAgentActivity />
        </div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="flex flex-col items-center text-center relative z-10 w-full"
        >
          {/* eyebrow */}
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-6"
          >
            Ryoku — One-Click Chatbots
          </motion.p>

          {/* headline unit */}
          <motion.div variants={fadeUp} className="max-w-5xl mb-8 relative flex flex-col items-center">
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
              className="text-[clamp(2.5rem,7vw,5.5rem)] font-black text-[var(--text-primary)] relative z-10"
            >
              <LetterReveal text="Chatbots" delay={0.2} />
              <br />
              <span className="italic text-[var(--accent)]">
                <LetterReveal text="for Your Business" delay={0.5} />
              </span>
              <br />
              <span
                style={{
                  WebkitTextStroke: "1.5px var(--text-primary)",
                  color: "transparent",
                }}
              >
                <LetterReveal text="in minutes" delay={0.8} />
              </span>
            </h1>
          </motion.div>

          {/* description + CTA unit */}
          <motion.div variants={fadeUp} className="max-w-2xl flex flex-col items-center">
            <p
              className="text-[1.1rem] md:text-[1.25rem] text-[var(--text-secondary)] leading-relaxed mb-10 drop-shadow-sm font-medium"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              An AI agent trained on your business — answers FAQs, handles
              returns, hands off to humans. Built for the way real customers actually talk.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/auth/login" className="w-full sm:w-auto">
                <button className="group relative w-full inline-flex items-center justify-center gap-3 bg-[var(--text-primary)] text-white px-10 py-5 font-bold text-sm tracking-widest uppercase transition-all hover:bg-[var(--accent)] shadow-2xl shadow-indigo-500/10 hover:shadow-indigo-500/20 min-h-[60px]">
                  Start for free
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto">
                <button className="w-full inline-flex items-center justify-center gap-2 px-10 py-5 text-sm font-bold tracking-widest uppercase text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all min-h-[60px] bg-white/50 backdrop-blur-md">
                  Explore how it works
                </button>
              </Link>
            </div>

            {/* small proof strip */}
            <div className="mt-10 md:mt-12 flex items-center justify-center gap-4 md:gap-8 opacity-60">
              <div className="w-8 md:w-12 h-[1px] bg-gradient-to-r from-transparent to-[var(--border-default)]" />
              <span className="text-[10px] sm:text-[11px] font-black tracking-[0.2em] uppercase text-[var(--text-muted)]">
                Free tier · No card required
              </span>
              <div className="w-8 md:w-12 h-[1px] bg-gradient-to-l from-transparent to-[var(--border-default)]" />
            </div>
          </motion.div>
        </motion.div>
      </section>



      {/* ── MARQUEE STRIP ── */}
      <div className="snap-center border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-hidden py-4 w-full">
        <div className="flex animate-marquee whitespace-nowrap gap-0 items-center">
          {[...Array(4)].map((_, iter) => (
            <div key={iter} className="flex items-center gap-8 px-8">
              {[
                "FAQ Answering",
                "Agent Handoff",
                "Return Processing",
                "Website Crawling",
                "Multi-Language",
                "Analytics Dashboard",
                "Custom AI Persona",
                "Seamless API",
                "Privacy-First",
              ].map((item) => (
                <span
                  key={item}
                  className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center"
                >
                  {item}{" "}
                  <span className="mx-6 text-[var(--accent)] shadow-sm">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── WHAT WE DO ── */}
      <section
        aria-label="Features overview"
        className="min-h-auto lg:min-h-screen flex flex-col justify-center snap-start py-16 md:py-24 lg:py-36 px-4 sm:px-8 md:px-14 lg:px-20 max-w-[1400px] mx-auto w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-16">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
              What we do
            </p>
            <div className="w-8 h-[1px] bg-[var(--border-default)]" />
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="space-y-0 relative"
          >
            <div className="absolute left-6 md:left-8 top-12 bottom-12 w-[1px] bg-[var(--border-subtle)] hidden lg:block" />
            {[
              {
                n: "01",
                icon: <MessageSquare className="w-6 h-6" />,
                title: "Understands your business",
                body: "Point us to your website URL or upload your docs. Ryoku crawls your pages to train an agent that answers like a team member — not a generic bot.",
              },
              {
                n: "02",
                icon: <RefreshCcw className="w-6 h-6" />,
                title: "Takes real action",
                body: "On paid plans, the agent can file returns and trigger refunds through your own payment system. No fake 'I'll escalate this' responses.",
              },
              {
                n: "03",
                icon: <ShieldCheck className="w-6 h-6" />,
                title: "Hands off gracefully",
                body: "When a customer needs a real person, the agent transfers the full conversation with context — no repeating themselves from the start.",
              },
            ].map((item) => (
              <motion.div
                key={item.n}
                variants={fadeUp}
                className="grid grid-cols-[48px_1fr] md:grid-cols-[80px_1fr] gap-4 md:gap-8 py-8 md:py-10 group hover:pl-2 transition-all duration-300 relative bg-white"
              >
                <div className="flex flex-col items-center gap-2 pt-1">
                  <span className="text-[11px] md:text-sm font-bold text-[var(--text-muted)] tracking-widest font-mono z-10">
                    {item.n}
                  </span>
                  <div className="w-px h-10 md:h-12 bg-gradient-to-b from-[var(--border-default)] to-transparent" />
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-3 md:mb-4 text-[var(--accent)] opacity-40 group-hover:opacity-100 transition-opacity">
                    {item.icon}
                  </div>
                  <h3
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    className="text-xl md:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-4 md:mb-5 italic group-hover:text-[var(--accent)] transition-colors duration-300"
                  >
                    {item.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-[1rem] md:text-[1.05rem] leading-relaxed max-w-xl">
                    {item.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        aria-label="How it works"
        className="w-full min-h-auto lg:min-h-screen flex flex-col justify-center snap-start bg-[var(--text-primary)] py-16 md:py-24 lg:py-36 px-4 sm:px-8 md:px-14 lg:px-20 overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-[1400px] mx-auto relative z-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 lg:gap-16 mb-24">
            <motion.div variants={fadeUp}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
                Getting started
              </p>
              <div className="w-8 h-[1px] bg-white/20" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight lg:leading-[1.1]"
            >
              From setup to
              <br />
              <span className="italic text-white">serving customers</span>
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/10 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {[
              {
                n: "1",
                title: "Set up your knowledge base",
                body: "Upload FAQs, policies, product info. Configure what your agent can and can't do.",
              },
              {
                n: "2",
                title: "AI learns your business",
                body: "Ryoku trains on your content and wires up the appropriate action tools based on your plan.",
              },
              {
                n: "3",
                title: "Go live, handle customers",
                body: "Share a link or integrate via API. Your agent starts responding to real queries immediately.",
              },
            ].map((s) => (
              <motion.div
                key={s.n}
                variants={fadeUp}
                className="p-10 md:p-14 relative group hover:bg-white/[0.03] transition-colors duration-500 overflow-hidden"
              >
                <span
                  className="absolute top-2 right-6 text-[8rem] font-black text-white/[0.02] leading-none select-none pointer-events-none group-hover:text-white/[0.06] transition-colors duration-500 group-hover:-translate-y-2 transform"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {s.n}
                </span>
                <p className="text-[var(--accent)] font-bold text-[11px] uppercase tracking-widest mb-6 border border-[var(--accent)]/30 inline-block px-3 py-1 rounded-full">{`Step ${s.n}`}</p>
                <h3
                  className="text-white text-xl md:text-2xl font-bold mb-4 leading-snug"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {s.title}
                </h3>
                <p className="text-white/60 text-[1rem] leading-relaxed">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section
        id="features"
        aria-label="Capabilities"
        className="w-full flex flex-col justify-center snap-start py-12 md:py-16 lg:py-20 px-4 sm:px-8 md:px-14 lg:px-20 max-w-[1400px] mx-auto"
      >
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 mb-10 lg:mb-12">
            <motion.div variants={fadeUp}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
                Capabilities
              </p>
              <div className="w-8 h-[1px] bg-[var(--border-default)]" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-3xl md:text-4xl lg:text-[3.5rem] font-black text-[var(--text-primary)] leading-tight lg:leading-[1.1]"
            >
              Not just a chatbot —<br className="hidden sm:block" />
              <span className="italic">an agent that acts.</span>
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 bg-transparent">
            {[
              {
                label: "FAQ Answering",
                note: "Free",
                icon: <MessageSquare className="w-5 h-5" />,
                body: "Trained on your knowledge base. Accurate, consistent, and up-to-date.",
              },
              {
                label: "Agent Handoff",
                note: "Free",
                icon: <RefreshCcw className="w-5 h-5" />,
                body: "Transfers with full context. No repeating from scratch.",
              },
              {
                label: "Analytics Dashboard",
                note: "Free",
                icon: <BarChart3 className="w-5 h-5" />,
                body: "Top questions, unanswered gaps, CSAT, volume trends.",
              },
              {
                label: "Return Processing",
                note: "Enterprise",
                icon: <Box className="w-5 h-5" />,
                body: "End-to-end return flows via webhook bridge to your payment system.",
              },
              {
                label: "Instant Data Ingestion",
                note: "Free",
                icon: <Globe className="w-5 h-5" />,
                body: "Give us a URL and we'll crawl it instantly to build your agent's knowledge base.",
              },
              {
                label: "Real-time Monitoring",
                note: "Free",
                icon: <Zap className="w-5 h-5" />,
                body: "Watch conversations live and jump in whenever your agents need a hand.",
              },
              {
                label: "Multi-Language",
                note: "Free",
                icon: <Globe className="w-5 h-5" />,
                body: "Auto-detects language and responds naturally in 50+.",
              },
              {
                label: "Privacy-First Storage",
                note: "Free",
                icon: <ShieldCheck className="w-5 h-5" />,
                body: "Row-level isolation. Your data never mixes with others.",
              },
              {
                label: "Custom AI Persona",
                note: "Enterprise",
                icon: <MessageSquare className="w-5 h-5" />,
                body: "Hand-crafted persona, tone, and dedicated onboarding team.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -5, rotateX: 2, rotateY: 2 }}
                style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
                className="bg-white px-5 md:px-8 py-5 md:py-8 group hover:bg-[var(--bg-secondary)] transition-all duration-300 border border-[var(--border-subtle)] hover:border-[var(--accent)]/20 shadow-sm hover:shadow-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="p-2.5 md:p-3 bg-[var(--bg-warm)] rounded-xl text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                    {f.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] px-2 md:px-3 py-1 md:py-1.5 bg-white rounded-full border border-[var(--border-subtle)]">
                    {f.note}
                  </span>
                </div>
                <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)] mb-2">
                  {f.label}
                </h3>
                <p className="text-[0.9rem] md:text-[0.95rem] text-[var(--text-secondary)] leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── PRICING ── */}
      <section
        id="pricing"
        aria-label="Pricing plans"
        className="w-full flex flex-col justify-center snap-start bg-[var(--bg-secondary)] py-12 md:py-16 lg:py-20 px-4 sm:px-8 md:px-14 lg:px-20 border-y border-[var(--border-subtle)]"
      >
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-[1400px] mx-auto flex flex-col items-center"
        >
          <div className="text-center mb-12 lg:mb-20">
            <motion.div variants={fadeUp}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
                Pricing
              </p>
              <div className="w-8 h-[1px] bg-[var(--border-dark)] mx-auto" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-3xl md:text-4xl lg:text-[4rem] font-black text-[var(--text-primary)] leading-tight lg:leading-[1.1] mt-4 md:mt-6"
            >

              100% Free.
              <br />
              <span className="italic">Forever.</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 w-full max-w-4xl">
            {/* Free Plan */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -5, rotateX: 1, rotateY: 1 }}
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              className="p-6 md:p-10 border bg-[var(--text-primary)] border-[var(--text-primary)] shadow-2xl flex flex-col relative overflow-hidden group w-full"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent)] opacity-10 blur-3xl pointer-events-none" />

              <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-5 md:mb-6 bg-white/10 text-[var(--accent)]">
                <MessageSquare className="w-5 md:w-6 h-5 md:h-6" />
              </div>

              <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3 text-[var(--accent)]">
                Free
              </p>
              <h3
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-lg md:text-2xl font-bold mb-3 italic leading-tight text-white"
              >
                Everything you need
              </h3>

              <div className="w-full h-[1px] my-6 bg-white/10" />

<ul className="space-y-3 md:space-y-4 mb-8 flex-1 relative z-10">
                  {[
                    "FAQ chatbot with knowledge base",
                    "Basic agent handoff",
                    "Dashboard & analytics",
                    "Unanswered question tracking",
                    "Community support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[0.85rem] md:text-[0.9rem] text-white/80">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-sm" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/auth/login" className="mt-auto block">
                  <button className="w-full py-3 md:py-3.5 text-sm font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 group border bg-[var(--accent)] border-[var(--accent)] text-white hover:brightness-110 shadow-lg shadow-[var(--accent)]/20 cursor-pointer">
                    Get Started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </Link>
            </motion.div>

{/* Enterprise Plan */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -5, rotateX: 1, rotateY: 1 }}
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              className="p-6 md:p-10 border bg-white border-[var(--border-default)] shadow-xl flex flex-col relative overflow-hidden group w-full hover:border-[var(--accent)]/30 transition-all"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent)] opacity-5 blur-3xl pointer-events-none" />

              <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-5 md:mb-6 bg-white text-[var(--accent)]">
                <ShieldCheck className="w-5 md:w-6 h-5 md:h-6" />
              </div>

              <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3 text-[var(--accent)]">
                Enterprise
              </p>
              <h3
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-lg md:text-2xl font-bold mb-3 italic leading-tight text-[var(--text-primary)]"
              >

                Custom solutions
              </h3>

              <div className="w-full h-[1px] my-5 md:my-6 bg-[var(--border-subtle)]" />

              <ul className="space-y-3 md:space-y-4 mb-8 flex-1 relative z-10">
                {[
                  "Return processing automations",
                  "Custom AI persona & tone",
                  "Dedicated onboarding team",
                  "SLA & priority support",
                  "Advanced security & compliance",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[0.85rem] md:text-[0.9rem] text-[var(--text-secondary)]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-sm" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  const dialog = document.getElementById("contact-sales-trigger");
                  if (dialog) dialog.click();
                }}
                className="mt-auto w-full py-3.5 text-sm font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 group border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] cursor-pointer"
              >
                Contact Sales
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section
        aria-label="Get started today"
        className="bg-[var(--accent)] min-h-auto md:min-h-[100dvh] flex flex-col justify-center snap-start py-16 md:py-24 lg:py-32 px-4 sm:px-8 md:px-14 lg:px-20 w-full overflow-hidden"
      >
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-[1400px] w-full mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-12"
        >
          <motion.div variants={fadeUp} className="text-center md:text-left">
            <p className="text-white text-[11px] font-bold uppercase tracking-[0.25em] mb-4 md:mb-6">
              Ready to automate?
            </p>
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white leading-tight max-w-3xl"
            >
              Start automating.
              <br className="hidden sm:block" />
              <span className="italic">100% Free.</span>
            </h2>
            <p className="text-white/80 mt-4 md:mt-6 lg:mt-8 text-sm md:text-base lg:text-lg max-w-md mx-auto md:mx-0 leading-relaxed font-medium">
              Ryoku provides a robust FAQ platform with agent handoff capabilities, completely free of charge. No credit card required.
            </p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            className="shrink-0 flex items-center w-full md:w-auto mt-6 md:mt-16"
          >
            <Link href="/auth/login" className="w-full">
              <button className="group bg-white text-[var(--accent)] hover:bg-[var(--text-primary)] hover:text-white transition-all duration-300 shadow-xl shadow-black/10 px-8 py-4 md:py-5 w-full font-bold text-[0.9rem] md:text-[0.95rem] tracking-wide uppercase flex items-center justify-center gap-3 border border-transparent hover:border-[var(--text-primary)]">
                Get Started Free
                <ArrowUpRight className="w-4 md:w-5 h-4 md:h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <motion.footer
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="py-10 md:py-16 px-4 sm:px-8 md:px-14 lg:px-20 bg-[var(--bg-dark)] w-full border-t border-white/10"
      >
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-3">
            <span
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-lg md:text-xl font-black text-white tracking-tight"
            >
              Ryoku
            </span>
            <span className="text-white/30 text-[10px] uppercase tracking-widest font-bold">
              / agent
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {[
              ["/#features", "Capabilities"],
              ["/#pricing", "Pricing"],
              ["/auth/login", "Sign In"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
            © 2026 Ryoku
          </p>
        </div>
      </motion.footer>

      {/* Hidden contact sales trigger */}
      <button
        id="contact-sales-trigger"
        onClick={() => setShowContactDialog(true)}
        className="hidden"
        aria-hidden="true"
      />

      <ContactDialog
        isOpen={showContactDialog}
        onClose={() => setShowContactDialog(false)}
        plan="Enterprise"
      />
    </main>
  );
}
