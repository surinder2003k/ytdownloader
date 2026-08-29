/** @type {import('next').NextConfig} */
const nextConfig = {
  // ytdl-core uses dynamic requires; keep external so Vercel's serverless bundler
  // doesn't try to bundle it (which breaks at runtime).
  serverExternalPackages: ["@distube/ytdl-core", "fluent-ffmpeg", "@ffmpeg-installer/ffmpeg"],
  reactStrictMode: true,
};

export default nextConfig;
