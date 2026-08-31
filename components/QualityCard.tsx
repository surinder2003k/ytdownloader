"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export function QualityCard({ option, onDownload, downloadingId }: any) {
  const [showPlayer, setShowPlayer] = useState(false);
  const loading = downloadingId === option.id;

  const handleDownload = () => {
    if (onDownload) onDownload(option);
  };

  const isAudio = option.container === "mp3" || option.id.includes("audio");

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-ink/5 shadow-xl transition-all hover:shadow-2xl hover:border-brand/40"
    >
      <div className="flex flex-col p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">{isAudio ? "Audio" : option.quality}</span>
          <span className="text-[10px] text-ink-faint font-medium">{option.container.toUpperCase()}</span>
        </div>

        <h4 className="text-sm font-bold text-ink leading-tight">{option.label}</h4>

        {/* Player / Preview (only for audio or when clicked) */}
        {showPlayer && isAudio && (
          <div className="rounded-xl bg-ink/90 p-3 shadow-inner">
            <audio controls className="w-full h-8" style={{ filter: "invert(0.9)" }}>
              <source src={option.cobaltUrl || ""} type="audio/mpeg" />
            </audio>
          </div>
        )}

        {showPlayer && !isAudio && option.cobaltUrl && (
          <div className="rounded-xl bg-ink overflow-hidden shadow-inner">
            <video controls className="w-full rounded-lg h-28 object-cover" preload="metadata" src={option.cobaltUrl} />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => { if (!showPlayer) setShowPlayer(true); else setShowPlayer(false); }}
            className="flex-1 rounded-xl bg-ink/5 border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
          >
            {showPlayer ? "Hide" : "Preview"}
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex-1 rounded-xl bg-brand text-white px-3 py-2 text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 hover:shadow-brand/40 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white mx-auto" />
            ) : (
              "Download"
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
