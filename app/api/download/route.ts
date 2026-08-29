import { NextRequest } from "next/server";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { Writable } from "stream";
import { requestOptions, isYouTubeUrl } from "@/lib/ytdl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Best-effort long download window (hard-capped at 60s on Vercel free).
export const maxDuration = 300;

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function sanitize(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "video"
  );
}

export async function POST(req: NextRequest) {
  let body: { url?: string; optionId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const url = (body.url || "").trim();
  const optionId = (body.optionId || "").trim();

  if (!url || !isYouTubeUrl(url)) {
    return new Response("Invalid YouTube URL.", { status: 400 });
  }
  if (!optionId) {
    return new Response("Missing optionId.", { status: 400 });
  }

  let info;
  try {
    info = await ytdl.getInfo(url, { requestOptions });
  } catch (err: any) {
    return new Response(
      err?.message?.includes("confirm")
        ? "YouTube blocked this request (bot-check). Try again shortly."
        : "Could not fetch video info.",
      { status: 502 }
    );
  }

  const title = sanitize(info.videoDetails.title);
  const formats = info.formats;

  // ---------- Progressive (single combined stream, no ffmpeg) ----------
  if (optionId.startsWith("prog-")) {
    const height = parseInt(optionId.split("-")[1], 10);
    const fmt = ytdl.filterFormats(formats, "videoandaudio").find(
      (f) => f.height === height && f.container === "mp4"
    );
    if (!fmt || !fmt.url) {
      return new Response("Requested quality is no longer available.", { status: 422 });
    }
    const stream = ytdl.downloadFromInfo(info, { format: fmt, requestOptions });
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${title}-${height}p.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // ---------- Audio-only opus (direct, no transcode) ----------
  if (optionId === "audio-opus") {
    const fmt = ytdl.filterFormats(formats, "audioonly").find(
      (f) => f.container === "webm" || f.codecs?.includes("opus")
    );
    if (!fmt || !fmt.url) {
      return new Response("Requested audio is no longer available.", { status: 422 });
    }
    const stream = ytdl.downloadFromInfo(info, { format: fmt, requestOptions });
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "audio/webm",
        "Content-Disposition": `attachment; filename="${title}.webm"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // ---------- Merged (video + audio) OR MP3 via ffmpeg ----------
  const audioOnly = ytdl
    .filterFormats(formats, "audioonly")
    .sort(
      (a, b) => (parseInt(b.bitrate || "0", 10) || 0) - (parseInt(a.bitrate || "0", 10) || 0)
    );
  const bestAudio = audioOnly[0];
  if (!bestAudio || !bestAudio.url) {
    return new Response("No audio stream available for merge.", { status: 422 });
  }

  let videoStream: NodeJS.ReadableStream | undefined;
  let isMp3 = false;

  if (optionId.startsWith("merge-")) {
    const height = parseInt(optionId.split("-")[1], 10);
    const vf = ytdl.filterFormats(formats, "videoonly").find((f) => f.height === height);
    if (!vf || !vf.url) {
      return new Response("Requested quality is no longer available.", { status: 422 });
    }
    videoStream = ytdl.downloadFromInfo(info, { format: vf, requestOptions });
  } else if (optionId === "audio-mp3") {
    isMp3 = true;
  } else {
    return new Response("Unknown option.", { status: 400 });
  }

  const audioStream = ytdl.downloadFromInfo(info, { format: bestAudio, requestOptions });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sink = new Writable({
    write(chunk: Buffer, _enc, cb) {
      writer.write(chunk).then(() => cb(), () => cb());
    },
  });

  const command = ffmpeg();
  if (videoStream) {
    command.input(videoStream).input(audioStream);
    command.videoCodec("copy").audioCodec("aac");
  } else {
    command.input(audioStream);
    command.audioCodec("libmp3lame").audioFrequency(44100);
  }
  command
    .format(isMp3 ? "mp3" : "mp4")
    .outputOptions(isMp3 ? ["-q:a", "2"] : ["-movflags", "frag_keyframe+empty_moov"])
    .on("error", (e: any) => {
      console.error("ffmpeg error:", e?.message || e);
      try {
        writer.close();
      } catch {}
    })
    .on("end", () => {
      try {
        writer.close();
      } catch {}
    })
    .pipe(sink);

  const filename = isMp3 ? `${title}.mp3` : title + ".mp4";
  const contentType = isMp3 ? "audio/mpeg" : "video/mp4";

  return new Response(readable, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
