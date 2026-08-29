"use client";

import { motion } from "framer-motion";
import type { QualityOption } from "@/lib/types";

interface Props {
  option: QualityOption;
  onSelect: (o: QualityOption) => void;
  loading: boolean;
}

function formatSize(mb?: number): string {
  if (!mb) return "";
  if (mb >= 1024) return `~${(mb / 1024).toFixed(1)} GB`;
  return `~${mb} MB`;
}

export function QualityCard({ option, onSelect, loading }: Props) {
  const isVideo = option.type === "video";
  const accent = isVideo ? "text-accent" : "text-emerald-300";

  return (
    <motion.button
      type="button"
      disabled={loading}
      onClick={() => onSelect(option)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass glass-hover group relative flex flex-col items-start gap-2 rounded-2xl p-5 text-left disabled:cursor-wait disabled:opacity-70"
    >
      <span
        className={`text-xs font-semibold uppercase tracking-wider ${
          isVideo ? "text-accent/80" : "text-emerald-300/80"
        }`}
      >
        {isVideo ? "Video" : "Audio"}
      </span>

      <span className="text-2xl font-bold leading-none">{option.label}</span>

      <span className="text-sm text-white/60">
        {option.container.toUpperCase()}
        {option.bitrateKbps ? ` • ${option.bitrateKbps} kbps` : ""}
      </span>

      <div className="mt-1 flex w-full items-center justify-between">
        <span className="text-xs text-white/40">{formatSize(option.sizeEstimateMB)}</span>
        {option.needsMerge && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
            ffmpeg
          </span>
        )}
      </div>

      {loading && (
        <span className="absolute right-4 top-4 h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      )}
    </motion.button>
  );
}
