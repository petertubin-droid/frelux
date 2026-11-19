// =========================================================
// ICF AND EIFS PRICING CONTRACT
//
// Both engines are quantity engines. These tests pin the contract that makes
// them priceable: every line that a market can price names a role and states
// its quantity in the unit that role is sold in. They also pin two defects
// found while wiring it up: a doubled form area and an unclamped custom core.
// =========================================================

import { describe, it, expect } from "vitest";
import { calculateIcfWall } from "../icf-engine";
import { calculateEifsWall } from "../eifs-engine";
import { ROLE_PRICING_UNIT } from "../system-boq-pricing";

type Line = {
  code: string;
  quantity: number;
  priceRole?: string;
  pricingQuantity?: number;
  pricingUnit?: string;
};

function byCode(lines: Line[], code: string): Line {
  const hit = lines.find((l) => l.code === code);
  if (!hit) throw new Error(`no BOQ line ${code}`);
  return hit;
}

describe("ICF pricing contract", () => {
  const result = calculateIcfWall({
    wallLengthM: 40,
    wallHeightM: 3,
    coreThicknessMm: 200,
    marketCode: "US",
  } as never);
  const lines = result.boq as unknown as Line[];

  it("prices formwork per square metre of face, not per block", () => {
    const line = byCode(lines, "ICF-BLK-STR");
    expect(line.priceRole).toBe("icf-form-block");
    expect(line.pricingUnit).toBe("m²");
    // 40 x 3 m wall with the default 4% cutting allowance is 124.8 m2.
    // It must never be twice that, which is what adding 1 to an already
    // multiplicative waste factor produced.
    expect(line.pricingQuantity).toBeCloseTo(124.8, 1);
    expect(line.pricingQuantity).toBeLessThan(
      result.geometry.netWallAreaM2 * 1.1,
    );
  });

  it("prices ready-mix in cubic metres matching the order volume", () => {
    const line = byCode(lines, "CONC-ICF-PUMP");
    expect(line.priceRole).toBe("icf-concrete");
    expect(line.pricingUnit).toBe("m³");
    expect(line.pricingQuantity).toBeCloseTo(result.concrete.totalVolumeM3, 2);
  });

  it("prices every steel line by weight, never by bar count", () => {
    for (const code of [
      "STL-REBAR-DOWEL",
      "STL-REBAR-VERT",
      "STL-REBAR-HORIZ",
    ]) {
      const line = byCode(lines, code);
      expect(line.priceRole).toBe("icf-rebar");
      expect(line.pricingUnit).toBe("kg");
      expect(line.pricingQuantity).toBeGreaterThan(0);
      expect(line.pricingQuantity).not.toBe(line.quantity);
    }
  });

  it("leaves bracing, fixings and labour quantity-only on purpose", () => {
    for (const code of [
      "BRC-JACK-TURN",
      "FST-DRYWALL-SCREW",
      "LBR-ICF-INSTALL",
    ]) {
      const line = byCode(lines, code);
      expect(line.priceRole).toBeUndefined();
    }
  });

  it("uses the priced unit each role declares", () => {
    for (const line of lines.filter((l) => l.priceRole)) {
      expect(line.pricingUnit).toBe(ROLE_PRICING_UNIT[line.priceRole as never]);
    }
  });

  it("uses the block face size the buyer's system actually has", () => {
    // North American blocks are 48 in x 16 in (1219 x 406 mm), not the metric
    // 1200 x 400. A larger face means fewer blocks for the same wall.
    const na = calculateIcfWall({
      wallLengthM: 40,
      wallHeightM: 3,
      coreThicknessMm: 200,
      blockFaceLengthMm: 1219,
      blockFaceHeightMm: 406,
      marketCode: "US",
    } as never);
    const metric = calculateIcfWall({
      wallLengthM: 40,
      wallHeightM: 3,
      coreThicknessMm: 200,
      blockFaceLengthMm: 1200,
      blockFaceHeightMm: 400,
      marketCode: "GB",
    } as never);
    expect(na.blocks.nominalBlockAreaM2).toBeCloseTo(1.219 * 0.406, 4);
    expect(na.blocks.totalBlocksCount).toBeLessThan(
      metric.blocks.totalBlocksCount,
    );
    // The wall area does not change with the block size, only the count.
    expect(na.geometry.netWallAreaM2).toBeCloseTo(
      metric.geometry.netWallAreaM2,
      2,
    );
  });

  it("honours a custom core outside the standard brackets", () => {
    const custom = calculateIcfWall({
      wallLengthM: 10,
      wallHeightM: 3,
      coreThicknessMm: 150,
      customCoreThicknessMm: 175,
      marketCode: "US",
    } as never);
    expect(custom.concrete.coreThicknessMm).toBe(175);
    // A thicker core is more concrete for the same wall.
    const standard = calculateIcfWall({
      wallLengthM: 10,
      wallHeightM: 3,
      coreThicknessMm: 150,
      marketCode: "US",
    } as never);
    expect(custom.concrete.totalVolumeM3).toBeGreaterThan(
      standard.concrete.totalVolumeM3,
    );
  });

  it("clamps an impossible custom core instead of building it", () => {
    const tooThick = calculateIcfWall({
      wallLengthM: 10,
      wallHeightM: 3,
      coreThicknessMm: 150,
      customCoreThicknessMm: 900,
      marketCode: "US",
    } as never);
    expect(tooThick.concrete.coreThicknessMm).toBe(400);
    const tooThin = calculateIcfWall({
      wallLengthM: 10,
      wallHeightM: 3,
      coreThicknessMm: 150,
      customCoreThicknessMm: 10,
      marketCode: "US",
    } as never);
    expect(tooThin.concrete.coreThicknessMm).toBe(75);
  });
});

