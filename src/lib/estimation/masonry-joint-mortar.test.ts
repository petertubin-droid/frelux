import { describe, expect, it } from "vitest";
import { calculateMasonryTakeoff } from "@/lib/estimation/masonry-standalone-engine";

/**
 * A 30 m2 wall of Nigerian 450 x 225 x 225 mm hollow blocks, standard joint
 * 12 mm. The allowance the engine carries is 0.018 m3 of wet mortar per m2 of a
 * 200 mm wall at the unit's standard joint, which scales to
 *   0.018 x (0.225 / 0.2) = 0.02025 m3/m2,
 * so 30 m2 needs 0.6075 m3 before the dry factor.
 */
const wall = (jointThicknessMm: number) =>
  calculateMasonryTakeoff({
    marketCode: "NG",
    wallLengthM: 10,
    wallHeightM: 3,
    jointThicknessMm,
    wastePercent: 0,
  });

describe("mortar follows the joint, not just the wall", () => {
  it("matches the allowance at the standard joint", () => {
    // 0.6075 m3, printed as 0.608 because a half rounds up.
    expect(wall(12).mortarVolumeM3Net).toBeCloseTo(0.608, 3);
  });

  it("asks for almost no mortar when the joints are 1 mm", () => {
    // 0.6075 / 12 = 0.0506 m3. The engine used to return the 12 mm figure here,
    // which is twelve times the mortar the wall can take.
    expect(wall(1).mortarVolumeM3Net).toBeCloseTo(0.0506, 3);
  });

  it("doubles the mortar when the joints double", () => {
    expect(wall(24).mortarVolumeM3Net).toBeCloseTo(1.215, 3);
  });

  it("still spends fewer blocks as the joints thicken", () => {
    const thin = wall(1);
    const standard = wall(12);
    const wide = wall(24);
    expect(thin.unitsRequiredNet).toBeGreaterThan(standard.unitsRequiredNet);
    expect(standard.unitsRequiredNet).toBeGreaterThan(wide.unitsRequiredNet);
    // 30 / (0.474 x 0.249) = 254.2 blocks, so 255 have to be ordered.
    expect(wide.unitsRequiredGross).toBe(255);
  });

  it("carries the joint change through cement and sand", () => {
    const standard = wall(12);
    const wide = wall(24);
    expect(wide.cementBagsRequired).toBeGreaterThan(
      standard.cementBagsRequired,
    );
    // 0.673 m3 becomes 1.346 m3, so the printed figures are 0.67 and 1.35.
    expect(wide.sandVolumeM3).toBeCloseTo(1.35, 2);
  });
});
