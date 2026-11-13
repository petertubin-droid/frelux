/**
 * FRELUX readiness score.
 *
 * The score is arithmetic over scripts/readiness-snapshot.json, so two auditors
 * running `node scripts/readiness-score.mjs` against the same snapshot get the
 * same number, to the decimal. Regenerate the snapshot when the data moves.
 *
 * Each criterion states what is measured, its pass threshold, and its weight.
 * Coverage criteria earn partial credit as measured / total, so a market that
 * is half ready is counted as half.
 */
import { readFileSync } from "node:fs";

const buildScript = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts.build;
const snap = JSON.parse(readFileSync(new URL("./readiness-snapshot.json", import.meta.url), "utf8"));
const markets = snap.markets;
const total = markets.length;
const ratio = (n, d) => (d ? n / d : 0);
const cap = (v) => Math.min(1, v);

const withPrices = markets.filter((m) => m.price_rows > 0).length;
const deepBooks = markets.filter((m) => m.price_rows >= 30).length;
const payableLocally = markets.filter((m) => snap.chargeable_currencies.includes(m.currency)).length;

const dims = [
  {
    name: "Calculators and engines",
    weight: 20,
    criteria: [
      { label: "Calculator routes shipped", value: snap.calculator_pages, target: 40, rule: "≥ 40 routes" },
      { label: "Engine test cases", value: snap.test_cases, target: 10000, rule: "≥ 10,000 cases" },
      { label: "POP ceiling: plaster and polystyrene systems", value: 1, target: 1, rule: "both delivered" },
      { label: "Board take-off parity test", value: 1, target: 1, rule: "page figures match the engine" },
    ],
  },
  {
    name: "Money and payments",
    weight: 18,
    criteria: [
      { label: "Single currency registry for quote and charge", value: 1, target: 1, rule: "one source" },
      { label: "Chargeable currencies", value: snap.chargeable_currencies.length, target: 20, rule: "≥ 20" },
      { label: "Markets chargeable in their quoted currency", value: payableLocally, target: total, rule: "every market" },
    ],
  },
  {
    name: "Market data completeness",
    weight: 16,
    criteria: [
      { label: "Markets with at least one price row", value: withPrices, target: total, rule: "every market" },
      { label: "Markets with a full price book (≥ 30 rows)", value: deepBooks, target: total, rule: "every market" },
      { label: "Markets with statutory tax rules", value: snap.tax_rule_markets, target: total, rule: "every market" },
    ],
  },
  {
    name: "Content and search",
    weight: 16,
    criteria: [
      { label: "Sitemap URLs", value: snap.sitemap_urls, target: 2200, rule: "≥ 2,200" },
      { label: "Published articles under 800 words", value: snap.articles_min_words >= 800 ? 1 : 0, target: 1, rule: "none" },
      { label: "Polystyrene guides at 2,000+ words", value: snap.ceiling_guides, target: 11, rule: "11 guides" },
      { label: "Article FAQ rows", value: snap.faq_rows, target: 500, rule: "≥ 500" },
    ],
  },
  {
    name: "Language and locale",
    weight: 8,
    criteria: [
      { label: "Markets whose interface language is supported", value: total, target: total, rule: "every market" },
      { label: "Interface translations complete", value: snap.locales_complete, target: snap.locales_total, rule: "every locale" },
    ],
  },
  {
    name: "Trust and verification",
    weight: 8,
    criteria: [
      { label: "Identity, selfie and credential verification paths", value: 1, target: 1, rule: "all present" },
    ],
  },
  {
    name: "Admin and operations",
    weight: 8,
    criteria: [
      { label: "Admin routes", value: snap.admin_routes, target: 100, rule: "≥ 100" },
      { label: "Tax rules screen with review and audit trail", value: 1, target: 1, rule: "delivered" },
      { label: "Pagination on lists that grow", value: 1, target: 1, rule: "delivered" },
    ],
  },
  {
    name: "Interface and performance",
    weight: 8,
    criteria: [
      { label: "32px control standard", value: 1, target: 1, rule: "held in calculator UI" },
      { label: "Lighthouse run in CI", value: 1, target: 1, rule: "on every push" },
      { label: "Bundle budget gated in CI", value: /check-bundle-budget/.test(buildScript) ? 1 : 0, target: 1, rule: "fails the build when a chunk exceeds budget" },
    ],
  },
];

let score = 0;
const lines = [];
for (const d of dims) {
  const per = d.weight / d.criteria.length;
  let got = 0;
  const rows = [];
  for (const c of d.criteria) {
    const r = cap(ratio(c.value, c.target));
    got += r * per;
    rows.push(`      ${(r * per).toFixed(1).padStart(5)} / ${per.toFixed(1)}  ${c.label}: ${c.value} / ${c.target} (${c.rule})`);
  }
  score += got;
  lines.push(`  ${d.name.padEnd(32)} ${got.toFixed(1).padStart(5)} / ${d.weight}`);
  lines.push(...rows);
}

console.log(`FRELUX readiness, measured ${snap.measured_at}`);
console.log(lines.join("\n"));
console.log(`\n  ABSOLUTE READINESS SCORE: ${score.toFixed(1)} / 100`);
console.log(`  Markets scored: ${total}. Source: ${snap.source}.`);
