import { describe, expect, it } from "vitest";
import { BUNDLED_POP_MATERIALS } from "@/lib/international/bundled-price-books";
import { calculatePopCeiling } from "@/lib/pop-tile-calc";
import type { DbPopMaterial } from "@/types/database";

/**
 * The Nigerian POP finishing list, checked against what the supplier actually
 * sells: one screeding putty in a 20 kg bucket, sandpaper by the yard, one
 * 20 L bucket of ceiling paint. Primer and the old screeding compound are no
 * longer part of it.
 */
const nigeriaFinishing = BUNDLED_POP_MATERIALS.filter(
  (m) => m.workflow === "nigeria" && m.category === "finishing",
);

function row(name: string) {
  return nigeriaFinishing.find((m) => m.name === name);
}

describe("Nigerian POP finishing materials", () => {
  it("carries exactly the three materials a finisher buys", () => {
    expect(nigeriaFinishing.map((m) => m.name).sort()).toEqual([
      "Ceiling Paint",
      "Sandpaper",
      "Screeding Putty",
    ]);
  });

  it("prices screeding putty as one 20 kg bucket at 13,500 covering 30 m²", () => {
    const putty = row("Screeding Putty");
    // 30 m² per 20 kg bucket, so 1.5 m² per kg.
    expect(putty).toMatchObject({
      packageSize: 20,
      packageUnit: "kg",
      unitPrice: 13500,
      coverageRate: 1.5,
      coverageUnit: "m²",
    });
  });

  it("sells sandpaper by the yard at 600 and paint by the 20 L bucket at 17,000", () => {
    expect(row("Sandpaper")).toMatchObject({
      unit: "yard",
      packageSize: 1,
      packageUnit: "yard",
      unitPrice: 600,
      coverageRate: 5,
    });
    expect(row("Ceiling Paint")).toMatchObject({
      unit: "litre",
      packageSize: 20,
      packageUnit: "litre",
      unitPrice: 17000,
    });
  });

  it("has no primer and no screeding compound left", () => {
    expect(row("Primer")).toBeUndefined();
    expect(row("Screeding Compound")).toBeUndefined();
  });

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
});
