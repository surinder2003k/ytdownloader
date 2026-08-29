import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";
import os from "os";

// yt-dlp's embedded Python needs a writable temp dir. Use a known-good writable
// location: /tmp on Vercel/Linux, the OS temp dir elsewhere. Fall back gracefully.
function makeTmpBase(): string {
  const candidates = [process.env.TMPDIR, process.env.TEMP, process.env.TMP, "/tmp", os.tmpdir()];
  for (const c of candidates) {
    if (!c) continue;
    try {
      fs.mkdirSync(c, { recursive: true });
      const probe = fs.mkdtempSync(path.join(c, "ytgrab-"));
      return probe;
    } catch {
      continue;
    }
  }
  // last resort
  return fs.mkdtempSync(path.join(os.tmpdir(), "ytgrab-"));
}

const TMP_BASE = makeTmpBase();

// Resolve the bundled yt-dlp binary. We avoid `require.resolve('youtube-dl-exec/package.json')`
// because Next's webpack `require.resolve` returns a numeric module id, not a path.
// On Vercel the function cwd is the project root, so node_modules/youtube-dl-exec/bin
// is reachable directly. We pick the right extension per platform.
function resolveYtDlp(): string {
  const isWindows = process.platform === "win32";
  const ext = isWindows ? ".exe" : "";
  return path.join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    `yt-dlp${ext}`
  );
}

export const ffmpegBin = ffmpegPath.path;
export function getYtDlpBin(): string {
  return resolveYtDlp();
}

// yt-dlp's embedded Python runtime sometimes can't resolve the system TEMP dir
// inside a serverless/spawned context, so we hand it an explicit writable dir.
export const ytDlpEnv: NodeJS.ProcessEnv = {
  ...process.env,
  TMPDIR: TMP_BASE,
  TEMP: TMP_BASE,
  TMP: TMP_BASE,
};
