/**
 * One definition per SI factor.
 *
 * LENGTH_TO_M in lib/convert/units is the only place a metres-per-unit factor
 * is written down. Calculators, engines and display layers read it from there,
 * so a correction cannot land in one layer and miss another.
 */
import { describe, expect, it } from "vitest";
import { LENGTH_TO_M } from "@/lib/convert/units";
import { ALL_UNITS, UNIT_TO_M, unitToMeters } from "@/lib/utils";

describe("length factors have a single source", () => {
  it("exposes exactly the units it can convert", () => {
    expect(Object.keys(UNIT_TO_M).sort()).toEqual([...ALL_UNITS].sort());
  });

  it("matches the central SI table to the last bit", () => {
    expect(UNIT_TO_M).toEqual({
      meters: LENGTH_TO_M.m,
      feet: LENGTH_TO_M.ft,
      inches: LENGTH_TO_M.in,
      centimeters: LENGTH_TO_M.cm,
      millimeters: LENGTH_TO_M.mm,
    });
  });

  it("converts a foot exactly, with no 5-figure approximation", () => {
    expect(unitToMeters(1, "feet")).toBe(0.3048);
    expect(unitToMeters(3, "feet")).toBeCloseTo(0.9144, 12);
    expect(unitToMeters(1, "inches")).toBe(0.0254);
  });
});
