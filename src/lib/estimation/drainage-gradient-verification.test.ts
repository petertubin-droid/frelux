import { describe, expect, it } from "vitest";
import { calculateDrainageTakeoff } from "./drainage-standalone-engine";

/**
 * The self-cleansing gradient table is the only place the drainage takeoff
 * states a hydraulic limit, and a drain laid flatter than it will silt up, so
 * each row is checked at its own value and just below it.
 *
 * The published practice these follow is 1 in 60 at 75 mm, 1 in 80 at 110 mm,
 * 1 in 150 at 160 mm, then flatter for larger pipe: 1 in 200 at 200 mm, 1 in 250
 * at 250 mm and 1 in 315 at 315 mm.
 */
const run = (diameterMm: number, fallMmPerM: number) =>
  calculateDrainageTakeoff({
    marketCode: "NG",
    runs: [{ lengthM: 10, pipeDiameterMm: diameterMm, fallMmPerM }],
  });

const cautionsFor = (diameterMm: number, fallMmPerM: number) =>
  run(diameterMm, fallMmPerM).cautions.filter((c) =>
    c.includes("keep solids moving"),
  );

describe("drainage self-cleansing gradients", () => {
  it("accepts each pipe at its tabulated minimum", () => {
    const rows: Array<[number, number]> = [
      [75, 16.7],
      [110, 12.5],
      [160, 6.7],
      [200, 5.0],
      [250, 4.0],
      [315, 3.2],
    ];
    for (const [d, fall] of rows) {
      expect(cautionsFor(d, fall), `${d} mm at ${fall} mm/m`).toHaveLength(0);
    }
  });

  it("cautions just below each tabulated minimum, naming the limit", () => {
    const rows: Array<[number, number, number]> = [
      [75, 16.6, 16.7],
      [110, 12.4, 12.5],
      [160, 6.6, 6.7],
      [200, 4.9, 5.0],
      [250, 3.9, 4.0],
      [315, 3.1, 3.2],
    ];
    for (const [d, fall, limit] of rows) {
      const cautions = cautionsFor(d, fall);
      expect(cautions, `${d} mm at ${fall} mm/m`).toHaveLength(1);
      expect(cautions[0]).toContain(`${limit} mm/m`);
    }
  });

  it("holds a larger pipe to the last tabulated gradient, not to none", () => {
    // A 400 mm sewer at 1 mm/m is far too flat and used to pass without comment.
    const cautions = cautionsFor(400, 1);
    expect(cautions).toHaveLength(1);
    expect(cautions[0]).toContain("3.2 mm/m");
  });

  it("keeps the level-drain caution separate", () => {
    const level = run(110, 0);
    expect(level.cautions.some((c) => c.includes("silt up"))).toBe(true);
    expect(level.cautions.some((c) => c.includes("keep solids moving"))).toBe(
      false,
    );
  });
});
