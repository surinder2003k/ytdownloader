"use client";
import { useEffect, useState } from "react";

export default function PlaylistGrid({ playlistId }: { playlistId?: string }) {
  const [videos, setVideos] = useState<Array<{title:string; url:string; id:string}>>([]);
  useEffect(() => {
    if (!playlistId) return;
    // In production this would call a server endpoint; for now we show a placeholder
    // that the user can paste individual video links into the main input
    setVideos([
      { title: "Playlist item 1", url: `https://youtu.be/sample1`, id: "sample1" },
      { title: "Playlist item 2", url: `https://youtu.be/sample2`, id: "sample2" },
    ]);
  }, [playlistId]);
  if (!playlistId || videos.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-ink">Playlist detected ({videos.length} items shown)</h3>
      <p className="text-xs text-ink-faint mt-1">Paste each video link individually for download formats. Full playlist download requires per-video links.</p>
    </div>
  );
}
