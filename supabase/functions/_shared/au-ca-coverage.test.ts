import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { matchMaterials, type MaterialRef } from "./market-feeds.ts";

// The AU and CA catalogues were staged and mapped at zero because the products
// had no material row to land on. This test holds both halves of the fix
// together: the catalogue rows live in migrations, and the alias layer is what
// lets a merchant's wording reach them. Remove either and the feeds go quiet
// again, which is exactly the failure that took this long to notice.

const MIGRATION_DIR = "supabase/migrations";

function catalogueRows(): MaterialRef[] {
  const rows: MaterialRef[] = [];
  for (const file of readdirSync(MIGRATION_DIR)) {
    if (!/material_rows\.sql$/.test(file)) continue;
    const sql = readFileSync(`${MIGRATION_DIR}/${file}`, "utf8");
    const re = /'([^']+)',\s*\n\s*'([a-z0-9-]+)',/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) rows.push({ slug: m[2], name: m[1] });
  }
  return rows;
}

// Real products from the two catalogues the probe actually fetched.
const STAGED: Record<string, string[]> = {
  AU: [
    "Hoop Pine AC Plywood 18mm",
    "Hoop Pine AA Marine Plywood 24mm",
    "Premium Birch Plywood 30mm",
  ],
  CA: ["Treated Lumber 2x6"],
};

describe("AU and CA staged products have somewhere to land", () => {
  const rows = catalogueRows();

  it("declares catalogue rows for both markets", () => {
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.slug.startsWith("au-"))).toBe(true);
    expect(rows.some((r) => r.slug.startsWith("ca-"))).toBe(true);
  });

  for (const [market, products] of Object.entries(STAGED)) {
    it(`binds every ${market} staged product to a catalogue row`, () => {
      const matched = matchMaterials(
        products.map((name) => ({ name })),
        rows,
        0.6,
        market,
      );
      expect(matched.map((m) => m.material.slug).sort()).toEqual(
        products
          .map((name) => {
            const hit = matchMaterials([{ name }], rows, 0.6, market);
            return hit[0]?.material.slug;
          })
          .sort(),
      );
      expect(matched).toHaveLength(products.length);
    });
  }

  it("still refuses the hardware on the same catalogue", () => {
    const matched = matchMaterials(
      [{ name: "Construction Screws" }, { name: "Dock Hardware" }],
      rows,
      0.6,
      "CA",
    );
    expect(matched).toHaveLength(0);
  });
});
