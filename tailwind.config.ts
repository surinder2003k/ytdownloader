import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#06b6d4", // calm cyan
          dark: "#0891b2",
          light: "#22d3ee",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#475569",
          faint: "#94a3b8",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f1f5f9",
          border: "#e2e8f0",
        },
        danger: "#e11d48",
        success: "#059669",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.06)",
        soft: "0 1px 2px rgba(15,23,42,0.05)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
