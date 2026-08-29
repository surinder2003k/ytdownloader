import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn } from "child_process";

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

// YouTube's bot detection frequently blocks datacenter IPs (e.g. Vercel) when
// using the default `web` client. The `tv` / `tv_embedded` / `android` clients
// are far less aggressively throttled. We try several, in order, and retry.
const YT_CLIENTS = [
  "android,web",
  "tv,web_safari,web",
  "tv_embedded,web",
  "web",
];

const REAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run yt-dlp and resolve with full stdout. Retries across multiple YouTube
 * player clients and once with a short backoff to ride out transient
 * "YouTube blocked this request" / bot-detection errors.
 */
export function runYtDlp(
  extraArgs: string[],
  opts: { parseJson?: boolean; timeoutMs?: number } = {}
): Promise<any> {
  const { parseJson = false, timeoutMs = 240_000 } = opts;
  const baseArgs = [
    ...extraArgs,
    "--no-playlist",
    "--no-warnings",
    "--ignore-no-formats-error",
    "--ffmpeg-location",
    ffmpegBin,
    "--add-header",
    `User-Agent:${REAL_UA}`,
    "--extractor-args",
  ];

  async function attempt(clientOrder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        ...baseArgs,
        `youtube:player_client=${clientOrder}`,
      ];
      const child = spawn(getYtDlpBin(), args, {
        windowsHide: true,
        env: ytDlpEnv,
        timeout: timeoutMs,
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (d: Buffer) => (out += d.toString()));
      child.stderr.on("data", (d: Buffer) => (err += d.toString()));
      child.on("error", reject);
      child.on("close", (code: number) => {
        if (code === 0) return resolve(out);
        reject(new Error(err.slice(-600) || `exit ${code}`));
      });
    });
  }

  return (async () => {
    let lastErr = "";
    for (let i = 0; i < YT_CLIENTS.length; i++) {
      try {
        const raw = await attempt(YT_CLIENTS[i]);
        return parseJson ? JSON.parse(raw) : raw;
      } catch (e: any) {
        lastErr = e?.message || String(e);
        // Retry across every client with a short backoff. Some clients fail for
        // reasons other than a block (e.g. "format not available"), but another
        // client in the list may still succeed — so we exhaust the whole list.
        if (i < YT_CLIENTS.length - 1) await sleep(700 * (i + 1));
      }
    }
    throw new Error(lastErr || "YouTube blocked this request. Try again in a moment.");
  })();
}

// Resolve the yt-dlp binary. On Linux (Vercel) we use our vendored standalone
// ELF binary which bundles its own Python — the youtube-dl-exec package ships a
// python3 wrapper on Linux that fails ("env: python3: No such file or directory")
// because serverless runtimes have no system python3. On Windows we use the
// youtube-dl-exec binary (PE32, bundles Python too).
function resolveYtDlp(): string {
  const isWindows = process.platform === "win32";
  if (!isWindows) {
    const vendored = path.join(process.cwd(), "vendor", "yt-dlp-linux");
    if (fs.existsSync(vendored)) return vendored;
  }
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
