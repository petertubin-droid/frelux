import { describe, expect, it } from "vitest";
import { getPackagingEvidence } from "./market-packaging-verification";

describe("market packaging evidence", () => {
  it("labels a configured regional pack weight as an assumption, not verification", () => {
    expect(getPackagingEvidence("gb", "cement", 25)).toMatchObject({
      marketCode: "GB",
      quantityKg: 25,
      status: "planning_assumption",
      label: "Planning assumption · supplier confirmation required",
    });
    expect(getPackagingEvidence("GB", "cement", 25).guidance).toContain(
      "not a verified country-wide standard",
    );
  });

  it("does not invent an unavailable package size", () => {
    expect(getPackagingEvidence("XX", "cement", undefined)).toMatchObject({
      marketCode: "XX",
      quantityKg: null,
      status: "not_available",
      label: "Package size not verified",
    });
  });

  it("rejects non-positive and non-finite pack quantities", () => {
    for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(getPackagingEvidence("US", "cement", size).quantityKg).toBeNull();
    }
  });
});
