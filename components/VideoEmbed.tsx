"use client";
import { useState } from "react";
export default function VideoEmbed({ videoId }: { videoId?: string }) {
  if (!videoId) return null;
  return (
    <div className="mt-8 rounded-2xl overflow-hidden border border-border shadow-sm">
      <iframe
        width="100%"
        height="360"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video preview"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full rounded-2xl"
      />
      <div className="bg-card px-4 py-3 text-sm text-ink-soft">
        Preview • Click <strong>Get Formats</strong> below to download
      </div>
    </div>
  );
}
