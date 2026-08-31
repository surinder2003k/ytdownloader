"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Downloader from "@/components/Downloader";

export default function Home() {
  const [theme, setTheme] = useState<"light"|"dark"|"system">("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
  };
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-10 sm:py-16">
      <div className="flex justify-end mb-2">
        <button onClick={toggleTheme} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-brand transition">Theme: {theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}</button>
      </div>
      <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1 text-xs font-medium text-brand-dark">
          Free • No ads • Multi-quality
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">YT Grab</h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-ink-soft">Download any YouTube video or audio in the quality you want — 144p up to 1080p, plus MP3. Fast, clean, and free.</p>
      </motion.header>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="mt-12">
        <Downloader />
      </motion.div>
      <footer className="mt-16 text-center text-xs text-ink-faint">Not affiliated with YouTube. Download only content you have the right to.</footer>
    </main>
  );
}
