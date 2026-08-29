import ytdl from "@distube/ytdl-core";

// Reuse a single ytdl instance across requests. A browser-like User-Agent
// reduces the chance YouTube serves a restricted/throttled stream on Vercel's
// shared IP. (Advanced users can add cookies via an env var if ever needed.)
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const getYtdl = () => ytdl;

export const requestOptions = {
  headers: {
    "User-Agent": UA,
    "Accept-Language": "en-US,en;q=0.9",
  },
};

export function isYouTubeUrl(url: string): boolean {
  return ytdl.validateURL(url);
}

export function getVideoId(url: string): string | null {
  try {
    return ytdl.getURLVideoID(url);
  } catch {
    return null;
  }
}
