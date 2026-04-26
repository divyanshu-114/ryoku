"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ArrowUpRight, BarChart3, Headphones, LayoutDashboard,
  LogOut, ChevronDown, Zap,
} from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isChat = pathname?.startsWith("/chat");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAuth = pathname?.startsWith("/auth");
  const isDocs = pathname?.startsWith("/docs");
  const isLanding = pathname === "/";
  const isFloating = isLanding || isDocs || isDashboard;

  // Scroll logic (Enhanced with Event Capturing for localized scrolls)
  useEffect(() => {
    if (!isFloating) return;

    const handleScroll = (e: Event) => {
      // Get scroll position from the element that actually scrolled
      const target = e.target;
      if (!target) return;

      const y = target === document || target === window
        ? window.scrollY
        : target instanceof HTMLElement
        ? target.scrollTop
        : 0;
      
      // Update visibility state
      setLastScrollY((previousY) => {
        // Only trigger changes if the scroll delta is significant
        if (Math.abs(y - previousY) < 5 && y > 100) return previousY;
        
        // Scrolling up or near top -> show
        if (y < previousY || y < 100) return 0;
        // Scrolling down -> hide
        return y;
      });
    };

    // Use capture: true to catch scroll events from any nested container (like the dashboard's main area)
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [isFloating]);

  const isVisible = !isFloating || lastScrollY < 100;
  const isShrunk = isDashboard;

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

  // ─── Links Configuration ───
  interface NavLink {
    href: string;
    label: string;
    icon?: any;
  }

  const landingLinks: NavLink[] = [
    { href: "/docs/sdk", label: "Documentation" },
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
  ];

  const dashLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/agent", label: "Agent", icon: Headphones },
    { href: "/docs/sdk", label: "Docs", icon: Zap },
  ];

  const currentLinks = isDashboard ? dashLinks : landingLinks;
  const isLoggedIn = status === "authenticated";

  return (
    <motion.nav
      initial={false}
      animate={{
        y: isVisible ? 0 : -120,
        opacity: isVisible ? 1 : 0,
      }}
      whileHover={{ opacity: 1 }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none transition-all duration-300"
    >
      <div
        className={`pointer-events-auto flex items-center justify-between rounded-full shadow-2xl transition-all duration-500 border ${
          isShrunk ? "px-3 py-1" : "px-4 py-1.5"
        }`}
        style={{
          background: isDashboard 
            ? "rgba(255, 255, 255, 0.5)" 
            : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px) saturate(180%)",
          WebkitBackdropFilter: "blur(12px) saturate(180%)",
          borderColor: isDashboard ? "rgba(226, 232, 240, 0.5)" : "rgba(0,0,0,0.06)",
          boxShadow: isDashboard 
            ? "0 2px 12px -3px rgba(0,0,0,0.04)" 
            : "0 10px 40px -10px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.02)",
          width: "100%",
          maxWidth: isDashboard ? "520px" : "800px",
        }}
      >
        {/* Logo */}
        <Link href="/" className={`flex items-center gap-0 group shrink-0 transition-all ${isShrunk ? "pr-2" : "pr-4"}`}>
          <span style={{ fontFamily: "'Playfair Display', serif" }}
            className={`font-black tracking-tight leading-none transition-all ${
              isShrunk ? "text-[1rem]" : "text-[1.1rem]"
            } ${isDashboard ? "text-slate-900" : "text-[var(--text-primary)]"}`}>
            Ryoku
          </span>
          <span className="ml-1 w-1 h-1 rounded-full bg-[var(--accent)] mb-[2px] block" />
        </Link>

        {/* Desktop Links */}
        <div className={`hidden md:flex items-center transition-all ${
          isShrunk ? "gap-3 px-2" : "gap-5 px-3"
        } border-l ${isDashboard ? "border-white/10" : "border-[rgba(0,0,0,0.06)]"}`}>
          {currentLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  isActive
                    ? "text-[var(--accent)]"
                    : isDashboard ? "text-slate-500 hover:text-slate-900" : "text-[var(--text-primary)] hover:text-[var(--accent)]"
                }`}>
                {link.icon ? <link.icon className="w-3.5 h-3.5" title={link.label} /> : link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Side */}
        <div className={`flex items-center transition-all ${
          isShrunk ? "gap-2 pl-2" : "gap-3 pl-4"
        } ml-auto border-l ${isDashboard ? "border-white/10" : "border-[rgba(0,0,0,0.06)]"}`}>
          {isDashboard ? (
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-full hover:bg-black/5 transition cursor-pointer">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className={`rounded-full object-cover ${isShrunk ? "w-6 h-6" : "w-7 h-7"}`}
                  />
                ) : (
                  <div className="rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-[10px] font-bold transition-all w-6 h-6">
                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <ChevronDown className={`w-3 h-3 text-slate-500 transition ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 12, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden shadow-2xl"
                    style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div className="p-4 border-b border-black/5">
                      <p className="text-xs font-bold text-slate-900 truncate">{session?.user?.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{session?.user?.email}</p>
                    </div>
                    <div className="p-1">
                      <button onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition cursor-pointer">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              {isLoggedIn ? (
                <Link href="/dashboard">
                  <button className="group relative overflow-hidden bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-[100px] text-[10px] font-bold uppercase tracking-[0.15em] transition-all hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer flex items-center gap-2">
                    <span className="relative z-10 flex items-center gap-1.5">
                      Dashboard
                      <Zap className="w-3 h-3" />
                    </span>
                    <div className="absolute inset-0 bg-[var(--accent)] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
                  </button>
                </Link>
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
            </>
          )}

          {/* Mobile Toggle */}
          <button
            className={`md:hidden ml-2 p-1.5 cursor-pointer ${isDashboard ? "text-slate-400 hover:text-white" : "text-[var(--text-secondary)] hover:text-[var(--accent)]"}`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu (Shared) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-4 right-4 pointer-events-auto p-2"
          >
            <div className="rounded-3xl p-6 shadow-2xl border flex flex-col gap-4" style={{
              background: isDashboard ? "rgba(20,20,30,0.98)" : "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              borderColor: isDashboard ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            }}>
              {currentLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className={`text-[11px] font-bold uppercase tracking-[0.2em] p-3 rounded-xl transition-colors ${
                    isDashboard ? "text-slate-300 hover:text-white hover:bg-white/5" : "text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-black/5"
                  }`}
                  onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <div className={`h-[1px] w-full ${isDashboard ? "bg-white/5" : "bg-black/5"}`} />
              {isLoggedIn ? (
                <button onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="w-full py-3.5 rounded-[100px] text-[11px] font-bold uppercase tracking-[0.2em] bg-red-500/10 text-red-400">
                  Sign Out
                </button>
              ) : (
                <Link href="/auth/login" className="w-full" onClick={() => setMobileOpen(false)}>
                  <button className="w-full py-3.5 rounded-[100px] text-[11px] font-bold uppercase tracking-[0.2em] bg-[var(--text-primary)] text-white">
                    Get Started
                  </button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
