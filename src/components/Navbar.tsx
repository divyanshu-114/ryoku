"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ArrowUpRight, BarChart3, Headphones, LayoutDashboard,
  LogOut, Settings, ChevronDown, Zap,
} from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isChat = pathname?.startsWith("/chat");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAuth = pathname?.startsWith("/auth");
  const isLanding = pathname === "/";

  // Scroll hide (only on landing)
  useEffect(() => {
    if (!isLanding) { setIsVisible(true); return; }
    const handleScroll = () => {
      const y = window.scrollY;
      setIsVisible(y < lastScrollY || y < 100);
      setLastScrollY(y);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isLanding]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [pathname]);

  // Hide on chat pages entirely
  if (isChat) return null;

  // ─── Auth Pages: Minimal navbar ───
  if (isAuth) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <Link href="/" className="flex items-center gap-0 group w-fit">
          <span style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[1.3rem] font-black tracking-tight text-[var(--text-primary)] leading-none">
            Ryoku
          </span>
          <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] mb-[2px] block" />
        </Link>
      </nav>
    );
  }

  // ─── Dashboard Pages: Dark contextual navbar ───
  if (isDashboard) {
    const dashLinks = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/agent", label: "Agent", icon: Headphones },
    ];

    return (
      <nav className="fixed top-0 left-0 right-0 z-50 h-14" style={{
        background: "rgba(10,10,14,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          {/* Logo + Nav Links */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-0 group shrink-0">
              <span style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-lg font-black tracking-tight text-white leading-none">
                Ryoku
              </span>
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] mb-[2px] block" />
            </Link>

            <div className="hidden md:flex items-center gap-1 ml-2">
              {dashLinks.map(link => {
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isActive
                        ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Profile */}
          <div className="flex items-center gap-3">
            {/* Mobile nav toggle */}
            <div className="md:hidden flex items-center gap-2">
              {dashLinks.map(link => {
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}
                    className={`p-3 rounded-lg transition-all active:scale-95 ${isActive ? "bg-[var(--accent-glow)] text-[var(--accent-light)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              })}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer">
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:block text-xs text-[var(--text-secondary)] max-w-[100px] truncate">{session?.user?.name || "User"}</span>
                <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                    <div className="p-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{session?.user?.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{session?.user?.email}</p>
                    </div>
                    <div className="p-1">
                      <Link href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-white/5 transition">
                        <Settings className="w-3.5 h-3.5" /> Settings
                      </Link>
                      <button onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition cursor-pointer">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ─── Landing Page: Floating pill navbar ───
  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
  ];

  const isLoggedIn = status === "authenticated";

  return (
    <nav
      className={`fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none transition-transform duration-500 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-[150%]"
      }`}
    >
      <div
        className="pointer-events-auto flex items-center justify-between px-6 py-2.5 rounded-[100px] shadow-2xl transition-all duration-300 border"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "rgba(0,0,0,0.06)",
          boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.02)",
          width: "100%",
          maxWidth: "800px",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0 group pr-8 shrink-0">
          <span style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[1.3rem] font-black tracking-tight text-[var(--text-primary)] leading-none">
            Ryoku
          </span>
          <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] mb-[2px] block" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 px-4 border-l border-[rgba(0,0,0,0.06)]">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side CTA */}
        <div className="flex items-center gap-3 md:pl-8 ml-auto border-l border-transparent md:border-[rgba(0,0,0,0.06)]">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard">
                <button className="group relative overflow-hidden bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-[100px] text-[10px] font-bold uppercase tracking-[0.15em] transition-all hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer flex items-center gap-2">
                  <span className="relative z-10 flex items-center gap-1.5">
                    Dashboard
                    <Zap className="w-3 h-3" />
                  </span>
                  <div className="absolute inset-0 bg-[var(--accent)] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
                </button>
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}

          {/* Mobile Toggle */}
          <button
            className="md:hidden ml-2 p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
            <div className="rounded-3xl p-6 shadow-2xl border flex flex-col gap-6" style={{
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              borderColor: "rgba(0,0,0,0.08)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
            }}>
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}
                    className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-3 rounded-xl hover:bg-black/5"
                    onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(0,0,0,0.1)] to-transparent" />
              <div className="flex flex-col gap-3">
                {isLoggedIn ? (
                  <Link href="/dashboard" className="w-full" onClick={() => setMobileOpen(false)}>
                    <button className="w-full py-3.5 rounded-[100px] text-[11px] font-bold uppercase tracking-[0.2em] bg-[var(--text-primary)] text-white hover:bg-[var(--accent)] transition-colors shadow-lg shadow-black/10">
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/login" className="w-full" onClick={() => setMobileOpen(false)}>
                      <button className="w-full py-3.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)] border border-transparent hover:border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.03)]">
                        Sign In
                      </button>
                    </Link>
                    <Link href="/auth/login" className="w-full" onClick={() => setMobileOpen(false)}>
                      <button className="w-full py-3.5 rounded-[100px] text-[11px] font-bold uppercase tracking-[0.2em] bg-[var(--text-primary)] text-white hover:bg-[var(--accent)] transition-colors shadow-lg shadow-black/10">
                        Get Started
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
