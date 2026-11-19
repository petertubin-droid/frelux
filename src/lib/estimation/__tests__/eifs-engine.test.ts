import { describe, it, expect } from "vitest";
import { calculateEifsWall, type EifsWallInput } from "../eifs-engine";

describe("EIFS / ETICS Takeoff & Engineering Engine", () => {
  const baseInput: EifsWallInput = {
    wallLengthM: 40,
    wallHeightM: 3.0,
    insulationThicknessMm: 50,
    substrateType: "exterior_sheathing",
    insulationType: "standard_eps",
    systemType: "drainable_eifs",
    attachmentMethod: "dual_adhesive_mechanical",
    finishTexture: "medium_swirl",
    wasteFactorPercent: 5,
    exteriorCornersCount: 4,
    impactMeshHeightM: 2.0,
    laborCrewSize: 4,
  };

  it("calculates gross geometry, boards count, and materials accurately", () => {
    const res = calculateEifsWall(baseInput);

    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.geometry.grossAreaM2).toBe(120);
    expect(res.geometry.netFacadeAreaM2).toBe(120);
    // Effective area with 5% waste: 120 * 1.05 = 126 m²
    expect(res.geometry.effectiveAreaM2).toBe(126);

    // Board count: 126 / 0.72 = 175 boards
    expect(res.insulation.boardsCount).toBe(175);
    expect(res.insulation.bundlesCount).toBe(30); // 175 / 6 = 29.16 -> 30 bundles
    expect(res.insulation.continuousRValueUS).toBeGreaterThan(7.0);

    // WRB & Drainage
    expect(res.wrbAndDrainage.fluidWrbPails5Gal).toBeGreaterThan(0);
    expect(res.wrbAndDrainage.drainageMatRolls).toBeGreaterThan(0);

    // Reinforcing & base coat
    expect(res.reinforcing.standardMeshRolls50M2).toBe(3); // 126 * 1.10 = 138.6 / 50 = 2.77 -> 3 rolls
    expect(res.reinforcing.highImpactMeshRolls25M2).toBeGreaterThan(0);
    expect(res.reinforcing.baseCoatBags25Kg).toBeGreaterThan(0);

    // Finish
    expect(res.finish.finishPails25Kg).toBeGreaterThan(0);
    expect(res.accessories.starterTrackPieces3M).toBeGreaterThan(0);
    expect(res.accessories.cornerBeadPieces3M).toBeGreaterThan(0);
  });

  it("deducts openings accurately and adds reveal returns, butterfly patches, and flashing", () => {
    const inputWithOpenings: EifsWallInput = {
      ...baseInput,
      openings: [
        {
          id: "w1",
          label: "Window Front",
          widthM: 1.5,
          heightM: 1.2,
          count: 4,
          revealDepthMm: 100,
        },
        {
          id: "d1",
          label: "Entry Door",
          widthM: 1.0,
          heightM: 2.1,
          count: 1,
          revealDepthMm: 100,
        },
      ],
    };

    const res = calculateEifsWall(inputWithOpenings);

    // Deducted opening area: (1.5*1.2*4) + (1.0*2.1*1) = 7.2 + 2.1 = 9.3 m²
    expect(res.geometry.openingsAreaM2).toBeCloseTo(9.3, 1);

    // Openings perimeter: 4 * 2*(1.5+1.2) + 1 * 2*(1.0+2.1) = 4*5.4 + 6.2 = 27.8 m
    expect(res.geometry.openingsPerimeterM).toBe(27.8);

    // Reveal area added: 27.8 * 0.1m = 2.78 m²
    expect(res.geometry.revealAreaM2).toBeCloseTo(2.78, 2);

    // Net area: 120 - 9.3 + 2.78 = 113.48 m²
    expect(res.geometry.netFacadeAreaM2).toBeCloseTo(113.48, 2);

    // 5 openings * 4 butterfly patches = 20 patches
    expect(res.reinforcing.butterflyPatchesCount).toBe(20);

    // Flashing tape and sealant joints
    expect(res.wrbAndDrainage.flashingTapeRolls).toBeGreaterThan(0);
    expect(res.accessories.sealantSausages600Ml).toBeGreaterThan(0);
  });

  it("warns about barrier EIFS on wood/steel sheathing and flags code requirements", () => {
    const barrierInput: EifsWallInput = {
      ...baseInput,
      substrateType: "exterior_sheathing",
      systemType: "barrier_eifs",
    };

    const res = calculateEifsWall(barrierInput);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings.some((w) => w.includes("IBC 1407.4.1"))).toBe(true);
    // Barrier system should not generate drainage mat
    expect(res.wrbAndDrainage.drainageMatRolls).toBe(0);
  });

  it("calculates thermal performance metrics across different insulation types", () => {
    const eps = calculateEifsWall({
      ...baseInput,
      insulationType: "standard_eps",
      insulationThicknessMm: 100,
    });
    const neopor = calculateEifsWall({
      ...baseInput,
      insulationType: "graphite_neopor",
      insulationThicknessMm: 100,
    });
    const mineralWool = calculateEifsWall({
      ...baseInput,
      insulationType: "mineral_wool",
      insulationThicknessMm: 100,
    });

    // Neopor GPS has higher R-value than standard EPS
    expect(neopor.insulation.continuousRValueUS).toBeGreaterThan(
      eps.insulation.continuousRValueUS,
    );
    // Neopor has lower U-factor (better thermal resistance)
    expect(neopor.insulation.uFactorMetric).toBeLessThan(
      eps.insulation.uFactorMetric,
    );
    // 100mm continuous insulation should exceed or meet high energy benchmarks
    expect(neopor.insulation.complianceScore).toBe("exceeds");
    expect(mineralWool.insulation.continuousRValueUS).toBeGreaterThan(15.0);
  });

  it("handles attachment method variations (adhesive only vs dual vs mechanical)", () => {
    const adhesiveOnly = calculateEifsWall({
      ...baseInput,
      attachmentMethod: "adhesive_only",
    });
    const mechanicalOnly = calculateEifsWall({
      ...baseInput,
      attachmentMethod: "mechanical_only",
    });
    const dual = calculateEifsWall({
      ...baseInput,
      attachmentMethod: "dual_adhesive_mechanical",
    });

    expect(adhesiveOnly.attachment.mechanicalFastenersCount).toBe(0);
    expect(adhesiveOnly.attachment.adhesiveBags25Kg).toBeGreaterThan(0);

    expect(mechanicalOnly.attachment.adhesiveKg).toBe(0);
    expect(mechanicalOnly.attachment.mechanicalFastenersCount).toBeGreaterThan(
      0,
    );

    expect(dual.attachment.adhesiveBags25Kg).toBeGreaterThan(0);
    expect(dual.attachment.mechanicalFastenersCount).toBeGreaterThan(0);
  });

  it("disallows negative or impossible geometries and returns clean errors", () => {
    const invalidRes = calculateEifsWall({
      ...baseInput,
      wallLengthM: -10,
      wallHeightM: 0,
      insulationThicknessMm: 0 as any,
    });

    expect(invalidRes.ok).toBe(false);
    expect(invalidRes.errors.length).toBeGreaterThanOrEqual(2);

    const oversizedOpenings = calculateEifsWall({
      ...baseInput,
      openings: [
        { id: "huge", label: "Glass Wall", widthM: 50, heightM: 10, count: 1 },
      ],
    });
    expect(oversizedOpenings.ok).toBe(false);
    expect(
      oversizedOpenings.errors.some((e) => e.includes("cannot exceed")),
    ).toBe(true);
  });

  it("generates an itemized Bill of Quantities covering all physical trades", () => {
    const res = calculateEifsWall(baseInput);

    expect(res.boq.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(res.boq.map((item) => item.category));
    expect(categories.has("envelope")).toBe(true);
    expect(categories.has("insulation")).toBe(true);
    expect(categories.has("attachment")).toBe(true);
    expect(categories.has("reinforcing")).toBe(true);
    expect(categories.has("finish")).toBe(true);
    expect(categories.has("accessories")).toBe(true);
    expect(categories.has("labor")).toBe(true);

    for (const item of res.boq) {
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.unit.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(10);
    }
  });
});
