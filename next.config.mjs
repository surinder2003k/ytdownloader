/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native binaries external so the serverless bundler doesn't try to
  // bundle the yt-dlp / ffmpeg executables (which would break at runtime).
  serverExternalPackages: ["youtube-dl-exec", "@ffmpeg-installer/ffmpeg"],
  reactStrictMode: true,
};

export default nextConfig;
