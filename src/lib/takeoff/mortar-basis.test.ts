import { describe, expect, it } from "vitest";
import {
  CEMENT_BAG_KG,
  CEMENT_BAG_M3,
  CEMENT_DENSITY_KG_M3,
  MORTAR_DRY_FACTOR,
  blockworkAssembly,
} from "./assemblies";
import { CEMENT_BAG_VOLUME_M3, MORTAR_DRY_FACTOR as PLASTER_DRY_FACTOR } from "@/lib/wallfinishing/quantity-engine";

const line = (lines: ReturnType<typeof blockworkAssembly>, material: string) => {
  const found = lines.find((l) => l.material === material);
  if (!found) throw new Error(`${material} missing from the assembly`);
  return found;
};

describe("the material basis shared by the mortar engines", () => {
  it("sizes a bag from its mass and the cement bulk density", () => {
    // 50 kg at 1440 kg/m3 is 0.03472 m3, so the stored 0.0347 is that bag.
    expect(CEMENT_BAG_M3 * CEMENT_DENSITY_KG_M3).toBeCloseTo(CEMENT_BAG_KG, 0);
    expect(CEMENT_BAG_M3).toBeCloseTo(CEMENT_BAG_KG / CEMENT_DENSITY_KG_M3, 4);
  });

  it("uses one bag volume and one dry factor across the engines", () => {
    expect(CEMENT_BAG_VOLUME_M3).toBe(CEMENT_BAG_M3);
    expect(PLASTER_DRY_FACTOR).toBe(MORTAR_DRY_FACTOR);
  });

  it("turns a cubic metre of 1:6 mortar into the published bag count", () => {
    // 1 m3 wet x 1.33 = 1.33 m3 dry; cement share 1/7 = 0.19 m3 = 5.48 bags of
    // 0.0347 m3, so 6 bags are bought and 1.14 m3 of sand is needed. Without the
    // dry factor this line reported 4 bags, a 33 percent understatement.
    const assembly = blockworkAssembly(1 / 0.03, { mix: { cement: 1, sand: 6 }, mortarWastePct: 0 });
    const mortar = line(assembly, "Mortar");
    expect(mortar.quantity).toBeCloseTo(1, 6);

    const cement = line(assembly, "Cement");
    expect(cement.purchaseQuantity).toBe(6);
    // 0.19 m3 of cement at 1440 kg/m3 is 274 kg of the net line.
    expect(cement.netQuantity).toBeCloseTo(274, 0);

    const sand = line(assembly, "Sand");
    // 1.33 x 6/7 = 1.14 m3 per cubic metre of laid mortar.
    expect(sand.quantity).toBeCloseTo(1.14, 2);
  });

  it("keeps the demo wall on six bags instead of four", () => {
    // 28.08 m2 at 0.03 m3/m2, 10 percent mortar waste, 1:6: 0.9266 m3 wet,
    // 1.2324 m3 dry, 0.1761 m3 cement, 5.075 bags, so 6 bags.
    const assembly = blockworkAssembly(28.08, { mix: { cement: 1, sand: 6 } });
    expect(line(assembly, "Cement").purchaseQuantity).toBe(6);
    expect(line(assembly, "Mortar").quantity).toBeCloseTo(0.9266, 3);
  });

  it("states the dry volume in the audit trail rather than hiding it", () => {
    const assembly = blockworkAssembly(10, { mix: { cement: 1, sand: 4 } });
    const cement = line(assembly, "Cement");
    expect(cement.derivation.formula).toMatch(/dry factor/);
    expect(cement.derivation.inputs?.dryFactor).toBe(MORTAR_DRY_FACTOR);
    const labels = (cement.derivation.steps ?? []).map((s) => s.label);
    expect(labels).toContain("Dry mix");
  });
});
