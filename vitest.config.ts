/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname_new = path.dirname(fileURLToPath(import.meta.url));

// The Supabase Edge Functions moved to the ARCHIE repo
// (github.com/petertubin-droid/ARCHIE); their project runs there.
// This config now covers the app project only.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname_new, "./src"),
      "@studio-shared": path.resolve(
        __dirname_new,
        "./supabase/functions/_shared",
      ),
    },
  },
  test: {
    globals: true,
    // Heavy page modules (full calculator pages) can take over the
    // default 5s just to import under happy-dom in CI sandboxes.
    testTimeout: 20_000,
    projects: [
      {
        extends: true,
        test: {
          name: "app",
          environment: "happy-dom",
          // Never fetch/execute external ad-network scripts during
          // tests — the ad slot components inject them into <head>
          // and happy-dom would otherwise download the real tags
          // over the network.
          environmentOptions: {
            happyDOM: {
              settings: {
                disableJavaScriptFileLoading: true,
                disableCSSFileLoading: true,
              },
            },
          },
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "edge-functions",
          environment: "node",
          // Fresh module state per test — every function registers
          // its handler at import time and the shim must
          // re-capture.
          isolate: true,
          include: ["supabase/functions/**/*.test.ts"],
          setupFiles: ["./supabase/functions/_shared/testing/setup.ts"],
        },
        resolve: {
          alias: [
            {
              // `npm:<pkg>[@<version>]` → `<pkg>` (from node_modules)
              find: /^npm:(.+?)(?:@[\d][\w.]*)?$/,
              replacement: "$1",
            },
            {
              // `https://esm.sh/<pkg>[@<version>]` → `<pkg>`
              find: /^https:\/\/esm\.sh\/(.+?)(?:@[\d][\w.]*)?$/,
              replacement: "$1",
            },
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**", "src/components/**", "src/pages/**"],
      exclude: ["src/test/**", "**/*.d.ts"],
    },
  },
});
