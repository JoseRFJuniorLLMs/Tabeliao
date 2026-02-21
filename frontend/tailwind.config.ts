import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1e3a5f",
          50: "#eef4fb",
          100: "#d5e3f3",
          200: "#aec8e7",
          300: "#7ea7d8",
          400: "#5587c5",
          500: "#3a6aab",
          600: "#2d5389",
          700: "#1e3a5f",
          800: "#162c49",
          900: "#0f1e33",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#c9a84c",
          50: "#fbf8ee",
          100: "#f5edd3",
          200: "#ebd9a6",
          300: "#dfbf72",
          400: "#d4ab55",
          500: "#c9a84c",
          600: "#b08a30",
          700: "#8f6e28",
          800: "#6e5520",
          900: "#4d3b16",
          foreground: "#1e3a5f",
        },
        accent: {
          DEFAULT: "#2dd4bf",
          50: "#effefb",
          100: "#c8fff5",
          200: "#91feeb",
          300: "#53f5de",
          400: "#2dd4bf",
          500: "#0fb8a6",
          600: "#099488",
          700: "#0c766e",
          800: "#0f5e59",
          900: "#114e4a",
          foreground: "#1e3a5f",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "#22c55e",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#1e3a5f",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
