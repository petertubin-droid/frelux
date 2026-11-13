/**
 * Warm neutral ramp (2026-11-13, "warm and calm" polish).
 *
 * The interface was built on Tailwind's cool slate/gray/zinc neutrals, and
 * ~880 call sites still name them directly (text-slate-500, border-slate-200,
 * bg-slate-50 ...). Re-tinting every one of those by hand would be a huge,
 * unreviewable diff, so the four cool families are aliased to this single
 * sand-toned ramp instead: same contrast hierarchy, warm instead of blue-grey.
 *
 * Contrast was checked against the warm background (#FBF7F1): 500 reads 4.8:1
 * and 600 6.6:1, so secondary copy keeps AA. 400 stays a muted label tone,
 * matching how the old slate-400 behaved.
 */
const WARM_NEUTRALS = {
  50: "#FAF7F2",
  100: "#F4EFE7",
  200: "#E7DFD3",
  300: "#D5C9B8",
  400: "#A99A88",
  500: "#786C5D",
  600: "#5F5547",
  700: "#4A4238",
  800: "#2F2A24",
  900: "#221F1B",
  950: "#141210",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // shadcn/ui semantic tokens — hsl(var(--token) / <alpha>)
        // Warm paper white instead of #FFFFFF: 750 `bg-white` surfaces sat
        // #FFFFFF next to the warm background, which read as a cold rectangle.
        // #FFFDF9 keeps the same lightness and card separation, minus the blue.
        white: "#FFFDF9",
        background: {
          DEFAULT: "hsl(var(--background) / <alpha-value>)",
          mid: "hsl(var(--background-mid) / <alpha-value>)",
        },
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          light: "hsl(var(--primary-light) / <alpha-value>)",
          lighter: "hsl(var(--primary-lighter) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        // Merged: shadcn semantic tokens + custom accent colors
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          orange: "rgb(var(--brand-accent) / <alpha-value>)",
          yellow: "#EAB308",
          green: "#10B981",
          "green-light": "#34D399",
          cyan: "#06B6D4",
          "cyan-light": "#22D3EE",
          rose: "#F43F5E",
          amber: "#F59E0B",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",

        brand: {
          purple: "rgb(var(--brand-primary) / <alpha-value>)",
          "purple-light": "#8B5CF6",
          "purple-lighter": "#A78BFA",
          "purple-dark": "#5B21B6",
          "purple-deep": "#4C1D95",
          navy: "rgb(var(--brand-secondary) / <alpha-value>)",
          "navy-mid": "#221D17",
          "navy-light": "#2C251D",
          "navy-soft": "#3A322A",
        },
        neutral: WARM_NEUTRALS,
        // Cool families are aliased to the warm ramp so no legacy call site
        // can reintroduce a blue-grey surface. See WARM_NEUTRALS above.
        slate: WARM_NEUTRALS,
        gray: WARM_NEUTRALS,
        zinc: WARM_NEUTRALS,
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-headings)", "system-ui", "sans-serif"],
        hero: [
          '"Clash Display"',
          "var(--font-headings)",
          "system-ui",
          "sans-serif",
        ],
        nav: ["var(--font-nav)", "system-ui", "sans-serif"],
        btn: ["var(--font-btn)", "system-ui", "sans-serif"],
        calcTitle: ["var(--font-calc-title)", "system-ui", "sans-serif"],
        calcResult: ["var(--font-calc-result)", "system-ui", "sans-serif"],
        admin: ["var(--font-admin)", "system-ui", "sans-serif"],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "xl-lg": "0.875rem",
        "2xl-lg": "1.25rem",
        // FRELUX curve scale: content panels, floating chrome, full sheets.
        "3xl-lg": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        "card-hover":
          "0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03)",
        elevated:
          "0 12px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)",
        premium:
          "0 2px 8px rgba(0, 0, 0, 0.03), 0 12px 32px rgba(0, 0, 0, 0.05)",
        "premium-lg":
          "0 4px 12px rgba(0, 0, 0, 0.04), 0 24px 64px rgba(0, 0, 0, 0.08)",
        glow: "0 0 0 1px rgb(var(--brand-primary) / 0.08), 0 8px 32px rgb(var(--brand-primary) / 0.06)",
        "glow-purple":
          "0 0 0 1px rgb(var(--brand-primary) / 0.1), 0 8px 32px rgb(var(--brand-primary) / 0.1)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        "dark-card":
          "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        // A hairline top highlight plus a low, wide shadow: the edge reads as
        // a bevel on a curved surface rather than a flat drop shadow.
        curve:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 18px 44px -30px rgba(48, 33, 22, 0.28)",
        float: "0 14px 38px -22px rgba(48, 33, 22, 0.26)",
        "dark-card-hover":
          "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)",
      },
      animation: {
        marquee: "marquee 36s linear infinite",
        "animate-in": "animate-in 0.15s ease-out",
        "animate-out": "animate-out 0.15s ease-out",
        "fade-in": "fade-in 0.5s ease-out both",
        "fade-out": "fade-out 0.15s ease-out both",
        "fade-in-0": "fade-in-0 0.15s ease-out both",
        "fade-out-0": "fade-out-0 0.15s ease-out both",
        "zoom-in-95": "zoom-in-95 0.15s ease-out both",
        "zoom-out-95": "zoom-out-95 0.15s ease-out both",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in-down": "fade-in-down 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "chat-bounce":
          "chat-bounce 2.8s cubic-bezier(0.28, 0.84, 0.42, 1) infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "float-smooth": "float-smooth 8s ease-in-out infinite",
        "mesh-shift": "mesh-shift 12s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-pulse": "gradient-pulse 4s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "animate-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "animate-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(4px)" },
        },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "fade-out": { "0%": { opacity: "1" }, "100%": { opacity: "0" } },
        "fade-in-0": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out-0": { from: { opacity: "1" }, to: { opacity: "0" } },
        "zoom-in-95": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "zoom-out-95": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: { "0%, 100%": { opacity: "0.5" }, "50%": { opacity: "1" } },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "chat-bounce": {
          "0%, 100%": { transform: "translateY(0) scale(1, 1)" },
          "28%": { transform: "translateY(-16%) scale(0.94, 1.08)" },
          "50%": { transform: "translateY(0) scale(1.07, 0.9)" },
          "66%": { transform: "translateY(-7%) scale(0.98, 1.03)" },
          "82%": { transform: "translateY(0) scale(1.02, 0.97)" },
        },
        "float-smooth": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "33%": { transform: "translateY(-10px) rotate(0.5deg)" },
          "66%": { transform: "translateY(-5px) rotate(-0.5deg)" },
        },
        "mesh-shift": {
          "0%, 100%": { "background-position": "0% 0%" },
          "25%": { "background-position": "100% 50%" },
          "50%": { "background-position": "50% 100%" },
          "75%": { "background-position": "0% 50%" },
        },
        "pulse-ring": {
          "0%": { "box-shadow": "0 0 0 0 rgb(var(--brand-primary) / 0.3)" },
          "70%": { "box-shadow": "0 0 0 12px rgb(var(--brand-primary) / 0)" },
          "100%": { "box-shadow": "0 0 0 0 rgb(var(--brand-primary) / 0)" },
        },
        "gradient-pulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      backgroundImage: {
        "mesh-purple":
          "radial-gradient(at 20% 20%, rgb(var(--brand-primary) / 0.15) 0px, transparent 50%), radial-gradient(at 80% 80%, rgb(var(--brand-primary) / 0.1) 0px, transparent 50%)",
      },
    },
  },
  plugins: [],
};