describe("EIFS pricing contract", () => {
  const result = calculateEifsWall({
    wallLengthM: 40,
    wallHeightM: 3,
    insulationThicknessMm: 50,
    marketCode: "US",
  } as never);
  const lines = result.boq as unknown as Line[];

  it("prices boards per square metre of facade", () => {
    const line = byCode(lines, "EIFS-INS-01");
    expect(line.priceRole).toBe("eifs-insulation");
    expect(line.pricingUnit).toBe("m²");
    expect(line.pricingQuantity).toBeGreaterThan(120);
  });

  it("prices wet and dry materials by mass", () => {
    for (const [code, role] of [
      ["EIFS-ADH-01", "eifs-adhesive"],
      ["EIFS-BAS-01", "eifs-basecoat"],
      ["EIFS-PRM-01", "eifs-primer"],
      ["EIFS-FIN-01", "eifs-finish"],
    ] as const) {
      const line = byCode(lines, code);
      expect(line.priceRole).toBe(role);
      expect(line.pricingUnit).toBe("kg");
      expect(line.pricingQuantity).toBeGreaterThan(0);
    }
  });

  it("prices mesh per square metre including the impact zone", () => {
    const standard = byCode(lines, "EIFS-MSH-01");
    expect(standard.priceRole).toBe("eifs-mesh");
    expect(standard.pricingUnit).toBe("m²");
    const impact = lines.find((l) => l.code === "EIFS-MSH-02");
    if (impact) expect(impact.pricingUnit).toBe("m²");
  });

  it("keeps WRB, drainage, trims and labour quantity-only", () => {
    for (const code of [
      "EIFS-WRB-01",
      "EIFS-DRN-03",
      "EIFS-TRM-01",
      "EIFS-LAB-01",
    ]) {
      expect(byCode(lines, code).priceRole).toBeUndefined();
    }
  });

  it("honours and clamps a custom board thickness", () => {
    const custom = calculateEifsWall({
      wallLengthM: 10,
      wallHeightM: 3,
      insulationThicknessMm: 50,
      customInsulationThicknessMm: 90,
      marketCode: "US",
    } as never);
    expect(custom.insulation.thicknessMm).toBe(90);
    const clamped = calculateEifsWall({
      wallLengthM: 10,
      wallHeightM: 3,
      insulationThicknessMm: 50,
      customInsulationThicknessMm: 500,
      marketCode: "US",
    } as never);
    expect(clamped.insulation.thicknessMm).toBe(300);
  });
});
