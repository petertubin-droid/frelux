/// <reference types="vitest" />
// Dedicated vitest config for LIVE Project B verification.
// Deliberately has NO setup file — no supabase-js mock, no Deno
// shim — so the repository runs the REAL supabase-js client
// against the REAL knowledge database over the network.
//
// CI never sets KNOWLEDGE_DB_URL / KNOWLEDGE_SERVICE_ROLE_KEY,
// so the suite skips everywhere except an authorized operator
// environment (Phase 5 acceptance gate). Run:
//
//   npx vitest run --config supabase/functions/_shared/knowledge/vitest.live.config.ts
import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname_new = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        // `npm:<pkg>[@<version>]` → `<pkg>` (from node_modules)
        find: /^npm:(.+?)(?:@[\d][\w.]*)?$/,
        replacement: "$1",
      },
    ],
  },
  test: {
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 30_000,
    include: [path.join(__dirname_new, "live.test.ts")],
  },
});
