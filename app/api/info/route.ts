import { NextRequest, NextResponse } from "next/server";
import { runYtDlp } from "@/lib/ytdlp";
import { buildVideoInfo } from "@/lib/formats";
import { runCobalt } from "@/lib/cobalt";

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
    const cobalt = await runCobalt(url, "720", false);
    if (!cobalt) {
      return NextResponse.json(
        { error: "No downloadable formats were found for this video." },
        { status: 422 }
      );
    }
    // Build a synthetic single-option response from the Cobalt tunnel.
    const metaTitle = (meta && (meta.title || meta.uploader)) || "video";
    return NextResponse.json({
      info: {
        title: metaTitle,
        author: meta?.uploader || "",
        lengthSeconds: meta?.duration || 0,
        thumbnail: (meta?.thumbnails && meta.thumbnails[meta.thumbnails.length - 1]?.url) || "",
        options: [
          {
            id: "cobalt-720",
            label: "720p",
            quality: "720p",
            container: "mp4",
            codec: "h264",
            size: "",
            needsMerge: false,
            source: "cobalt",
            cobaltUrl: cobalt.url,
            cobaltFilename: cobalt.filename,
            itag: null,
          },
        ],
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
