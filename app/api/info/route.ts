import { NextRequest, NextResponse } from "next/server";
import { runYtDlp } from "@/lib/ytdlp";
import { buildVideoInfo } from "@/lib/formats";
import { runCobalt, runCobaltAudio, runCobaltMulti } from "@/lib/cobalt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_RE = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/.+$/i;

export async function POST(req: NextRequest) {
  let body: { url?: string; cookies?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = (body.url || "").trim();
  const cookies = typeof body.cookies === "string" ? body.cookies : "";
  if (!url) {
    return NextResponse.json({ error: "YouTube URL is required." }, { status: 400 });
  }
  if (!URL_RE.test(url)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid YouTube URL." },
      { status: 400 }
    );
  }

  try {
    const meta = await runYtDlp(
      [url, "--dump-single-json", "--skip-download"],
      { parseJson: true, cookieTxt: cookies }
    );

    const info = buildVideoInfo(meta);
    if (info && info.options.length) {
      return NextResponse.json({ info });
    }
    // yt-dlp gave us no usable formats (e.g. Vercel IP got SABR-locked).
    // Fall back to Cobalt (uses residential IPs, handles YouTube auth properly).
    // Build options from Cobalt results (multi-quality + audio)
    const cobaltVideo = await runCobalt(url, "max", false);
    const cobaltAudio = await runCobaltAudio(url);
    const options: any[] = [];
    // Multiple video qualities
    const videoQualities = ["max", "720", "1080", "480", "360", "240", "144"];
    for (const q of videoQualities) {
      const r = await runCobalt(url, q, false);
      if (r && !options.find(o => o.quality === r.quality)) {
        options.push({
          id: "cobalt-" + r.quality,
          label: r.label || r.quality + (r.quality === "max" ? " (Best)" : "p"),
          quality: r.quality === "max" ? "2160p (Best)" : r.quality + "p",
          container: "mp4",
          codec: "h264",
          needsMerge: false,
          source: "cobalt",
          cobaltUrl: r.url,
          cobaltFilename: r.filename,
          itag: null,
        });
      }
      // Small delay to avoid hammering Railway
      if (q !== "144") await new Promise(r => setTimeout(r, 200));
    }
    // Audio option (if different from video)
    if (cobaltAudio && !options.find(o => o.id === "cobalt-audio")) {
      options.push({
        id: "cobalt-audio",
        label: "MP3 (Audio only)",
        quality: "MP3 128kbps",
        container: "mp3",
        codec: "mp3",
        needsMerge: false,
        source: "cobalt",
        cobaltUrl: cobaltAudio.url,
        cobaltFilename: cobaltAudio.filename,
        itag: null,
      });
    }
    // Extract videoId and title from URL / metadata
    const videoIdMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/) || url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : "";
    const metaTitle = (meta && (meta.title || meta.uploader)) || "video";
    // Playlist support
    const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    const isPlaylist = !!playlistMatch;
    const playlistId = playlistMatch ? playlistMatch[1] : null;
    return NextResponse.json({
      info: {
        videoId,
        title: metaTitle,
        author: meta?.uploader || "",
        lengthSeconds: meta?.duration || 0,
        thumbnail: (meta?.thumbnails && meta.thumbnails[meta.thumbnails.length - 1]?.url) || "",
        options: options.length ? options : [{ id: "cobalt-720", label: "720p (Cobalt)", quality: "720p", container: "mp4", codec: "h264", needsMerge: false, source: "cobalt", cobaltUrl: cobaltVideo?.url || "", cobaltFilename: cobaltVideo?.filename || "video", itag: null }],
        isPlaylist: !!playlistId,
        playlistId: playlistId || undefined,
        cobalt: true,
      },
    });
  } catch (err: any) {
    const msg = err?.message || "";
    console.error("info error:", msg.slice(0, 300));
    if (/Private|unavailable|not available/i.test(msg)) {
      return NextResponse.json(
        { error: "This video is private or unavailable." },
        { status: 404 }
      );
    }
    if (/Sign in|blocked|bot|unusual traffic|429|try again/i.test(msg)) {
      return NextResponse.json(
        { error: "YouTube blocked this request. Try again in a moment." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Could not fetch video info. Please check the URL and try again." },
      { status: 502 }
    );
  }
}
