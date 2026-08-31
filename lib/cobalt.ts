// Cobalt v11 fallback. Used when yt-dlp can't fetch formats (IP-blocked, SABR
// locked, etc). Cobalt is an open-source media-downloader that uses residential
// IPs and proper YouTube auth, so it bypasses the Vercel datacenter IP block.
//
// We use a rotating list of public free community instances that support
// YouTube. If one fails (rate-limit, downtime), we try the next.

const COBALT_INSTANCES = [
  "https://cblt.fariz.dev",
  // Add more public YouTube-supporting Cobalt v11 instances here as fallbacks.
];

export type CobaltQuality = "144" | "240" | "360" | "480" | "720" | "1080" | "1440" | "2160" | "max";

export interface CobaltResult {
  status: "tunnel" | "redirect" | "stream";
  url: string;
  filename: string;
}

function sanitizeQuality(q?: string): CobaltQuality {
  const allowed: CobaltQuality[] = ["144", "240", "360", "480", "720", "1080", "1440", "2160", "max"];
  return (allowed.includes(q as CobaltQuality) ? (q as CobaltQuality) : "720");
}

/**
 * Ask a Cobalt instance to download `url` at `quality`.
 * Returns the tunnel/redirect URL + filename on success, or null if every
 * instance failed.
 */
export async function runCobalt(
  url: string,
  quality: string = "720",
  isAudioOnly: boolean = false
): Promise<CobaltResult | null> {
  const q = sanitizeQuality(quality);
  const body = isAudioOnly
    ? { url, audioFormat: "best", downloadMode: "audio", filenameStyle: "classic" }
    : { url, videoQuality: q, audioFormat: "best", downloadMode: "auto", filenameStyle: "classic" };

  let lastErr: string = "";
  for (const base of COBALT_INSTANCES) {
    try {
      const res = await fetch(base + "/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        lastErr = `non-json from ${base}: ${text.slice(0, 80)}`;
        continue;
      }
      if (data?.status === "error" || data?.status === "rate-limit" || data?.status === "picker") {
        lastErr = `${base}: ${data?.error?.code || data?.status}`;
        continue;
      }
      if ((data?.status === "tunnel" || data?.status === "redirect" || data?.status === "stream") && data?.url) {
        return {
          status: data.status,
          url: data.url,
          filename: data.filename || "video",
        };
      }
      lastErr = `${base}: unexpected payload ${JSON.stringify(data).slice(0, 120)}`;
    } catch (e: any) {
      lastErr = `${base}: ${e?.message || e}`;
    }
  }
  if (lastErr) console.error("[cobalt] all instances failed:", lastErr);
  return null;
}
