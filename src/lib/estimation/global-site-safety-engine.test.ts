import { describe, expect, it } from "vitest";
import {
  calculateSiteSafety,
  SAFETY_FRAMEWORKS,
  type SiteSafetyInput,
} from "./global-site-safety-engine";

const base: SiteSafetyInput = {
  framework: "INTERNATIONAL_ISO",
  perimeterMeters: 100,
  crewCount: 10,
  reservePpe: 2,
  signSpacingMeters: 15,
  workersAtHeight: 4,
  hasFallRisk: true,
  hasExcavation: true,
  excavationPerimeterMeters: 20,
  tapeLines: 2,
  excavationSignCount: 4,
  hasHotWork: true,
  firstAidWorkersPerKit: 10,
  fireExtinguisherCount: 2,
};

describe("global site safety planning arithmetic", () => {
  it("uses only explicit, editable planning assumptions", () => {
    expect(calculateSiteSafety(base)).toMatchObject({
      perimeterSigns: 7,
      hardHats: 12,
      safetyBootPairs: 10,
      fallProtectionUsers: 4,
      excavationTapeMeters: 40,
      excavationSigns: 4,
      firstAidKits: 1,
      fireExtinguishers: 2,
    });
  });
  it("does not generate hazard controls when the corresponding site feature is absent", () => {
    const result = calculateSiteSafety({
      ...base,
      hasFallRisk: false,
      hasExcavation: false,
      hasHotWork: false,
    });
    expect(result.fallProtectionUsers).toBe(0);
    expect(result.excavationSigns).toBe(0);
    expect(result.excavationTapeMeters).toBe(0);
    expect(result.fireExtinguishers).toBe(0);
  });
  it("clamps invalid and negative quantities safely", () => {
    const result = calculateSiteSafety({
      ...base,
      perimeterMeters: -12,
      crewCount: Number.NaN,
      workersAtHeight: 99,
      signSpacingMeters: 0,
    });
    expect(result.perimeterSigns).toBe(0);
    expect(result.hardHats).toBe(2);
    expect(result.fallProtectionUsers).toBe(0);
  });
  it("provides framework-specific references without implying universal compliance", () => {
    expect(SAFETY_FRAMEWORKS.OSHA_US.references).toContain("29 CFR 1926.50");
    expect(SAFETY_FRAMEWORKS.UK_HSE_CDM.fallProtectionNote).toContain(
      "not a universal trigger",
    );
  });
});
