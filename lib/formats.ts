import ytdl from "@distube/ytdl-core";
import type { VideoInfo, QualityOption } from "./types";
import { requestOptions } from "./ytdl";

const VIDEO_HEIGHTS = [144, 240, 360, 480, 720, 1080];

function estimateSize(lengthSeconds: number, bitrateBps: number): number {
  return Math.round((bitrateBps * lengthSeconds) / 8 / 1024 / 1024);
}

export async function buildVideoInfo(url: string): Promise<VideoInfo> {
  const info = await ytdl.getInfo(url, { requestOptions });
  const videoId = info.videoDetails.videoId;
  const lengthSeconds = parseInt(info.videoDetails.lengthSeconds, 10) || 0;

  const formats = info.formats;
  const options: QualityOption[] = [];

  // ---- Progressive (combined audio+video) — direct download, no ffmpeg ----
  for (const h of VIDEO_HEIGHTS) {
    const f = ytdl.filterFormats(formats, `videoandaudio`).find(
      (fmt) => fmt.height === h && fmt.container === "mp4"
    );
    if (f) {
      options.push({
        id: `prog-${h}`,
        type: "video",
        label: `${h}p`,
        quality: `${h}p`,
        container: "mp4",
        itag: f.itag,
        height: h,
        bitrateKbps: Math.round((parseInt(f.bitrate || "0", 10) || 0) / 1000),
        sizeEstimateMB: f.contentLength
          ? Math.round((parseInt(f.contentLength, 10) || 0) / 1024 / 1024)
          : estimateSize(lengthSeconds, parseInt(f.bitrate || "0", 10)),
      });
    }
  }

  // ---- Merged 1080p (and any height that lacked a progressive stream) ----
  // For each height not already covered by a progressive mp4, offer a merge job.
  const coveredHeights = new Set(
    options.filter((o) => o.type === "video").map((o) => o.height)
  );
  for (const h of VIDEO_HEIGHTS) {
    if (coveredHeights.has(h)) continue;
    const vf = ytdl.filterFormats(formats, "videoonly").find((fmt) => fmt.height === h);
    if (vf) {
      const af = ytdl.filterFormats(formats, "audioonly")[0];
      if (af) {
        options.push({
          id: `merge-${h}`,
          type: "video",
          label: `${h}p (HD)`,
          quality: `${h}p`,
          container: "mp4",
          needsMerge: true,
          height: h,
          bitrateKbps: Math.round(
            ((parseInt(vf.bitrate || "0", 10) || 0) + (parseInt(af.bitrate || "0", 10) || 0)) / 1000
          ),
          sizeEstimateMB: estimateSize(
            lengthSeconds,
            (parseInt(vf.bitrate || "0", 10) || 0) + (parseInt(af.bitrate || "0", 10) || 0)
          ),
        });
        coveredHeights.add(h);
      }
    }
  }

  // ---- Audio: highest quality MP3 (ffmpeg transcode) ----
  const audioOnly = ytdl.filterFormats(formats, "audioonly");
  const bestAudio = audioOnly.sort(
    (a, b) => (parseInt(b.bitrate || "0", 10) || 0) - (parseInt(a.bitrate || "0", 10) || 0)
  )[0];
  if (bestAudio) {
    options.push({
      id: "audio-mp3",
      type: "audio",
      label: "MP3 (best)",
      quality: "MP3",
      container: "mp3",
      needsMerge: true,
      bitrateKbps: Math.round((parseInt(bestAudio.bitrate || "0", 10) || 0) / 1000),
      sizeEstimateMB: bestAudio.contentLength
        ? Math.round((parseInt(bestAudio.contentLength, 10) || 0) / 1024 / 1024)
        : estimateSize(lengthSeconds, parseInt(bestAudio.bitrate || "0", 10)),
    });
  }

  // ---- Audio: original opus (no transcode, fast) ----
  const opus = audioOnly.find((f) => f.container === "webm" || f.codecs?.includes("opus"));
  if (opus) {
    options.push({
      id: "audio-opus",
      type: "audio",
      label: "Opus (original)",
      quality: "Audio",
      container: "webm",
      itag: opus.itag,
      bitrateKbps: Math.round((parseInt(opus.bitrate || "0", 10) || 0) / 1000),
      sizeEstimateMB: opus.contentLength
        ? Math.round((parseInt(opus.contentLength, 10) || 0) / 1024 / 1024)
        : estimate(opus.bitrate),
    });
  }

  function estimate(bitrate?: string) {
    return estimateSize(lengthSeconds, parseInt(bitrate || "0", 10));
  }

  // Order: video high→low, then audio
  options.sort((a, b) => {
    if (a.type !== b.type) return a.type === "video" ? -1 : 1;
    return (b.height || 9999) - (a.height || 9999);
  });

  return {
    videoId,
    title: info.videoDetails.title,
    author: info.videoDetails.author?.name || "YouTube",
    lengthSeconds,
    thumbnail:
      info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url || "",
    options,
  };
}
