import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        background: "rgb(18 18 18 / <alpha-value>)",
        foreground: "rgb(245 245 245 / <alpha-value>)",
        card: {
          DEFAULT: "rgb(30 30 30 / <alpha-value>)",
          foreground: "rgb(245 245 245 / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(245 245 245 / <alpha-value>)",
          hover: "#ffffff",
          foreground: "rgb(18 18 18 / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(36 36 36 / <alpha-value>)",
          foreground: "rgb(163 163 163 / <alpha-value>)",
        },
        accent: {
          DEFAULT: "#8b5cf6",
          foreground: "#ffffff",
        },
        danger: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
        border: "rgb(255 255 255 / 0.08)",
        cc: {
          bg: "rgb(18 18 18 / <alpha-value>)",
          secondary: "rgb(24 24 24 / <alpha-value>)",
          surface: "rgb(30 30 30 / <alpha-value>)",
          "surface-raised": "rgb(36 36 36 / <alpha-value>)",
          "surface-hover": "rgb(42 42 42 / <alpha-value>)",
          border: "rgb(255 255 255 / 0.08)",
          "border-strong": "rgb(255 255 255 / 0.14)",
          text: "rgb(245 245 245 / <alpha-value>)",
          muted: "rgb(163 163 163 / <alpha-value>)",
          subtle: "rgb(115 115 115 / <alpha-value>)",
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-pulse": "glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(to bottom right, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01))",
      },
    },
  },
  plugins: [],
};

export default config;
