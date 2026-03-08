import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#E5E6DA",
          50: "#F5F5F0",
          100: "#EEEFE6",
          200: "#E5E6DA",
          300: "#D4D5C7",
          400: "#C0C1B0",
          500: "#A8A998",
        },
        olive: {
          DEFAULT: "#1D1E15",
          50: "#4A4B3D",
          100: "#3D3E31",
          200: "#2F3025",
          300: "#262719",
          400: "#1D1E15",
          500: "#14150E",
          600: "#0B0C07",
        },
        ember: {
          DEFAULT: "#DF6C42",
          50: "#F5D0C1",
          100: "#F1BEAB",
          200: "#EB9A7E",
          300: "#E58356",
          400: "#DF6C42",
          500: "#C45530",
          600: "#9A4326",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { opacity: "0.5" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
