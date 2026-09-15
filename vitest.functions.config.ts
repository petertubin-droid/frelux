/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

// Unit tests for the Supabase Edge Functions (supabase/functions/).
//
// The functions are written for the Deno edge runtime:
//   * `npm:` prefixed imports  → aliased to the local packages
//   * `Deno.env.get` / `Deno.serve` → shimmed by the test harness
//     (_shared/testing/harness.ts) BEFORE the module is imported
//   * relative imports keep their `.ts` extensions → Vite resolves
//     them natively.
//
// The harness captures the handler each function registers through
// serveWithCors(), so tests call the REAL handler with REAL Request
// objects — only the Supabase client (and thus the network) is mocked.

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["supabase/functions/**/*.test.ts"],
    // Fresh module state per test — every function registers its
    // handler at import time and the Deno shim must re-capture.
    isolate: true,
    testTimeout: 20_000,
    setupFiles: ["./supabase/functions/_shared/testing/setup.ts"],
    resolve: {
      alias: [
        {
          // `npm:<pkg>@<version>` → `<pkg>` (resolved from node_modules)
          find: /^npm:(.+?)(?:@[\d.]+(?:\.[\d.]+)*)?$/,
          replacement: "$1",
        },
      ],
    },
  },
});
