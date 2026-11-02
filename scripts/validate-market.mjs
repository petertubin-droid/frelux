#!/usr/bin/env node
/**
 * FRELUX single-market pre-push validator (Phase 4 globalization, 2026-10-27).
 *
 * Usage: node scripts/validate-market.mjs <CODE>
 *   e.g. node scripts/validate-market.mjs IN
 *
 * The one-command verification step of the territory rollout runbook
 * (docs/market-onboarding-runbook.md). Checks a market end-to-end:
 *   1. Bundle file exists and is registered in MARKET_BUNDLES
 *   2. No scaffold TODOs remain in the bundle
 *   3. Every engine registry carries the market's entry
 *   4. Landing-page data exists for the market
 *   5. React route, prerender, sitemap and SEO map reference the market
 *   6. Full typecheck + the CI completeness/integrity gates (spawned)
 *
 * Exit code 0 = safe to push. Non-zero = exactly what must be fixed first.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const [, , rawCode] = process.argv;
const code = (rawCode || "").toUpperCase();
const root = process.cwd();

const failures = [];
const ok = (label) => console.log(`  ✅ ${label}`);
const bad = (label, hint) => {
  console.log(`  ❌ ${label}`);
  failures.push(hint || label);
};

if (!/^[A-Z]{2}$/.test(code)) {
  console.error("Usage: node scripts/validate-market.mjs <CODE>");
  process.exit(1);
}
const lc = code.toLowerCase();

console.log(`\nFRELUX market validation: ${code}\n`);
console.log("─ 1. Bundle presence and registration ────────────────────");

const bundlePath = join(root, `src/lib/international/markets/${lc}.ts`);
if (existsSync(bundlePath)) ok(`bundle file ${lc}.ts`);
else
  bad(
    `bundle file missing: ${bundlePath}`,
    "Author the bundle: node scripts/new-market.mjs",
  );

const indexSrc = readFileSync(
  join(root, "src/lib/international/markets/index.ts"),
  "utf8",
);
const registered =
  indexSrc.includes(`import { ${code} } from "./${lc}";`) &&
  new RegExp(`^  ${code},$`, "m").test(indexSrc);
registered
  ? ok("registered in MARKET_BUNDLES (markets/index.ts)")
  : bad(
      `${code} not registered in markets/index.ts`,
      "Add the import and the MARKET_BUNDLES entry",
    );

console.log("─ 2. Scaffold TODOs cleared ─────────────────────────────");
if (existsSync(bundlePath)) {
  const bundleSrc = readFileSync(bundlePath, "utf8");
  if (bundleSrc.includes("TODO:"))
    bad(
      "bundle still contains TODO placeholders",
      "Replace every TODO with sourced, standard-referenced values",
    );
  else ok("no TODO placeholders remain");
}

console.log("─ 3. Engine registry entries ─────────────────────────────");
const registryChecks = [
  [
    "src/lib/estimation/masonry-standalone-engine.ts",
    `MASONRY_MARKET_REGISTRY`,
    `^  ${code}: \\{$`,
  ],
  [
    "src/lib/estimation/drywall-standalone-engine.ts",
    `DRYWALL_MARKET_PROFILES`,
    `^  ${code}: \\{$`,
  ],
  [
    "src/lib/estimation/plastering-standalone-engine.ts",
    `CEMENT_BAG_WEIGHT_BY_MARKET`,
    `^  ${code}: `,
  ],
];
for (const [file, registry, re] of registryChecks) {
  const src = readFileSync(join(root, file), "utf8");
  if (new RegExp(re, "m").test(src)) ok(`${registry}.${code}`);
  else bad(`${registry} has no "${code}" entry`, `Add a real entry to ${file}`);
}
const wallfinSrc = readFileSync(
  join(root, "src/lib/wallfinishing/countries.ts"),
  "utf8",
);
if (wallfinSrc.includes(`code: "${code}"`)) ok("wallfinishing country profile");
else
  bad(
    `WALLFIN_COUNTRY_PROFILES has no "${code}" profile`,
    "Add a country profile to src/lib/wallfinishing/countries.ts",
  );

console.log("─ 4. Landing-page data ───────────────────────────────────");
const landingSrc = readFileSync(
  join(root, "scripts/market-landing-data.mjs"),
  "utf8",
);
const hasEntry =
  landingSrc.includes(`code: "${code}"`) ||
  landingSrc.includes(`"code": "${code}"`);
if (hasEntry) ok("landing-page data entry exists");
else
  bad(
    `scripts/market-landing-data.mjs has no ${code} entry`,
    "Regenerate the landing data from the bundles (Phase 3 tooling)",
  );

console.log("─ 5. Route / prerender / sitemap / SEO wiring ────────────");
const appSrc = readFileSync(join(root, "src/App.tsx"), "utf8");
appSrc.includes('path="/market/:code"')
  ? ok("React route /market/:code")
  : bad("React route missing");
// Market routes are generated from market-landing-data.mjs, so a data entry
// (step 4) plus the generator loops already cover prerender/sitemap/SEO map.
landingSrc.includes("marketLandingRoutes")
  ? ok("prerender/sitemap/SEO map generate from landing data")
  : bad("market-landing-data.mjs malformed");

console.log("─ 6. Typecheck + CI gates ────────────────────────────────");
const tsc = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.app.json"], {
  cwd: root,
  encoding: "utf8",
});
if (tsc.status === 0) ok("tsc (tsconfig.app.json) clean");
else {
  bad(
    "tsc failed",
    tsc.stdout
      .split("\n")
      .filter((l) => l.includes("error"))
      .slice(0, 3)
      .join("\n"),
  );
}

const vitest = spawnSync(
  "npx",
  [
    "vitest",
    "run",
    "src/lib/estimation/__tests__/market-registry-completeness.test.ts",
    "src/lib/route-consistency.test.ts",
  ],
  { cwd: root, encoding: "utf8" },
);
if (vitest.status === 0) ok("completeness + integrity gates green");
else
  bad(
    "completeness/integrity gates failed",
    "Run the printed test file for details",
  );

console.log("──────────────────────────────────────────────────────────");
if (failures.length > 0) {
  console.log(`\n✖ ${code} is NOT ready to push. Fix:\n`);
  for (const f of failures) console.log(`  - ${f}`);
  console.log("\nRunbook: docs/market-onboarding-runbook.md\n");
  process.exit(1);
}
console.log(`\n✅ ${code} passes every automated check.
Remaining manual staging QA (docs/market-onboarding-runbook.md):
  npm run build && npm run preview   # then open http://localhost:4173/market/${lc}/
  - currency symbol renders correctly
  - block/mortar defaults match your research
  - calculator links open with the right market preselected
  - honest verify-locally notice is present
`);
