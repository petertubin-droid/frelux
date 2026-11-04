import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Only load Sentry plugin when auth token is available (prevents build issues on Netlify)
const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;
const sentryVitePlugin = hasSentryToken
  ? (await import("@sentry/vite-plugin")).sentryVitePlugin
  : null;

// https://vite.dev/config/
// Build version — injected as VITE_APP_VERSION for error tracking
const APP_VERSION =
  process.env.COMMIT_REF?.slice(0, 7) ||
  process.env.npm_package_version ||
  `dev-${Date.now()}`;

export default defineConfig({
  plugins: [
    react(),
    ...(sentryVitePlugin
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
          }),
        ]
      : []),
  ],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(APP_VERSION),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@studio-shared": fileURLToPath(
        new URL("./supabase/functions/_shared", import.meta.url),
      ),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    // Only generate hidden sourcemaps when Sentry is configured
    sourcemap: hasSentryToken ? "hidden" : false,
    rollupOptions: {
      output: {
        // Vendor chunk splitting for better caching
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("react-router-dom") ||
            id.includes("/react-dom/") ||
            id.includes("/react/")
          ) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) {
            return "supabase-vendor";
          }
          // Icons and UI primitives used to land as one file each: 71
          // modulepreload requests before hydration, and a request is the
          // expensive part on a weak signal, not the bytes. Group the libraries
          // the shell always needs. Tree shaking still runs, and the heavy
          // optional libraries (MapLibre, web-ifc, jsPDF, Recharts) stay in
          // their own lazily imported chunks and are not pulled in here.
          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }
          if (
            id.includes("@radix-ui") ||
            id.includes("@floating-ui") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge")
          ) {
            return "ui-vendor";
          }
        },
        // The module preload polyfill is a request of its own for browsers that
        // all support modulepreload natively now.
        modulePreload: { polyfill: false },
        // Use content-based hashing for long-term caching
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
  preview: {
    // Port 4173 is the Playwright E2E webServer contract (playwright.config.ts
    // waits on http://localhost:4173). Do not change without updating it.
    host: "0.0.0.0",
    port: 4173,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
});
