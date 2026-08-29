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
}

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  thumbnail: string;
  options: QualityOption[];
}
