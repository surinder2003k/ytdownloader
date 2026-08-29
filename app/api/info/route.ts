import { NextRequest, NextResponse } from "next/server";
import { isYouTubeUrl } from "@/lib/ytdl";
import { buildVideoInfo } from "@/lib/formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (!isYouTubeUrl(url)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid YouTube URL." },
      { status: 400 }
    );
  }

  try {
    const info = await buildVideoInfo(url);
    if (info.options.length === 0) {
      return NextResponse.json(
        { error: "No downloadable formats were found for this video." },
        { status: 422 }
      );
    }
    return NextResponse.json({ info });
  } catch (err: any) {
    console.error("info error:", err?.message || err);
    const msg =
      err?.message?.includes("Status code: 410") || err?.message?.includes("confirm")
        ? "YouTube blocked this request. Try again shortly, or use a different video."
        : "Could not fetch video info. The video may be private, region-locked, or unavailable.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
