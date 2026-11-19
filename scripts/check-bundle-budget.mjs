#!/usr/bin/env node
/**
 * Bundle budget guard.
 *
 * FRELUX ships 1,400+ prerendered pages; the only per-visitor cost that
 * matters is the JavaScript that must download before first paint. This
 * fails CI when the entry chunk or any eagerly-loaded chunk grows past
 * budget, so a heavy import can never silently regress Core Web Vitals.
 *
 * Usage: node scripts/check-bundle-budget.mjs [distDir]
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = process.argv[2] || 'dist';
const ENTRY_BUDGET_KB = 125;      // gzip: index chunk on the critical path
const EAGER_CHUNK_BUDGET_KB = 200; // gzip: any chunk listed in the entry's imports
// gzip: entry + everything it eagerly imports.
// Target is 260KB; the shipped page builds at 294KB, so the ceiling sits just
// above today's figure as a regression ratchet. Lower it as eager chunks are
// split out (the 26KB i18n chunk is the first candidate); never raise it.
const CRITICAL_TOTAL_BUDGET_KB = 300;
const FAIL = [];

const js = join(DIST, 'assets', 'js');
let files;
try {
  files = readdirSync(js).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`✖ ${js} not found. Run the build first.`);
  process.exit(1);
}

const gzKb = (file) => Math.round(gzipSync(readFileSync(join(js, file))).length / 1024);
// The entry is the module script the document loads. Picking it by filename
// instead used to answer with whichever index-*.js sorted first, so a 1KB bridge
// chunk could stand in for the app entry and report a critical path a third of
// the real size. The document says which one it is.
const html = readFileSync(join(DIST, "index.html"), "utf8");
const entryMatch = html.match(/<script[^>]*type="module"[^>]*src="[^"]*\/assets\/js\/([^"]+)"[^>]*>/);
if (!entryMatch) {
  console.error("✖ No module entry script in dist/index.html.");
  process.exit(1);
}
const entry = entryMatch[1];

// Everything the entry imports statically downloads before render too.
const entrySource = readFileSync(join(js, entry), "utf8");
const eager = [...new Set(
  [...entrySource.matchAll(/from"\.\/([^"]+\.js)"/g)].map((m) => m[1]),
)].filter((f) => files.includes(f));

const entryKb = gzKb(entry);
console.log(`  entry ${entryKb}KB gzip (budget ${ENTRY_BUDGET_KB}KB)`);
if (entryKb > ENTRY_BUDGET_KB) {
  FAIL.push(`entry chunk ${entry} is ${entryKb}KB gzip, over the ${ENTRY_BUDGET_KB}KB budget`);
}

for (const dep of eager) {
  const kb = gzKb(dep);
  console.log(`  eager ${dep} ${kb}KB gzip (budget ${EAGER_CHUNK_BUDGET_KB}KB)`);
  if (kb > EAGER_CHUNK_BUDGET_KB) {
    FAIL.push(`${dep} is ${kb}KB gzip and loads eagerly, over the ${EAGER_CHUNK_BUDGET_KB}KB budget`);
  }
}

const criticalTotal = entryKb + eager.reduce((sum, dep) => sum + gzKb(dep), 0);
console.log(`  critical path total ${criticalTotal}KB gzip (budget ${CRITICAL_TOTAL_BUDGET_KB}KB)`);
if (criticalTotal > CRITICAL_TOTAL_BUDGET_KB) {
  FAIL.push(`critical path is ${criticalTotal}KB gzip, over the ${CRITICAL_TOTAL_BUDGET_KB}KB budget`);
}

if (FAIL.length) {
  console.error(`\n✖ Bundle budget exceeded:\n   - ${FAIL.join('\n   - ')}`);
  process.exit(1);
}
console.log(
  `✓ bundle budget passed (${eager.length} preloaded chunk${eager.length === 1 ? "" : "s"} checked)`,
);
