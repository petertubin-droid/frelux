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
const ENTRY_BUDGET_KB = 120;      // gzip: index chunk on the critical path
const EAGER_CHUNK_BUDGET_KB = 200; // gzip: any chunk listed in the entry's imports
const CRITICAL_TOTAL_BUDGET_KB = 260; // gzip: entry + everything it eagerly imports
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
const entry = files.find((f) => /^index-[^/]*\.js$/.test(f));

if (!entry) {
  console.error('✖ No entry chunk (index-*.js) in the build.');
  process.exit(1);
}

const entryKb = gzKb(entry);
console.log(`  entry ${entryKb}KB gzip (budget ${ENTRY_BUDGET_KB}KB)`);
if (entryKb > ENTRY_BUDGET_KB) {
  FAIL.push(`entry chunk is ${entryKb}KB gzip, over the ${ENTRY_BUDGET_KB}KB budget`);
}

// Static module imports from the entry are downloaded before render too.
const entrySource = readFileSync(join(js, entry), 'utf8');
const imported = [...entrySource.matchAll(/from"\.\/([^"]+\.js)"/g)].map((m) => m[1]);
for (const dep of imported) {
  if (!files.includes(dep)) continue;
  const kb = gzKb(dep);
  console.log(`  eager ${dep} ${kb}KB gzip (budget ${EAGER_CHUNK_BUDGET_KB}KB)`);
  if (kb > EAGER_CHUNK_BUDGET_KB) {
    FAIL.push(`${dep} is ${kb}KB gzip and loads eagerly, over the ${EAGER_CHUNK_BUDGET_KB}KB budget`);
  }
}

const criticalTotal = entryKb + imported.reduce((sum, dep) => (files.includes(dep) ? sum + gzKb(dep) : sum), 0);
console.log(`  critical path total ${criticalTotal}KB gzip (budget ${CRITICAL_TOTAL_BUDGET_KB}KB)`);
if (criticalTotal > CRITICAL_TOTAL_BUDGET_KB) {
  FAIL.push(`critical path is ${criticalTotal}KB gzip, over the ${CRITICAL_TOTAL_BUDGET_KB}KB budget`);
}

if (FAIL.length) {
  console.error(`\n✖ Bundle budget exceeded:\n   - ${FAIL.join('\n   - ')}`);
  process.exit(1);
}
console.log(`✓ bundle budget passed (${imported.length} eager chunk${imported.length === 1 ? '' : 's'} checked)`);
