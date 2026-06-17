import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#EFEBE0",
        paper2: "#F7F4EC",
        card: "#FCFBF6",
        ink: "#16150F",
        "ink-soft": "#56544A",
        "ink-faint": "#8C8A7E",
        line: "#16150F",
        lime: "#C6F751",
        "lime-deep": "#9BD400",
        cobalt: "#2B4BFF",
        vermilion: "#FF5B36",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        hard: "4px 4px 0 0 #16150F",
        "hard-sm": "2px 2px 0 0 #16150F",
        "hard-lg": "7px 7px 0 0 #16150F",
        "hard-lime": "5px 5px 0 0 #9BD400",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "ticker-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        blink: "ticker-blink 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
