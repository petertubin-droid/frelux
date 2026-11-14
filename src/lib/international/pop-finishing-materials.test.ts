import { describe, expect, it } from "vitest";
import { BUNDLED_POP_MATERIALS } from "@/lib/international/bundled-price-books";
import { calculatePopCeiling, formatPackageLine } from "@/lib/pop-tile-calc";
import type { DbPopMaterial } from "@/types/database";

/**
 * The Nigerian POP finishing list, checked against what the supplier actually
 * sells: one screeding putty in a 20 kg bucket, sandpaper by the yard, one
 * 20 L bucket of ceiling paint. Primer and the old screeding compound are no
 * longer part of it.
 */
// A Nigerian user can switch the POP page to the International workflow, and
// the prices there are the same Nigerian ones, so both lists must agree.
const finishingFor = (workflow: string) =>
  BUNDLED_POP_MATERIALS.filter(
    (m) =>
      m.workflow === workflow &&
      m.category === "finishing" &&
      m.market === "NG",
  );

const nigeriaFinishing = finishingFor("nigeria");

function row(name: string, workflow = "nigeria") {
  return finishingFor(workflow).find((m) => m.name === name);
}

describe("Nigerian POP finishing materials", () => {
  it.each(["nigeria", "international"])(
    "carries exactly the three materials a finisher buys (%s workflow)",
    (workflow) => {
      expect(
        finishingFor(workflow)
          .map((m) => m.name)
          .sort(),
      ).toEqual(["Ceiling Paint", "Sandpaper", "Screeding Putty"]);
    },
  );

  it.each(["nigeria", "international"])(
    "prices screeding putty as one 20 kg bucket at 13,500 covering 30 m² (%s workflow)",
    (workflow) => {
      const putty = row("Screeding Putty", workflow);
      // 30 m² per 20 kg bucket, so 1.5 m² per kg.
      expect(putty).toMatchObject({
        packageSize: 20,
        packageUnit: "kg",
        unitPrice: 13500,
        coverageRate: 1.5,
        coverageUnit: "m²",
      });
    },
  );

  it.each(["nigeria", "international"])(
    "sells sandpaper by the yard at 600 and paint by the 20 L bucket at 17,000 (%s workflow)",
    (workflow) => {
      expect(row("Sandpaper", workflow)).toMatchObject({
        unit: "yard",
        packageSize: 1,
        packageUnit: "yard",
        unitPrice: 600,
        coverageRate: 5,
      });
      expect(row("Ceiling Paint", workflow)).toMatchObject({
        unit: "litre",
        packageSize: 20,
        packageUnit: "litre",
        unitPrice: 17000,
      });
    },
  );

  it.each(["nigeria", "international"])(
    "has no primer and no screeding compound left (%s workflow)",
    (workflow) => {
      expect(row("Primer", workflow)).toBeUndefined();
      expect(row("Screeding Compound", workflow)).toBeUndefined();
    },
  );

  it("bills a 144 m² ceiling in whole buckets, yards and tins", () => {
    const materials = nigeriaFinishing.map(
      (m) =>
        ({
          id: m.id,
          workflow: m.workflow,
          category: m.category,
          name: m.name,
          description: null,
          unit: m.unit,
          coverage_rate: m.coverageRate,
          coverage_unit: m.coverageUnit,
          package_size: m.packageSize,
          package_unit: m.packageUnit,
          unit_price: m.unitPrice,
          labour_rate_per_sqm: 0,
          is_optional: false,
          currency: m.currency,
          is_active: true,
          sort_order: m.sortOrder,
          market: m.market,
          quantity_basis: "area",
          created_at: null,
          updated_at: null,
        }) as unknown as DbPopMaterial,
    );

    const result = calculatePopCeiling(
      {
        workflow: "nigeria",
        roomLength: 12,
        roomWidth: 12,
        unit: "meters",
        wasteMargin: 10,
        includeDecorative: false,
        includeOptional: false,
      },
      materials,
      "NGN",
      "₦",
    );

    const billed = Object.fromEntries(result.materials.map((m) => [m.name, m]));
    // 144 m² + 10% = 158.4 m²
    expect(billed["Screeding Putty"]).toMatchObject({ unit: "kg" });
    expect(billed["Screeding Putty"].quantity).toBeCloseTo(105.6, 2);
    expect(billed["Screeding Putty"].packagesNeeded).toBe(6); // 6 × 13,500
    expect(billed["Sandpaper"].quantity).toBeCloseTo(31.68, 2);
    expect(billed["Sandpaper"].packagesNeeded).toBe(32); // 32 × 600
    expect(billed["Ceiling Paint"].packagesNeeded).toBe(1); // 1 × 17,000
    expect(result.materialCost).toBe(117200);
  });

  it("names packs only when a purchase unit holds more than one unit", () => {
    // 20 kg putty buckets and 20 L paint buckets: the pack is worth naming.
    expect(formatPackageLine(105.6, "kg", 6, 20)).toBe(
      "105.6 kg · 6 × 20 kg packs",
    );
    expect(formatPackageLine(13.2, "litre", 1, 20)).toBe(
      "13.2 litre · 1 × 20 litre pack",
    );
    // Sandpaper by the yard is bought a yard at a time, so "32 packages" said
    // nothing the quantity did not already say.
    expect(formatPackageLine(31.68, "yard", 32, 1)).toBe("31.68 yard");
  });
});
