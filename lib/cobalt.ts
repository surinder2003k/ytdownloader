const RAILWAY_KEY = process.env.COBALT_API_KEY || "";
const COBALT_INSTANCES = [
  { url: "https://cobalt-production-6c47.up.railway.app", apiKey: RAILWAY_KEY },
  "https://cblt.fariz.dev",
];
export type CobaltQuality = "144"|"240"|"360"|"480"|"720"|"1080"|"1440"|"2160"|"max";
export interface CobaltResult { status: string; url: string; filename: string; quality?: string; label?: string; }
function sanitizeQuality(q?: string): CobaltQuality {
  const allowed = ["144","240","360","480","720","1080","1440","2160","max"];
  return (allowed.includes(q as CobaltQuality) ? (q as CobaltQuality) : "720");
}
export async function runCobalt(url: string, quality: string = "max", isAudioOnly: boolean = false): Promise<CobaltResult|null> {
  const q = sanitizeQuality(quality);
  const body = isAudioOnly ? { url, audioFormat: "best", downloadMode: "audio", filenameStyle: "classic" }
    : { url, videoQuality: q, audioFormat: "best", downloadMode: "auto", filenameStyle: "classic" };
  let lastErr = "";
  for (const base of COBALT_INSTANCES) {
    const isObj = typeof base === "object"; const baseUrl = isObj ? (base as any).url : (base as string); const apiKey = isObj ? (base as any).apiKey || "" : "";
    try {
      const headers: Record<string,string> = { "Content-Type":"application/json", Accept:"application/json" };
      if (apiKey) headers["Authorization"] = `Api-Key ${apiKey}`;
      const res = await fetch(baseUrl + "/", { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await res.text(); let data: any;
      try { data = JSON.parse(text); } catch { lastErr = `non-json from ${baseUrl}`; continue; }
      if (data?.status === "error" || data?.status === "rate-limit" || data?.status === "picker") { lastErr = `${baseUrl}: ${data?.error?.code||data?.status}`; continue; }
      if ((data?.status === "tunnel" || data?.status === "redirect" || data?.status === "stream") && data?.url) {
        return { status: data.status, url: data.url, filename: data.filename || "video", quality: q, label: q === "max" ? "Best quality" : q + "p" };
      }
      lastErr = `${baseUrl}: unexpected payload`;
    } catch (e:any) { lastErr = `${baseUrl}: ${e?.message||e}`; }
  }
  if (lastErr) console.error("[cobalt] all instances failed:", lastErr);
  return null;
}
export async function runCobaltMulti(url: string): Promise<CobaltResult[]> {
  const qualities = ["max", "720", "1080", "480", "360", "240", "144"];
  const results: CobaltResult[] = [];
  for (const q of qualities) {
    const r = await runCobalt(url, q, false);
    if (r) results.push({ ...r, label: q === "max" ? "Best quality (up to 4K)" : q + "p", quality: q });
  }
  // Deduplicate by quality
  const seen = new Set();
  return results.filter(r => { const k = r.quality || r.label; if (seen.has(k)) return false; seen.add(k); return true; });
}
export async function runCobaltAudio(url: string): Promise<CobaltResult|null> {
  return runCobalt(url, "best", true);
}
