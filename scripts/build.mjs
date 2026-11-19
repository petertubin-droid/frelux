#!/usr/bin/env node
/**
 * Build runner.
 *
 * The previous build was a single `&&` chain, so a Netlify failure only ever
 * reported "Build script returned non-zero exit code: N" with no indication of
 * which step produced it. This runner prints every step with its duration and
 * exit code, and fails loudly with the step name, so a deploy log is readable
 * without guesswork.
 *
 * Behaviour is otherwise identical to the old chain: same steps, same order,
 * first failure stops the build and its exit code is propagated.
 */
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const steps = [
  ["verify supabase target", "node", ["scripts/verify-supabase-target.mjs"]],
  ["typecheck", "npm", ["run", "typecheck"]],
  ["faq prerender", "npm", ["run", "faqs:prerender"]],
  ["building type prerender", "npm", ["run", "buildings:prerender"]],
  ["sequence prerender", "npm", ["run", "sequences:prerender"]],
  ["vite build", process.execPath, ["node_modules/vite/bin/vite.js", "build"]],
  ["page prerender", "node", ["scripts/prerender.mjs"]],
  ["service worker", "node", ["scripts/generate-sw.mjs"]],
  ["sitemap", "node", ["scripts/generate-sitemap.mjs"]],
  ["bundle budget", "node", ["scripts/check-bundle-budget.mjs"]],
];

const total = steps.length;
let failed = null;

for (let i = 0; i < steps.length; i++) {
  const [label, cmd, args] = steps[i];
  const t0 = performance.now();
  console.log(`\n▶ [${i + 1}/${total}] ${label}: ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  const secs = ((performance.now() - t0) / 1000).toFixed(1);

  if (res.error) {
    console.error(`\n✖ [${i + 1}/${total}] ${label} could not start: ${res.error.message}`);
    failed = { label, code: 1, secs };
    break;
  }
  if (res.status !== 0) {
    const signal = res.signal ? ` (killed by ${res.signal})` : "";
    console.error(
      `\n✖ [${i + 1}/${total}] ${label} FAILED after ${secs}s with exit code ${res.status}${signal}`,
    );
    if (res.signal) {
      console.error(
        "  A signal instead of an exit code usually means the runner ran out of memory or hit a hard limit.",
      );
    }
    failed = { label, code: res.status ?? 1, secs };
    break;
  }
  console.log(`✔ [${i + 1}/${total}] ${label} (${secs}s)`);
}

if (failed) {
  console.error(
    `\nBUILD FAILED at step "${failed.label}" after ${failed.secs}s (exit ${failed.code}).`,
  );
  process.exit(failed.code);
}

console.log("\nBUILD OK: all steps completed.");
