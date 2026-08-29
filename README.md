# YT Grab — Free YouTube Downloader

A fast, clean, and **100% free** YouTube downloader. Paste a link, pick a quality
(144p → 1080p video, plus MP3), and download. No ads, no accounts, no paid tiers.

🌐 **Live demo:** https://ytdownloader-tokm2neth-xyzg135-cpus-projects.vercel.app

---

## Features

- **Multi-quality video** — 144p, 240p, 360p, 480p, 720p, 1080p (and 1440p / 2160p
  when available), per the source stream.
- **Audio as MP3** — best available audio transcoded to MP3, plus the original
  audio container.
- **Zero friction** — just a URL, no sign-up, no tracking, no API key.
- **Direct CDN streaming** — progressive formats redirect straight to YouTube's CDN
  (no server bandwidth, instant start). Merged video + MP3 are processed with
  `yt-dlp` + `ffmpeg` and streamed back.
- **Clean UI** — responsive, smooth loaders, light minimal design.

## How it works

| Option type        | Backend                                  | Delivery                       |
| ------------------ | ---------------------------------------- | ------------------------------ |
| Progressive video  | `yt-dlp` resolves the direct media URL   | 302 redirect → YouTube CDN     |
| Merged video       | `yt-dlp` download + `ffmpeg` merge       | streamed file from Vercel      |
| MP3 / original aud | `yt-dlp` + `ffmpeg` transcode            | streamed file from Vercel      |

- **Info API** (`/api/info`): `yt-dlp --dump-single-json` → parsed quality list.
- **Download API** (`/api/download`): direct formats return a 302 to the media URL;
  merged/MP3 run `yt-dlp` + `ffmpeg` and stream the result back.

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS** for styling, **Framer Motion** for animations
- **yt-dlp** (vendored standalone Linux binary) + **ffmpeg** for processing
- Deployed on **Vercel**

## Local development

```bash
# install deps
npm install

# run dev server
npm run dev          # http://localhost:3000

# production build
npm run build && npm start
```

> On Windows, the download route uses the `youtube-dl-exec` bundled binary; on
> Linux/Vercel it uses the vendored standalone `yt-dlp` in `vendor/yt-dlp-linux`.

## Deploy your own

1. Fork / clone this repo.
2. Import into [Vercel](https://vercel.com) (framework auto-detected as Next.js).
3. Deploy — no environment variables required.

Function timeout is configured in `vercel.json` (download = 300s). On the Hobby
plan Vercel caps functions at 60s, so very long videos may time out on merge/MP3.

## Notes & legal

- Not affiliated with YouTube. Respect content owners' rights and YouTube's Terms
  of Service. Download only content you are permitted to.
- This tool relies on `yt-dlp`; if YouTube changes its internals, update the
  vendored binary in `vendor/` to the latest release.

## Project structure

```
app/
  page.tsx              # landing + UI shell
  api/info/route.ts     # fetch available formats (yt-dlp)
  api/download/route.ts # stream / redirect the chosen format
components/
  Downloader.tsx        # input + state + download logic
  QualityCard.tsx       # quality option card
  Shimmer.tsx           # loading skeletons
lib/
  ytdlp.ts              # binary + ffmpeg resolution, temp-dir handling
  formats.ts            # parse yt-dlp JSON into UI options
  types.ts              # shared types
vendor/
  yt-dlp-linux          # vendored standalone yt-dlp (bundles its own Python)
```
