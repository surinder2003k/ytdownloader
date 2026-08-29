import { motion } from "framer-motion";
import Downloader from "@/components/Downloader";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-10 sm:py-16">
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1 text-xs font-medium text-accent">
          <span className="h-2 w-2 animate-glow-pulse rounded-full bg-accent" />
          Free • No ads • Multi-quality
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          <span className="gradient-text">YT Grab</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-white/60">
          Grab any YouTube video or audio in the quality you want — 144p up to
          1080p, plus MP3. Fast, clean, and free.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-12"
      >
        <Downloader />
      </motion.div>

      <footer className="mt-16 text-center text-xs text-white/30">
        Not affiliated with YouTube. Download only content you have the right to.
      </footer>
    </main>
  );
}
