#!/usr/bin/env node
/**
 * FRELUX market onboarding scaffold (Phase 4 globalization, 2026-10-27).
 *
 * Usage: node scripts/new-market.mjs <CODE> <CountryName>
 *   e.g. node scripts/new-market.mjs PK Pakistan
 *
 * Generates the one-file market bundle skeleton
 * (src/lib/international/markets/<code>.ts) with explicit TODO markers and
 * prints the exact checklist of every registry that still needs real,
 * standard-referenced data. The CI completeness gate intentionally FAILS
 * for a scaffolded market until every TODO is replaced with sourced values:
 * that is the enforcement mechanism, not a bug.
 *
 * Honesty contract: this scaffold never invents building-practice values.
 * It only creates the authoring surface. Real values must come from the
 * market research step (see docs/market-onboarding-runbook.md).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const [, , rawCode, rawName] = process.argv;

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

if (!rawCode || !rawName) {
  fail(
    "Usage: node scripts/new-market.mjs <CODE> <CountryName>\n  e.g. node scripts/new-market.mjs PK Pakistan",
  );
}

const code = rawCode.toUpperCase();
const countryName = rawName;

if (!/^[A-Z]{2}$/.test(code))
  fail(`Market code must be exactly 2 letters (got "${rawCode}").`);
if (code.length !== 2) fail("unreachable");

const root = process.cwd();
const indexSrc = readFileSync(
  join(root, "src/lib/international/markets/index.ts"),
  "utf8",
);
if (indexSrc.includes(`import { ${code} } from`)) {
  fail(
    `Market ${code} already exists (see src/lib/international/markets/index.ts).`,
  );
}

const bundlePath = join(
  root,
  "src/lib/international/markets",
  `${code.toLowerCase()}.ts`,
);
if (existsSync(bundlePath)) fail(`Bundle file already exists: ${bundlePath}`);

const skeleton = `/**
 * FRELUX market bundle: ${code} (${countryName}).
 *
 * SCAFFOLDED by scripts/new-market.mjs — NOT yet real data.
 * Every field marked TODO must be replaced with sourced, standard-
 * referenced values before this market can ship. CI fails (typecheck,
 * market-registry-completeness gate, landing-data integrity gate) until
 * every TODO is gone — by design.
 *
 * Research sources per field:
 *   electrical  → the market's national electrical wiring code/standard
 *   plumbing    → national plumbing / sanitary installation standard
 *   masonry     → the market's standard wall unit sizes and materials
 *   drywall     → standard board sizes and framing conventions
 *   cement bag  → the market's retail cement bag weight
 *   wall system → typical wall build-ups and finishes (see wallfinishing)
 */
import type { MarketBundle } from "./types";
import { MASONRY_MARKET_REGISTRY } from "@/lib/estimation/masonry-standalone-engine";
import { DRYWALL_MARKET_PROFILES } from "@/lib/estimation/drywall-standalone-engine";
import { CEMENT_BAG_WEIGHT_BY_MARKET } from "@/lib/estimation/plastering-standalone-engine";
import { WALLFIN_COUNTRY_MAP } from "@/lib/wallfinishing/countries";

export const ${code}: MarketBundle = {
  code: "${code}",
  electrical: {
    marketCode: "${code}",
    name: "TODO: ${countryName} (<national standard>)",
    standardsRef: "TODO: cite the market's wiring standard",
    nominalVoltage: "TODO: verify actual supply voltage",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod: "TODO: typical wiring method",
    lightingConductorSize: "TODO: 1.5 mm² Cu or market equivalent",
    socketConductorSize: "TODO: 2.5 mm² Cu or market equivalent",
    dedicatedConductorSize: "TODO: 4.0 to 6.0 mm² Cu or market equivalent",
    boxType: "TODO: typical box type",
    protectionDevices: "TODO: RCD/MCB practice per standard",
    cableReelSize: "TODO: retail coil size",
    conduitRequired: true,
    notes: "TODO: honest note - quantity takeoff only, consult a licensed local electrician.",
  },
  plumbing: {
    marketCode: "${code}",
    name: "TODO: ${countryName} (<national standard>)",
    standardsRef: "TODO: cite the market's plumbing standard",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial: "TODO: dominant supply pipe material/standard",
    drainageDwvMaterial: "TODO: dominant drainage pipe material/standard",
    typicalColdSupplyPipeSize: "TODO: e.g. 25 mm OD trunk, 20 mm branches",
    typicalHotSupplyPipeSize: "TODO: insulated equivalent",
    typicalBranchWastePipeSize: "TODO: e.g. 40 mm and 50 mm waste",
    typicalSoilDrainPipeSize: "TODO: e.g. 110 mm OD soil",
    drainageSlopeRule: "TODO: minimum fall per standard",
    standardPipePurchasingLength: "TODO: retail lengths",
    notes: "TODO: honest note - material takeoff only, consult a licensed local plumber.",
  },
  masonry: MASONRY_MARKET_REGISTRY["${code}"],
  drywall: DRYWALL_MARKET_PROFILES["${code}"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["${code}"],
  wallFinishing: WALLFIN_COUNTRY_MAP["${code}"],
};
`;

writeFileSync(bundlePath, skeleton);
console.log(`\n✅ Scaffolded ${bundlePath}\n`);

console.log(`NEXT STEPS — the market cannot ship until ALL of these are real, sourced data:

  1. Research (Day 1): gather the market's actual wall unit sizes, cement
     bag weight, wiring/plumbing standards, currency. Cite a real standard
     in every standardsRef. Never invent values.

  2. Author data (Day 2) — every TODO in the bundle must be replaced, and
     these registries each need a "${code}" entry (the bundle references them by code):

       - src/lib/estimation/masonry-standalone-engine.ts      MASONRY_MARKET_REGISTRY.${code}
       - src/lib/estimation/drywall-standalone-engine.ts      DRYWALL_MARKET_PROFILES.${code}
       - src/lib/estimation/plastering-standalone-engine.ts  CEMENT_BAG_WEIGHT_BY_MARKET.${code}
       - src/lib/wallfinishing/countries.ts                   WALLFIN_COUNTRY_PROFILES "${code}" profile

  3. Register the bundle in src/lib/international/markets/index.ts:
       import { ${code} } from "./${code.toLowerCase()}";
       ...and add it to MARKET_BUNDLES.

  4. Regenerate the landing-page data:
       python3 - <<'EOF'
       (re-run the extraction documented in scripts/market-landing-data.mjs)
       EOF
       or ask the agent/dev who owns Phase 3 tooling to regenerate it.

  5. Verify before pushing:
       node scripts/validate-market.mjs ${code}

  6. Manual staging QA (see docs/market-onboarding-runbook.md):
       npm run build && npm run preview
       open http://localhost:4173/market/${code.toLowerCase()}/

  CI will fail at the completeness gate until steps 2-4 are done. That is
  the gate doing its job: no market ships with TODOs or invented data.
`);
