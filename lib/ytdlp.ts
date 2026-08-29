import youtubedl from "youtube-dl-exec";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";

const TMP_BASE = path.join(process.cwd(), ".yt-tmp");
try {
  if (!fs.existsSync(TMP_BASE)) fs.mkdirSync(TMP_BASE, { recursive: true });
} catch {}

// Resolve the bundled yt-dlp binary. We avoid `require.resolve('youtube-dl-exec/package.json')`
// because Next's webpack `require.resolve` returns a numeric module id, not a path.
function resolveYtDlp(): string {
  const candidates = [
    path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp.exe"),
    path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp"),
    path.join(__dirname, "..", "..", "node_modules", "youtube-dl-exec", "bin", "yt-dlp.exe"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]; // best-effort
}

export const ffmpegBin = ffmpegPath.path;
export function getYtDlpBin(): string {
  return resolveYtDlp();
}
export { youtubedl };

// yt-dlp's embedded Python runtime sometimes can't resolve the system TEMP dir
// inside a serverless/spawned context, so we hand it an explicit writable dir.
export const ytDlpEnv: NodeJS.ProcessEnv = {
  ...process.env,
  TMPDIR: TMP_BASE,
  TEMP: TMP_BASE,
  TMP: TMP_BASE,
};

export const requestOptions = {
  noPlaylist: true,
  noWarnings: true,
  jsRuntimes: "node",
  ffmpegLocation: ffmpegBin,
  addHeader: ["User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"],
};
