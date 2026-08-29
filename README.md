# YT Grab — YouTube Multi-Quality Downloader

Next.js 15 app that downloads YouTube video & audio in multiple qualities
(144p → 1080p + MP3), with no disk storage. Streams are piped from YouTube
straight to the browser; ffmpeg (bundled via `@ffmpeg-installer/ffmpeg`) is
used only for 1080p merge and MP3 transcode.

## Run locally
```bash
npm install
npm run dev
```

## Deploy (Vercel, zero-config)
```bash
git push
# import repo at vercel.com — defaults work out of the box
```

> On Vercel's free tier, serverless functions hard-cap at 60s, so very long
> 1080p/MP3 merges may time out. For heavy use, run on Railway/Render.

## API
- `POST /api/info`  → `{ url }` returns `{ info: { title, options[] } }`
- `POST /api/download` → `{ url, optionId }` returns a streamed media file
