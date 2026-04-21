"use client";

import { signIn } from "next-auth/react";
import { Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white relative flex flex-col items-center justify-center px-6 pt-32 pb-12 overflow-hidden">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }} 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md bg-[#F9F9F9] rounded-[32px] p-10 md:p-12 border border-[var(--border-subtle)] shadow-sm text-center"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[var(--accent)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/20 animate-pulse-slow">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <span 
            className="text-xl font-black text-[var(--text-primary)] tracking-tight" 
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Ryoku
          </span>
        </div>

        <h1 
          className="text-3xl font-black text-[var(--text-primary)] mb-3" 
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Welcome back
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-10">
          Sign in to manage your AI chatbots
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full h-[56px] bg-white border border-[var(--border-default)] rounded-full flex items-center justify-center gap-3 text-[var(--text-primary)] font-semibold transition-all hover:bg-[var(--bg-secondary)] hover:border-[var(--text-primary)] hover:shadow-md mb-8 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-10">
          <div className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Secure authentication</span>
          <div className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed px-4">
          By signing in, you agree to our <Link href="#" className="underline hover:text-[var(--accent)] transition-colors">Terms of Service</Link> and <Link href="#" className="underline hover:text-[var(--accent)] transition-colors">Privacy Policy</Link>.
        </p>
      </motion.div>

      <Link 
        href="/" 
        className="mt-12 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group"
      >
        <span className="inline-block transition-transform group-hover:-translate-x-1 mr-2">←</span>
        Back to home
      </Link>
    </main>
  );
}
