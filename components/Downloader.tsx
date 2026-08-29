"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingState } from "@/components/Shimmer";
import { QualityCard } from "@/components/QualityCard";
import type { VideoInfo, QualityOption } from "@/lib/types";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus("loading");
    setError("");
    setInfo(null);
    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setInfo(data.info);
      setStatus("ready");
    } catch (err: any) {
      setError(err.message || "Failed to fetch video.");
      setStatus("error");
    }
  }

  async function handleDownload(option: QualityOption) {
    if (!info) return;
    setDownloadingId(option.id);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), optionId: option.id }),
      });
      if (!res.ok || !res.body) {
        const txt = res.headers.get("Content-Type")?.includes("json")
          ? (await res.json()).error
          : await res.text();
        throw new Error(txt || "Download failed.");
      }
      // Stream the response to a Blob and trigger a real browser download.
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
        }
      }
      const blob = new Blob(chunks);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const fname =
        option.container === "mp3"
          ? `${info.title.slice(0, 50)}.mp3`
          : option.container === "webm"
          ? `${info.title.slice(0, 50)}.webm`
          : `${info.title.slice(0, 50)}-${option.quality}.mp4`;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setDownloadingId(null);
    } catch (err: any) {
      setError(err.message || "Download failed.");
      setStatus("error");
      setDownloadingId(null);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleFetch} className="w-full">
        <div className="glass flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube link here…  (https://youtube.com/watch?v=…)"
            className="flex-1 bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 outline-none"
            aria-label="YouTube URL"
          />
          <motion.button
            type="submit"
            disabled={status === "loading"}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl bg-accent px-7 py-3 font-semibold text-black shadow-[0_0_24px_rgba(0,240,255,0.35)] transition disabled:opacity-60"
          >
            {status === "loading" ? "Fetching…" : "Get Formats"}
          </motion.button>
        </div>
      </form>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {status === "loading" && <LoadingState />}

      <AnimatePresence>
        {status === "ready" && info && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8"
          >
            <div className="glass flex gap-4 rounded-2xl p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={info.thumbnail}
                alt={info.title}
                className="h-24 w-40 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-lg font-semibold text-white">{info.title}</h2>
                <p className="mt-1 text-sm text-white/50">
                  {info.author} • {formatDuration(info.lengthSeconds)}
                </p>
                <p className="mt-2 text-xs text-accent/70">
                  {info.options.length} formats available
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {info.options.map((o) => (
                <QualityCard
                  key={o.id}
                  option={o}
                  loading={downloadingId === o.id}
                  onSelect={handleDownload}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
