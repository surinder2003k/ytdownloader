import { NextRequest } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { ffmpegBin, getYtDlpBin, ytDlpEnv } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function sanitize(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "video"
  );
}

async function resolveParams(req: NextRequest): Promise<{ url: string; optionId: string } | null> {
  if (req.method === "POST") {
    try {
      const body = (await req.json()) as { url?: string; optionId?: string };
      const url = (body.url || "").trim();
      const optionId = (body.optionId || "").trim();
      if (url && optionId) return { url, optionId };
    } catch {}
  }
  const url = (req.nextUrl.searchParams.get("url") || "").trim();
  const optionId = (req.nextUrl.searchParams.get("optionId") || "").trim();
  if (url && optionId) return { url, optionId };
  return null;
}

// Run yt-dlp directly (no wrapper) and return parsed JSON. This avoids the
// youtube-dl-exec CJS/ESM wrapper quirks inside Next's bundled runtime.
function ytDlpJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      getYtDlpBin(),
      [
        url,
        "--dump-single-json",
        "--skip-download",
        "--no-playlist",
        "--no-warnings",
        "--js-runtimes",
        "node",
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
      } catch (e) {
        reject(new Error("Failed to parse yt-dlp output"));
      }
    });
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const params = await resolveParams(req);
  if (!params) return new Response("Missing url or optionId.", { status: 400 });
  const { url, optionId } = params;

  // ---------- DIRECT formats: redirect browser straight to the media URL ----------
  if (!optionId.startsWith("merge-") && !optionId.startsWith("audio-mp3")) {
    try {
      const meta = await ytDlpJson(url);
      const fmtId = optionId.replace(/^prog-|audio-orig-/, "");
      const fmt = (meta.formats || []).find((f: any) => String(f.format_id) === fmtId);
      if (!fmt || !fmt.url) {
        return new Response("Format no longer available.", { status: 422 });
      }
      return new Response(null, {
        status: 302,
        headers: { Location: fmt.url, "Cache-Control": "no-store" },
      });
    } catch {
      return new Response("Failed to resolve direct stream.", { status: 502 });
    }
  }

  // ---------- MERGED (video+audio) or MP3: yt-dlp + ffmpeg, then stream ----------
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ytdl-"));
  let outExt: "mp4" | "mp3" = "mp4";
  let ytdlFormat: string;

  if (optionId.startsWith("merge-")) {
    const h = parseInt(optionId.replace("merge-", ""), 10);
    ytdlFormat = `bestvideo[height=${h}]+bestaudio/best[height<=${h}]`;
    outExt = "mp4";
  } else {
    ytdlFormat = "bestaudio";
    outExt = "mp3";
  }

  const outPath = path.join(workDir, `out.${outExt}`);

  let niceName = "video";
  try {
    const m = await ytDlpJson(url);
    niceName = sanitize(m.title || "video");
  } catch {}
  const finalName = `${niceName}.${outExt}`;

  const args = [
    url,
    "-f",
    ytdlFormat,
    ...(outExt === "mp4"
      ? ["--merge-output-format", "mp4"]
      : ["-x", "--audio-format", "mp3", "--audio-quality", "0"]),
    "-o",
    outPath,
    "--no-playlist",
    "--js-runtimes",
    "node",
    "--ffmpeg-location",
    ffmpegBin,
    "--postprocessor-args",
    "ffmpeg:-strict experimental",
    "--no-warnings",
    "--add-header",
    "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(getYtDlpBin(), args, { windowsHide: true, env: ytDlpEnv });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-500)}`));
    });
  });

  if (!fs.existsSync(outPath)) {
    return new Response("Output file was not produced.", { status: 502 });
  }

  const stat = fs.statSync(outPath);
  const fileStream = fs.createReadStream(outPath);
  const contentType = outExt === "mp3" ? "audio/mpeg" : "video/mp4";

  const cleanup = () => {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}
  };
  fileStream.on("end", cleanup);
  fileStream.on("error", cleanup);

  return new Response(fileStream as any, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${finalName}"`,
      "Cache-Control": "no-store",
    },
  });
}
