"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();

  const isChat = pathname?.startsWith("/chat");

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide if scrolling down and passed 100px. Show if scrolling up.
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  if (isChat) return null;

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
  ];

  return (
    <nav
      className={`fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none transition-transform duration-500 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-[150%]"
      }`}
    >
      {/* The main floating container */}
      <div
        className="pointer-events-auto flex items-center justify-between px-6 py-2.5 rounded-[100px] shadow-2xl transition-all duration-300 border"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "rgba(0,0,0,0.06)",
          boxShadow:
            "0 10px 40px -10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.02)",
          width: "100%",
          maxWidth: "800px",
        }}
      >
        {/* Wordmark logo */}
        <Link href="/" className="flex items-center gap-0 group pr-8 shrink-0">
          <span
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[1.3rem] font-black tracking-tight text-[var(--text-primary)] leading-none"
          >
            Ryoku
          </span>
          <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] mb-[2px] block" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 px-4 border-l border-[rgba(0,0,0,0.06)]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side CTA */}
        <div className="flex items-center gap-3 md:pl-8 ml-auto border-l border-transparent md:border-[rgba(0,0,0,0.06)]">
          <Link href="/auth/login" className="hidden sm:block">
            <button className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer px-2 py-1">
              Sign In
            </button>
          </Link>

          <Link href="/auth/login">
            <button className="group relative overflow-hidden bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-[100px] text-[10px] font-bold uppercase tracking-[0.15em] transition-all hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer flex items-center gap-2">
              <span className="relative z-10 flex items-center gap-1.5">
                Start Free
                <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-[var(--accent)] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
            </button>
          </Link>

        {/* Mobile Toggle */}
          <button
            className="md:hidden ml-2 p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer focus-visible:outline-offset-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-4 right-4 pointer-events-auto p-2"
          >
            <div
              className="rounded-3xl p-6 shadow-2xl border flex flex-col gap-6"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderColor: "rgba(0,0,0,0.08)",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
              }}
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-3 rounded-xl hover:bg-black/5"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(0,0,0,0.1)] to-transparent" />

              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="w-full">
                  <button className="w-full py-3.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)] border border-transparent hover:border-[rgba(0,0,0,0.1)] transition-all bg-[rgba(0,0,0,0.03)] hover:bg-[rgba(0,0,0,0.05)]">
                    Sign In
                  </button>
                </Link>
                <Link href="/auth/login" className="w-full">
                  <button className="w-full py-3.5 rounded-[100px] text-[11px] font-bold uppercase tracking-[0.2em] bg-[var(--text-primary)] text-white hover:bg-[var(--accent)] transition-colors shadow-lg shadow-black/10">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
