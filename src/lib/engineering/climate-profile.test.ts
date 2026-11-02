import { describe, it, expect } from "vitest";
import { resolveClimateProfile } from "../engineering/climate-profile";
import { estimateTimeline, type TimelineInput } from "../engineering/timeline-estimator";

const base: TimelineInput = {
  building_type: "duplex",
  building_length: 10,
  building_width: 8,
  number_of_floors: 1,
  complexity: "standard",
  workforce: "medium",
  season: "dry",
  foundation_type: "strip",
  roof_type: "gable",
  has_engineer_schedule: false,
};

describe("climate profiles", () => {
  it("NG keeps the dry/rainy tropical model unchanged", () => {
    const ng = resolveClimateProfile("NG");
    expect(ng.seasons).toEqual(["dry", "rainy"]);
    const dry = estimateTimeline(base);
    const rainy = estimateTimeline({ ...base, season: "rainy" });
    expect(rainy.total_days).toBeGreaterThan(dry.total_days);
  });

  it("temperate markets use summer/winter with winter slowdown", () => {
    const gb = resolveClimateProfile("GB");
    expect(gb.seasons).toEqual(["summer", "winter"]);
    const gbSummer = estimateTimeline({ ...base, season: "summer" });
    const gbWinter = estimateTimeline({ ...base, season: "winter" });
    expect(gbWinter.total_days).toBeGreaterThan(gbSummer.total_days);
  });

  it("monsoon markets get monsoon notes and strongest slowdown", () => {
    const id = resolveClimateProfile("ID");
    expect(id.seasons).toContain("monsoon");
    const mon = estimateTimeline({ ...base, season: "monsoon" });
    const dry = estimateTimeline(base);
    expect(mon.total_days).toBeGreaterThan(dry.total_days);
    expect(JSON.stringify(mon)).toContain("Monsoon");
  });

  it("unprofiled markets fall back to the disclosed dry/rainy model marked unverified", () => {
    const xx = resolveClimateProfile("ZZ");
    expect(xx.verified).toBe(false);
    expect(xx.seasons).toEqual(["dry", "rainy"]);
  });

  it("CA winter carries a higher heuristic penalty than GB winter", () => {
    expect(resolveClimateProfile("CA").multipliers.winter).toBeGreaterThan(
      resolveClimateProfile("GB").multipliers.winter,
    );
  });
});
