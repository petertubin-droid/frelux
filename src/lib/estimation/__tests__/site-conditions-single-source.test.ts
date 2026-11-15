import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONCRETE_DRY_VOLUME_FACTOR,
  MORTAR_DRY_VOLUME_FACTOR,
  PAINT_SURFACE_FACTORS,
  PAINT_SURFACE_TO_POROSITY,
  SURFACE_POROSITY_PROFILES,
  resolvePaintSurfaceFactor,
} from "../site-conditions";
import { SURFACE_CONDITION_FACTORS } from "@/lib/calc";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("site conditions are defined once", () => {
  it("keeps the engineering factors at their published values", () => {
    expect(CONCRETE_DRY_VOLUME_FACTOR).toBe(1.54);
    expect(MORTAR_DRY_VOLUME_FACTOR).toBe(1.33);
  });

  it("feeds the paint estimator from the same table", () => {
    expect(SURFACE_CONDITION_FACTORS).toBe(PAINT_SURFACE_FACTORS);
    expect(resolvePaintSurfaceFactor("new_plaster")).toBe(0.75);
    expect(resolvePaintSurfaceFactor("unknown-surface")).toBe(1);
  });

  it("stops engines hardcoding the dry volume factor again", () => {
    const engine = read("src/lib/estimation/advanced-takeoff-engine.ts");
    expect(engine).not.toMatch(/\*\s*1\.54\b/);
    expect(engine).not.toMatch(/\*\s*1\.33\b/);
  });

  it("keeps the paint factor table out of the calculator module", () => {
    const calc = read("src/lib/calc.ts");
    expect(calc).toContain("PAINT_SURFACE_FACTORS");
    expect(calc).not.toMatch(/new_plaster:\s*\{\s*factor:/);
  });
});

describe("paint surface coverage agrees with the porosity profiles", () => {
  it("maps every paint surface to a porosity profile", () => {
    for (const key of Object.keys(PAINT_SURFACE_FACTORS)) {
      expect(PAINT_SURFACE_TO_POROSITY[key]).toBeDefined();
    }
  });

  it("matches the profile multiplier wherever absorption is the only effect", () => {
    for (const [key, entry] of Object.entries(PAINT_SURFACE_FACTORS)) {
      if (key === "textured") continue; // area penalty, not absorption
      const profile = SURFACE_POROSITY_PROFILES[PAINT_SURFACE_TO_POROSITY[key]];
      expect(entry.factor).toBe(profile.coverageMultiplier);
    }
  });

  it("charges texture for its area without double counting absorption", () => {
    const profile =
      SURFACE_POROSITY_PROFILES[PAINT_SURFACE_TO_POROSITY.textured];
    expect(profile.coverageMultiplier).toBe(1);
    expect(PAINT_SURFACE_FACTORS.textured.factor).toBe(0.85);
  });
});
