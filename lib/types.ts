export type FormatType = "video" | "audio";

export interface QualityOption {
  id: string;
  type: FormatType;
  label: string;
  quality: string;
  container: "mp4" | "mp3" | "webm";
  /** progressive download (single combined stream) */
  itag?: number;
  /** ffmpeg merge needed: pick video by height + audio by highestaudio */
  needsMerge?: boolean;
  height?: number;
  bitrateKbps?: number;
  sizeEstimateMB?: number;
  /** source backend: "ytdlp" (default) or "cobalt" (fallback) */
  source?: "ytdlp" | "cobalt";
  /** cobalt tunnel URL (when source === "cobalt") */
  cobaltUrl?: string;
  /** cobalt-provided filename (when source === "cobalt") */
  cobaltFilename?: string;
}

export interface VideoInfo {
  videoId?: string;
  playlistId?: string;
  isPlaylist?: boolean;
  title: string;
  author: string;
  lengthSeconds: number;
  thumbnail: string;
  options: QualityOption[];
}
