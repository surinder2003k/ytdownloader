import type { VideoInfo, QualityOption } from "./types";

const VIDEO_HEIGHTS = [144, 240, 360, 480, 720, 1080, 1440, 2160];

function humanSize(mb?: number): string {
  if (!mb) return "";
  if (mb >= 1024) return `~${(mb / 1024).toFixed(1)} GB`;
  return `~${Math.max(1, Math.round(mb))} MB`;
}

function mbFromBytes(bytes?: number): number | undefined {
  return bytes ? Math.round(bytes / 1024 / 1024) : undefined;
}

/** Build our UI-facing format list from a yt-dlp dump-single-json result. */
export function buildVideoInfo(meta: any): VideoInfo {
  const formats: any[] = meta.formats || [];
  const title = meta.title || "video";

  // Separate progressive (has both v+a), video-only, audio-only.
  const progressive = formats.filter(
    (f) => f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none" && f.url
  );
  const videoOnly = formats.filter(
    (f) => f.vcodec && f.vcodec !== "none" && f.acodec === "none" && f.url
  );
  const audioOnly = formats.filter(
    (f) => f.acodec && f.acodec !== "none" && f.vcodec === "none" && f.url
  );

  const options: QualityOption[] = [];

  // --- Progressive combined MP4s (direct download, no ffmpeg) ---
  for (const h of VIDEO_HEIGHTS) {
    const f = progressive.find(
      (x) => x.height === h && (x.ext === "mp4" || x.ext === "webm")
    );
    if (f) {
      options.push({
        id: `prog-${f.format_id}`,
        type: "video",
        label: `${h}p`,
        quality: `${h}p`,
        container: f.ext === "webm" ? "webm" : "mp4",
        itag: Number(f.format_id),
        height: h,
        bitrateKbps: f.tbr ? Math.round(f.tbr) : undefined,
        sizeEstimateMB: mbFromBytes(f.filesize),
      });
    }
  }

  // --- Merged video+audio (ffmpeg) for heights without a progressive stream ---
  const covered = new Set(options.filter((o) => o.type === "video").map((o) => o.height));
  for (const h of VIDEO_HEIGHTS) {
    if (covered.has(h)) continue;
    if (videoOnly.length && audioOnly.length) {
      options.push({
        id: `merge-${h}`,
        type: "video",
        label: `${h}p (HD)`,
        quality: `${h}p`,
        container: "mp4",
        needsMerge: true,
        height: h,
      });
      covered.add(h);
    }
  }

  // --- Best audio as MP3 (ffmpeg transcode) ---
  const bestAudio =
    audioOnly.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0] ||
    audioOnly.sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
  if (bestAudio) {
    options.push({
      id: "audio-mp3",
      type: "audio",
      label: "MP3 (best)",
      quality: "MP3",
      container: "mp3",
      needsMerge: true,
      bitrateKbps: bestAudio.abr ? Math.round(bestAudio.abr) : undefined,
      sizeEstimateMB: mbFromBytes(bestAudio.filesize),
    });
    // Also offer original-format audio (often webm/opus) with no transcode.
    if (bestAudio.ext && bestAudio.ext !== "mp3") {
      options.push({
        id: `audio-orig-${bestAudio.format_id}`,
        type: "audio",
        label: `Audio (${bestAudio.ext})`,
        quality: "Audio",
        container: bestAudio.ext as any,
        itag: Number(bestAudio.format_id),
        bitrateKbps: bestAudio.abr ? Math.round(bestAudio.abr) : undefined,
        sizeEstimateMB: mbFromBytes(bestAudio.filesize),
      });
    }
  }

  // Order: video high->low, then audio
  options.sort((a, b) => {
    if (a.type !== b.type) return a.type === "video" ? -1 : 1;
    return (b.height || 9999) - (a.height || 9999);
  });

  return {
    videoId: meta.id,
    title,
    author: meta.uploader || meta.channel || "YouTube",
    lengthSeconds: meta.duration ? Number(meta.duration) : 0,
    thumbnail: meta.thumbnail || meta.thumbnails?.[meta.thumbnails.length - 1]?.url || "",
    options,
  };
}
