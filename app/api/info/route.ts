import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { ffmpegBin, getYtDlpBin, ytDlpEnv } from "@/lib/ytdlp";
import { buildVideoInfo } from "@/lib/formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_RE = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/.+$/i;

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = (body.url || "").trim();
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
    const meta = await new Promise<any>((resolve, reject) => {
      const child = spawn(
        getYtDlpBin(),
        [
          url,
          "--dump-single-json",
          "--skip-download",
          "--no-playlist",
          "--no-warnings",
          "--ffmpeg-location",
          ffmpegBin,
          "--add-header",
          "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ],
        { windowsHide: true, env: ytDlpEnv }
      );
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => (out += d.toString()));
      child.stderr.on("data", (d) => (err += d.toString()));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) return reject(new Error(err.slice(-400) || `exit ${code}`));
        try {
          resolve(JSON.parse(out));
        } catch {
          reject(new Error("Failed to parse yt-dlp output"));
        }
      });
    });

    const info = buildVideoInfo(meta);
    if (!info || !info.options.length) {
      return NextResponse.json(
        { error: "No downloadable formats were found for this video." },
        { status: 422 }
      );
    }
    return NextResponse.json({ info });
  } catch (err: any) {
    const msg = err?.message || "";
    console.error("info error:", msg.slice(0, 300));
    if (msg.includes("Sign in") || msg.includes("bot")) {
      return NextResponse.json(
        { error: "YouTube blocked this request. Try again in a moment." },
        { status: 502 }
      );
    }
    if (msg.includes("Private") || msg.includes("unavailable")) {
      return NextResponse.json(
        { error: "This video is private or unavailable." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Could not fetch video info. Please check the URL and try again." },
      { status: 502 }
    );
  }
}
