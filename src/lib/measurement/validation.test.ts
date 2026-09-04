import { describe, it, expect } from "vitest";
import {
  createValidationResult,
  validateMeasurementEntry,
  isValidDimension,
  isValidQuantity,
} from "@/lib/measurement/validation";
import type { MeasurementEntry } from "@/lib/measurement/types";
import type { CalculatorContext } from "@/lib/measurement/units";

function makeEntry(
  overrides: Partial<MeasurementEntry> = {},
): MeasurementEntry {
  return {
    id: "e1",
    space_type: "bedroom",
    surface: "wall",
    unit: "meters",
    length: 4,
    width: 3,
    height: 2.5,
    quantity: 1,
    ...overrides,
  } as MeasurementEntry;
}

describe("createValidationResult", () => {
  it("returns a valid result with empty arrays", () => {
    const r = createValidationResult();
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});

describe("isValidDimension", () => {
  it("true for positive number", () => expect(isValidDimension(5)).toBe(true));
  it("false for zero", () => expect(isValidDimension(0)).toBe(false));
  it("false for negative", () => expect(isValidDimension(-1)).toBe(false));
  it("false for NaN", () => expect(isValidDimension(NaN)).toBe(false));
  it("false for Infinity", () =>
    expect(isValidDimension(Infinity)).toBe(false));
  it("false for undefined", () =>
    expect(isValidDimension(undefined)).toBe(false));
});

describe("isValidQuantity", () => {
  it("true for 1", () => expect(isValidQuantity(1)).toBe(true));
  it("true for 5", () => expect(isValidQuantity(5)).toBe(true));
  it("false for 0", () => expect(isValidQuantity(0)).toBe(false));
  it("false for negative", () => expect(isValidQuantity(-1)).toBe(false));
  it("false for NaN", () => expect(isValidQuantity(NaN)).toBe(false));
});

describe("validateMeasurementEntry", () => {
  const ctx: CalculatorContext = "painting";

  it("passes for a valid entry", () => {
    const r = validateMeasurementEntry(makeEntry(), ctx);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("fails for zero length", () => {
    const r = validateMeasurementEntry(makeEntry({ length: 0 }), ctx);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Length"))).toBe(true);
  });

  it("fails for negative width", () => {
    const r = validateMeasurementEntry(makeEntry({ width: -5 }), ctx);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Width"))).toBe(true);
  });

  it("fails for zero quantity", () => {
    const r = validateMeasurementEntry(makeEntry({ quantity: 0 }), ctx);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Quantity"))).toBe(true);
  });

  it("fails for inches in painting context", () => {
    const r = validateMeasurementEntry(makeEntry({ unit: "inches" }), ctx);
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) => e.includes("inches") || e.includes("Inches")),
    ).toBe(true);
  });

  it("allows inches in block context", () => {
    const r = validateMeasurementEntry(makeEntry({ unit: "inches" }), "block");
    expect(
      r.errors.some((e) => e.includes("inches") || e.includes("Inches")),
    ).toBe(false);
  });

  it("fails for missing length", () => {
    const r = validateMeasurementEntry(makeEntry({ length: undefined }), ctx);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Length"))).toBe(true);
  });

  it("fails for NaN height", () => {
    const r = validateMeasurementEntry(makeEntry({ height: NaN }), ctx);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Height"))).toBe(true);
  });

  it("fails for quantity < 1", () => {
    const r = validateMeasurementEntry(makeEntry({ quantity: 0.5 }), ctx);
    expect(r.valid).toBe(false);
  });
});
