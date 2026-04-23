"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight, ArrowRight, ShieldCheck, Zap, Globe, MessageSquare, BarChart3, RefreshCcw, Box } from "lucide-react";

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
    <div className="absolute top-[10%] -left-[5%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.08)_0%,transparent_70%)] animate-blob" />
    <div className="absolute -bottom-[10%] -right-[5%] w-[35vw] h-[35vw] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.05)_0%,transparent_70%)] animate-blob" style={{ animationDelay: "-5s" }} />
    <div className="absolute top-[40%] left-[20%] w-[20vw] h-[20vw] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.03)_0%,transparent_70%)] animate-blob" style={{ animationDelay: "-12s" }} />
  </div>
);

const GlassTorus = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const moveX = (clientX - window.innerWidth / 2) / 25;
      const moveY = (clientY - window.innerHeight / 2) / 25;
      mouseX.set(moveX);
      mouseY.set(moveY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      style={{ x: springX, y: springY, rotateX: springY, rotateY: springX }}
      className="hidden lg:block absolute -top-20 -right-20 w-80 h-80 pointer-events-none perspective-container preserve-3d"
    >
      <div className="absolute inset-0 rounded-full border-[30px] border-[var(--accent)] opacity-[0.03] blur-xl animate-spin-slow" />
      <div className="absolute inset-4 rounded-full border-[1px] border-white/20 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md shadow-2xl animate-orbit" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-[var(--accent)] blur-[80px] opacity-20" />
    </motion.div>
  );
};

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

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      <section className="relative w-full min-h-[100dvh] lg:min-h-screen flex flex-col justify-center snap-start pt-32 pb-4 lg:pt-32 lg:pb-0 px-5 sm:px-8 md:px-14 lg:px-20 max-w-[1400px] mx-auto">
        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="flex-1 flex flex-col justify-center"
        >
          {/* eyebrow */}
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-8"
          >
            Ryoku — AI Customer Service
          </motion.p>

          {/* headline: serif + asymmetric */}
          <motion.div variants={fadeUp} className="max-w-5xl mb-8 lg:mb-12 relative">
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
              }}
              className="text-[clamp(3rem,8vw,7.5rem)] font-black text-[var(--text-primary)] relative z-10"
            >
              <LetterReveal text="Customer support" delay={0.2} />
              <br className="hidden sm:block" />
              <span className="italic text-[var(--accent)]">
                <LetterReveal text="that actually" delay={0.6} />
              </span>
              <br className="hidden sm:block" />
              <span
                style={{
                  WebkitTextStroke: "2px var(--text-primary)",
                  color: "transparent",
                }}
              >
                <LetterReveal text="works." delay={1.0} />
              </span>
            </h1>

            <GlassTorus />
          </motion.div>

          {/* two-column: desc + chat preview */}
          <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-12 lg:gap-8">
            <motion.div
              variants={fadeUp}
              className="w-full lg:w-[45%] pb-0 lg:pb-8"
            >
              <p
                className="text-[1.1rem] md:text-[1.2rem] text-[var(--text-secondary)] leading-relaxed max-w-md mb-10"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                An AI agent trained on your business — answers FAQs, handles
                returns, hands off to humans. Not a chatbot template. Built for
                the way real customers actually talk.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/login" className="w-full sm:w-auto">
                  <button className="group relative w-full inline-flex items-center justify-center gap-3 bg-[var(--text-primary)] text-white px-8 py-4 font-semibold text-sm tracking-wide transition-all hover:bg-[var(--accent)] min-h-[52px]">
                    Start for free
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto">
                  <button className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all min-h-[52px]">
                    See how it works
                  </button>
                </Link>
              </div>

              {/* small proof strip */}
              <div className="mt-10 flex items-center gap-6">
                <span className="w-8 h-[1px] bg-[var(--border-default)]" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                  Free tier · No card required
                </span>
              </div>
            </motion.div>

            {/* live chat preview screenshot — flush right edge on desktop */}
            <motion.div
              variants={fadeUp}
              className="relative lg:absolute lg:right-0 lg:bottom-0 xl:bottom-0 bg-[#111] overflow-hidden shadow-2xl w-full max-w-[400px] xl:max-w-[480px] lg:max-w-[420px] mx-auto lg:mx-0 shrink-0 h-[400px] sm:h-[450px] lg:h-[550px] xl:h-[600px] flex flex-col group transition-transform duration-700 hover:scale-[1.02] lg:rounded-l-2xl lg:rounded-r-none rounded-2xl"
              style={{ borderRadius: "16px" }}
            >
              {/* fake browser bar */}
              <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/10 shrink-0 bg-white/5 backdrop-blur-md">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-3 text-[11px] text-white/30 font-mono tracking-wider">
                  ryoku.chat / widget
                </span>
              </div>
              {/* chat messages */}
              <div
                className="px-6 pt-8 pb-8 space-y-6 bg-white/[0.02] flex-1 overflow-y-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-9 h-9 shadow-lg rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)] flex items-center justify-center text-[12px] text-white font-bold shrink-0 mt-0.5">
                    R
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 mb-1.5 font-medium ml-1">
                      Ryoku Agent
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-tl-sm px-5 py-3.5 text-[0.9rem] text-white/90 max-w-[280px] leading-relaxed shadow-sm">
                      Hey! I&apos;m your TechStore assistant. Need help with a
                      return, policy, or question?
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 1.8, type: "spring", stiffness: 100 }}
                  className="flex justify-end"
                >
                  <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] rounded-2xl rounded-tr-sm px-5 py-3.5 text-[0.9rem] text-white max-w-[260px] shadow-lg shadow-[var(--accent)]/20">
                    I want to return order #4521. It&apos;s defective.
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 3.2, type: "spring", stiffness: 100 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-9 h-9 shadow-lg rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)] flex items-center justify-center text-[12px] text-white font-bold shrink-0 mt-0.5">
                    R
                  </div>
                  <div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-tl-sm px-5 py-3.5 text-[0.9rem] text-white/90 max-w-[280px] leading-relaxed shadow-sm">
                      Found it — a Wireless Keyboard, Mar 2. I&apos;ve filed a
                      return request. Your refund will be confirmed by the store
                      within 24h.
                    </div>
                    <div className="flex flex-wrap gap-2.5 mt-3.5 ml-1">
                      {["Track status", "Talk to humans"].map((l) => (
                        <button
                          key={l}
                          className="text-[10px] font-bold tracking-wide uppercase text-[var(--accent-warm)] border border-[var(--accent)]/30 px-3.5 py-1.5 rounded-full cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all focus-visible:outline-2 focus-visible:outline-white"
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* typing indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 4.5 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-9 h-9 shadow-lg rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)] flex items-center justify-center text-[12px] text-white font-bold shrink-0" />
                  <div className="bg-white/10 backdrop-blur-sm shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5 mt-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </motion.div>
                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[var(--bg-dark)] to-transparent pointer-events-none" />
              </div>
            </motion.div>
          </div>
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
                "Embeddable Widget",
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
        className="min-h-[100dvh] lg:min-h-screen flex flex-col justify-center snap-start py-24 md:py-36 px-5 sm:px-8 md:px-14 lg:px-20 max-w-[1400px] mx-auto w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 lg:gap-16">
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
            <div className="absolute left-6 md:left-8 top-12 bottom-12 w-[1px] bg-[var(--border-subtle)] hidden sm:block" />
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
                className="grid grid-cols-[48px_1fr] md:grid-cols-[80px_1fr] gap-6 md:gap-8 py-10 md:py-14 group hover:pl-2 transition-all duration-300 relative bg-white"
              >
                <div className="flex flex-col items-center gap-2 pt-1.5 md:pt-2">
                  <span className="text-[11px] md:text-sm font-bold text-[var(--text-muted)] tracking-widest font-mono z-10">
                    {item.n}
                  </span>
                  <div className="w-px h-12 bg-gradient-to-b from-[var(--border-default)] to-transparent" />
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-4 text-[var(--accent)] opacity-40 group-hover:opacity-100 transition-opacity">
                    {item.icon}
                  </div>
                  <h3
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-5 italic group-hover:text-[var(--accent)] transition-colors duration-300"
                  >
                    {item.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-[1.05rem] leading-relaxed max-w-xl">
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
        className="w-full min-h-[100dvh] lg:min-h-screen flex flex-col justify-center snap-start bg-[var(--text-primary)] py-24 md:py-36 px-5 sm:px-8 md:px-14 lg:px-20 overflow-hidden relative"
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
              className="text-4xl md:text-5xl lg:text-[4rem] font-black text-white leading-tight lg:leading-[1.1]"
            >
              From setup to
              <br />
              <span className="italic text-[var(--accent-warm)]">serving customers</span>
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
                body: "Share a link or embed the widget. Your agent starts responding to real queries immediately.",
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
        className="w-full flex flex-col justify-center snap-start py-6 md:py-10 px-5 sm:px-8 md:px-14 lg:px-20 max-w-[1400px] mx-auto"
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
              className="text-4xl md:text-5xl lg:text-[3.5rem] font-black text-[var(--text-primary)] leading-tight lg:leading-[1.1]"
            >
              Not just a chatbot —<br />
              <span className="italic">an agent that acts.</span>
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-transparent">
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
                note: "Pro+",
                icon: <Box className="w-5 h-5" />,
                body: "End-to-end return flows via webhook bridge to your payment system.",
              },
              {
                label: "Instant Data Ingestion",
                note: "All plans",
                icon: <Globe className="w-5 h-5" />,
                body: "Give us a URL and we'll crawl it instantly to build your agent's knowledge base.",
              },
              {
                label: "Embeddable Widget",
                note: "Pro+",
                icon: <Zap className="w-5 h-5" />,
                body: "Drop a <script> tag. No framework required. Fully brandable.",
              },
              {
                label: "Multi-Language",
                note: "All plans",
                icon: <Globe className="w-5 h-5" />,
                body: "Auto-detects language and responds naturally in 50+.",
              },
              {
                label: "Privacy-First Storage",
                note: "All plans",
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
                className="bg-white px-6 md:px-8 py-6 md:py-8 group hover:bg-[var(--bg-secondary)] transition-all duration-300 border border-[var(--border-subtle)] hover:border-[var(--accent)]/20 shadow-sm hover:shadow-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="p-3 bg-[var(--bg-warm)] rounded-xl text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                    {f.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] px-3 py-1.5 bg-[var(--accent-glow)] rounded-full border border-[var(--accent)]/10">
                    {f.note}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                  {f.label}
                </h3>
                <p className="text-[0.95rem] text-[var(--text-secondary)] leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">
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
        className="w-full flex flex-col justify-center snap-start bg-[var(--bg-secondary)] py-12 md:py-20 px-5 sm:px-8 md:px-14 lg:px-20 border-y border-[var(--border-subtle)]"
      >
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-[1400px] mx-auto flex flex-col items-center"
        >
          <div className="text-center mb-16 lg:mb-20">
            <motion.div variants={fadeUp}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
                Pricing
              </p>
              <div className="w-8 h-[1px] bg-[var(--border-dark)] mx-auto" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-4xl md:text-5xl lg:text-[4rem] font-black text-[var(--text-primary)] leading-tight lg:leading-[1.1] mt-6"
            >
              100% Free.
              <br />
              <span className="italic">Forever.</span>
            </motion.h2>
          </div>

          <div className="w-full max-w-lg mx-auto">
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -5, rotateX: 1, rotateY: 1 }}
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              className="p-10 md:p-12 border bg-[var(--text-primary)] border-[var(--text-primary)] shadow-2xl flex flex-col relative overflow-hidden group w-full"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent)] opacity-10 blur-3xl pointer-events-none" />
              
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-8 bg-white/10 text-[var(--accent)]">
                <MessageSquare className="w-6 h-6" />
              </div>
              
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4 text-[var(--accent)]">
                Free
              </p>
              <h3
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-2xl md:text-3xl font-bold mb-4 italic leading-tight text-white"
              >
                Everything you need
              </h3>
              
              <div className="w-full h-[1px] my-8 bg-white/10" />
              
              <ul className="space-y-5 mb-12 flex-1 relative z-10">
                {[
                  "FAQ chatbot with knowledge base",
                  "Basic agent handoff",
                  "Dashboard & analytics",
                  "Unanswered question tracking",
                  "Community support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-4 text-[0.95rem] text-white/80">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-sm" />
                    {f}
                  </li>
                ))}
              </ul>
              
              <Link href="/auth/login" className="mt-auto block">
                <button className="w-full py-4 text-sm font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-3 group border bg-[var(--accent)] border-[var(--accent)] text-white hover:brightness-110 shadow-lg shadow-[var(--accent)]/20 cursor-pointer">
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section
        aria-label="Get started today"
        className="bg-[var(--accent)] min-h-[100dvh] flex flex-col justify-center snap-start py-24 md:py-32 px-5 sm:px-8 md:px-14 lg:px-20 w-full overflow-hidden"
      >
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-[1400px] w-full mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-12"
        >
          <motion.div variants={fadeUp} className="text-center md:text-left">
            <p className="text-[var(--accent-warm)] text-[11px] font-bold uppercase tracking-[0.25em] mb-6">
              Ready to automate?
            </p>
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight max-w-3xl"
            >
              Start automating.
              <br />
              <span className="italic">100% Free.</span>
            </h2>
            <p className="text-white/80 mt-6 md:mt-8 text-base md:text-lg max-w-md mx-auto md:mx-0 leading-relaxed font-medium">
              Ryoku provides a robust FAQ platform with agent handoff capabilities, completely free of charge. No credit card required.
            </p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            className="shrink-0 flex items-center w-full md:w-auto mt-4 md:mt-16"
          >
            <Link href="/auth/login" className="w-full">
              <button className="group bg-white text-[var(--accent)] hover:bg-[var(--text-primary)] hover:text-white transition-all duration-300 shadow-xl shadow-black/10 px-10 py-5 sm:py-6 w-full font-bold text-[0.95rem] tracking-wide uppercase flex items-center justify-center gap-4 border border-transparent hover:border-[var(--text-primary)]">
                Get Started Free
                <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
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
        className="py-12 md:py-16 px-5 sm:px-8 md:px-14 lg:px-20 bg-[var(--bg-dark)] w-full border-t border-white/10"
      >
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <span
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-xl font-black text-white tracking-tight"
            >
              Ryoku
            </span>
            <span className="text-white/30 text-[10px] uppercase tracking-widest font-bold">
              / agent
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
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
    </main>
  );
}
