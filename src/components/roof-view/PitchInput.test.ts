import { describe, it, expect } from "vitest";
import {
  PITCH_RATIOS,
  pitchRatioToDegrees,
  degreesToPitchRatio,
} from "@/components/roof-view/PitchInput";

describe("PITCH_RATIOS", () => {
  it("has 11 standard ratios", () => {
    expect(PITCH_RATIOS).toHaveLength(11);
  });
  it("includes 1:12 through 12:12", () => {
    const ratios = PITCH_RATIOS.map((r) => r.ratio);
    expect(ratios).toContain("1:12");
    expect(ratios).toContain("6:12");
    expect(ratios).toContain("12:12");
  });
  it("each has ratio, degrees, and label", () => {
    PITCH_RATIOS.forEach((r) => {
      expect(r.ratio).toBeTruthy();
      expect(r.degrees).toBeGreaterThan(0);
      expect(r.degrees).toBeLessThan(90);
      expect(r.label).toBeTruthy();
    });
  });
  it("degrees increase with ratio", () => {
    for (let i = 1; i < PITCH_RATIOS.length; i++) {
      expect(PITCH_RATIOS[i].degrees).toBeGreaterThan(
        PITCH_RATIOS[i - 1].degrees,
      );
    }
  });
  it("12:12 is 45 degrees", () => {
    const half = PITCH_RATIOS.find((r) => r.ratio === "12:12");
    expect(half?.degrees).toBe(45.0);
  });
});

describe("pitchRatioToDegrees", () => {
  it("converts 4:12 to ~18.43 degrees", () => {
    expect(pitchRatioToDegrees("4:12")).toBeCloseTo(18.43, 1);
  });
  it("converts 12:12 to 45 degrees", () => {
    expect(pitchRatioToDegrees("12:12")).toBeCloseTo(45, 1);
  });
  it("converts 1:12 to ~4.76 degrees", () => {
    expect(pitchRatioToDegrees("1:12")).toBeCloseTo(4.76, 1);
  });
  it("returns null for invalid format", () => {
    expect(pitchRatioToDegrees("invalid")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(pitchRatioToDegrees("")).toBeNull();
  });
  it("returns null for zero run", () => {
    expect(pitchRatioToDegrees("4:0")).toBeNull();
  });
  it("handles decimal ratios", () => {
    const result = pitchRatioToDegrees("4.5:12");
    expect(result).toBeCloseTo(20.56, 1);
  });
  it("handles spaces in ratio", () => {
    expect(pitchRatioToDegrees("4 : 12")).toBeCloseTo(18.43, 1);
  });
});

describe("degreesToPitchRatio", () => {
  it("returns 12:12 for 45 degrees", () => {
    expect(degreesToPitchRatio(45)).toBe("12:12");
  });
  it("returns 4:12 for ~18.43 degrees", () => {
    expect(degreesToPitchRatio(18.43)).toBe("4:12");
  });
  it("returns 6:12 for ~26.57 degrees", () => {
    expect(degreesToPitchRatio(26.57)).toBe("6:12");
  });
  it("returns null for negative degrees", () => {
    expect(degreesToPitchRatio(-5)).toBeNull();
  });
  it("returns null for >= 90 degrees", () => {
    expect(degreesToPitchRatio(90)).toBeNull();
    expect(degreesToPitchRatio(100)).toBeNull();
  });
  it("returns 1:12 for very low degrees", () => {
    expect(degreesToPitchRatio(4)).toBe("1:12");
  });
  it("returns closest ratio for in-between degrees", () => {
    // 20 degrees is between 4:12 (18.43) and 5:12 (22.62)
    // 18.43 diff = 1.57, 22.62 diff = 2.62, so closest is 4:12
    expect(degreesToPitchRatio(20)).toBe("4:12");
  });
});
