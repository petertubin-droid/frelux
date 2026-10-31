/**
 * AU / CA alias mapping report.
 *
 * Reads the catalogues that are actually staged (from verified-sources.json,
 * which records what the probe fetched) and maps every example product onto
 * the material catalogue in its own market vocabulary. Writes:
 *
 *   data/price-scan/au-ca-alias-map.json
 *
 * Three outcomes, and no fourth: a product binds to an existing material, it
 * needs a catalogue row that does not exist yet, or it is refused because it
 * is a tool or hardware. Nothing is force-matched, and no price is invented.
 *
 * Run: npx tsx scripts/price-scan/au-ca-alias-report.ts
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { BUNDLED_PRICE_BOOK } from "../../src/lib/international/bundled-price-books";
import {
  matchMaterials,
  type MaterialRef,
} from "../../supabase/functions/_shared/market-feeds";
import { canonicaliseProduct } from "../../supabase/functions/_shared/supplier-aliases";

const SEED = "scripts/price-scan/verified-sources.json";
const OUT = "data/price-scan/au-ca-alias-map.json";

interface SeedSource {
  market: string;
  retailer: string;
  catalogue_url: string;
  products: number;
  building_products: number;
  examples: string[];
  live_state?: string;
}

const seed = JSON.parse(readFileSync(SEED, "utf8")) as {
  sources: SeedSource[];
};
const sources = seed.sources.filter(
  (s) => s.market === "AU" || s.market === "CA",
);

// Catalogue snapshot in the repo. The production table carries more rows; this
// report states its basis rather than implying full coverage.
const bundled: MaterialRef[] = Object.entries(BUNDLED_PRICE_BOOK).map(
  ([slug, m]) => ({ slug, name: m.name }),
);

/**
 * Rows declared in migrations that the bundled snapshot predates. They are not
 * in the running database yet, so they are counted separately rather than
 * passed off as live catalogue coverage.
 */
function pendingRows(): MaterialRef[] {
  const dir = "supabase/migrations";
  const out: MaterialRef[] = [];
  for (const file of readdirSync(dir)) {
    if (!/material_rows\.sql$/.test(file)) continue;
    const sql = readFileSync(`${dir}/${file}`, "utf8");
    const re = /'([^']+)',\s*\n\s*'([a-z0-9-]+)',/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) out.push({ slug: m[2], name: m[1] });
  }
  return out;
}

const pending = pendingRows();
const materials: MaterialRef[] = [...bundled, ...pending];

const report = {
  generated_at: new Date().toISOString(),
  basis: {
    catalogue: "src/lib/international/bundled-price-books.ts",
    catalogue_rows: materials.length,
    catalogue_version: "production catalog 2026-10-13",
    pending_migration_rows: pending.map((m) => m.slug),
    pending_note:
      "Rows declared in a migration but not yet applied to the database. They are included so this report shows the state after the migration runs, and are listed here so they are never mistaken for live coverage.",
    staged_from: SEED,
    note: "The production estimation_materials table has more rows than this bundled snapshot. A product listed as needing a catalogue row here may already have one there; the mapping rules are the same either way.",
  },
  markets: {} as Record<
    string,
    {
      retailer: string;
      samples_checked: number;
      staged_products: number;
      matched: Array<{
        product: string;
        slug: string;
        score: number;
        row_state: "bundled" | "pending_migration";
      }>;
      needs_catalogue_row: Array<{ product: string; canonical: string }>;
      refused: Array<{ product: string; reason: string }>;
    }
  >,
};

for (const source of sources) {
  const market = source.market.toUpperCase();
  const rows = source.examples.map((name) => ({ name }));
  const matched = matchMaterials(rows, materials, 0.6, market);
  const boundNames = new Set(matched.map((m) => m.name));

  const needs: Array<{ product: string; canonical: string }> = [];
  const refused: Array<{ product: string; reason: string }> = [];

  for (const name of source.examples) {
    if (boundNames.has(name)) continue;
    const verdict = canonicaliseProduct(name, market);
    if (verdict.kind === "rejected")
      refused.push({ product: name, reason: verdict.reason });
    else needs.push({ product: name, canonical: verdict.canonical });
  }

  report.markets[market] = {
    retailer: source.retailer,
    samples_checked: source.examples.length,
    staged_products: source.products,
    matched: matched.map((m) => ({
      product: m.name,
      slug: m.material.slug,
      score: m.score,
      row_state: pending.some((p) => p.slug === m.material.slug)
        ? ("pending_migration" as const)
        : ("bundled" as const),
    })),
    needs_catalogue_row: needs,
    refused,
  };
}

writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

for (const [market, m] of Object.entries(report.markets)) {
  console.log(
    `${market} (${m.retailer}): ${m.matched.length} bound, ${m.needs_catalogue_row.length} need a catalogue row, ${m.refused.length} refused of ${m.samples_checked} samples`,
  );
  for (const r of m.refused)
    console.log(`   refused: ${r.product} — ${r.reason}`);
  for (const r of m.needs_catalogue_row)
    console.log(`   needs row: ${r.product} → ${r.canonical}`);
}
