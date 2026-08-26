import { describe, it, expect } from "vitest";
import {
  createValidationResult,
  formatConfigWarning,
  validateDimensions,
  validateQuantity,
  validateUnit,
  validateProduct,
  validatePrice,
  validatePackSize,
  validateCalcConfig,
} from "./validation";

describe("estimation/validation", () => {
  it("createValidationResult with no args is valid", () => {
    const r = createValidationResult();
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("createValidationResult with errors is invalid", () => {
    const r = createValidationResult(false, ["error"], []);
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(["error"]);
  });

  it("formatConfigWarning formats correctly", () => {
    const msg = formatConfigWarning("coverage_rate", "paint_calc");
    expect(msg).toContain("coverage_rate");
    expect(msg).toContain("paint_calc");
  });

  it("validateDimensions accepts positive numbers", () => {
    const r = validateDimensions({ length: 5, width: 4 });
    expect(r.valid).toBe(true);
  });

  it("validateDimensions rejects null", () => {
    const r = validateDimensions(null);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("validateDimensions rejects negative values", () => {
    const r = validateDimensions({ length: -5 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("negative");
  });

  it("validateDimensions rejects zero", () => {
    const r = validateDimensions({ length: 0 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("zero");
  });

  it("validateDimensions rejects NaN", () => {
    const r = validateDimensions({ length: NaN });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("NaN");
  });

  it("validateDimensions accepts single number", () => {
    const r = validateDimensions(5);
    expect(r.valid).toBe(true);
  });

  it("validateDimensions rejects non-number, non-object", () => {
    const r = validateDimensions("hello");
    expect(r.valid).toBe(false);
  });

  it("validateQuantity accepts positive number", () => {
    expect(validateQuantity(5).valid).toBe(true);
  });

  it("validateQuantity rejects zero by default", () => {
    expect(validateQuantity(0).valid).toBe(false);
  });

  it("validateQuantity allows zero when specified", () => {
    expect(validateQuantity(0, "Qty", true).valid).toBe(true);
  });

  it("validateQuantity rejects null", () => {
    expect(validateQuantity(null).valid).toBe(false);
  });

  it("validateQuantity rejects NaN", () => {
    expect(validateQuantity(NaN).valid).toBe(false);
  });

  it("validateUnit accepts valid unit", () => {
    expect(validateUnit("meters", ["meters", "feet"]).valid).toBe(true);
  });

  it("validateUnit rejects missing unit", () => {
    expect(validateUnit(null).valid).toBe(false);
  });

  it("validateUnit rejects unit not in allowed list", () => {
    const r = validateUnit("inches", ["meters", "feet"]);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("inches");
  });

  it("validateProduct accepts valid product", () => {
    expect(validateProduct({ id: "1", name: "Paint" }).valid).toBe(true);
  });

  it("validateProduct rejects missing id", () => {
    expect(validateProduct({ name: "Paint" }).valid).toBe(false);
  });

  it("validateProduct rejects inactive product", () => {
    expect(
      validateProduct({ id: "1", name: "Paint", is_active: false }).valid,
    ).toBe(false);
  });

  it("validatePrice accepts non-negative price", () => {
    expect(validatePrice(100).valid).toBe(true);
    expect(validatePrice(0).valid).toBe(true);
  });

  it("validatePrice rejects null", () => {
    expect(validatePrice(null).valid).toBe(false);
  });

  it("validatePrice rejects negative", () => {
    expect(validatePrice(-5).valid).toBe(false);
  });

  it("validatePackSize accepts positive", () => {
    expect(validatePackSize(4).valid).toBe(true);
  });

  it("validatePackSize rejects zero", () => {
    expect(validatePackSize(0).valid).toBe(false);
  });

  it("validatePackSize rejects null", () => {
    expect(validatePackSize(null).valid).toBe(false);
  });

  it("validateCalcConfig accepts valid rules", () => {
    expect(validateCalcConfig({ a: 1 }, "paint").valid).toBe(true);
  });

  it("validateCalcConfig rejects null rules", () => {
    expect(validateCalcConfig(null, "paint").valid).toBe(false);
  });

  it("validateCalcConfig checks required rules", () => {
    const r = validateCalcConfig({ a: 1 }, "paint", ["a", "b"]);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("b");
  });

  it("validateCalcConfig warns about missing required rules", () => {
    const r = validateCalcConfig({ a: null }, "paint");
    expect(r.valid).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
