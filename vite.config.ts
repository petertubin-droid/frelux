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
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    // Vite 8: Oxc minifier is default. Drop debugger statements via rolldownOptions.
    // (Replaces the deprecated esbuild.drop option from Vite 5)
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            drop: ["debugger"],
          },
        },
      },
    },
    // Only generate hidden sourcemaps when Sentry is configured
    sourcemap: hasSentryToken ? "hidden" : false,
    rollupOptions: {
      output: {
        // Vendor chunk splitting for better caching
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router-dom") || id.includes("/react-dom/") || id.includes("/react/")) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) {
            return "supabase-vendor";
          }
          // Don't force lucide-react into one chunk — let Vite tree-shake
          // icons so only the ~20 used on the critical path land in the main bundle.
        },
        // Use content-based hashing for long-term caching
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
  },
  server: {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
  preview: {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
});
