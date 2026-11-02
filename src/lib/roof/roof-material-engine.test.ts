import { describe, it, expect } from "vitest";
import {
  createRoofMaterialSpec,
  calculateRoofMaterialsFromArea,
} from "./roof-material-engine";

describe("roof/roof-material-engine", () => {
  it("createRoofMaterialSpec creates with required fields", () => {
    const spec = createRoofMaterialSpec({
      productName: "Long Span Aluminium",
      roofingMaterial: "long_span_aluminium",
      coverageM2: 3,
      quantityUnit: "sheets",
    });
    expect(spec.materialSpec.productName).toBe("Long Span Aluminium");
    expect(spec.roofingMaterial).toBe("long_span_aluminium");
    expect(spec.materialSpec.quantityUnit).toBe("sheets");
  });

  it("createRoofMaterialSpec respects optional waste", () => {
    const spec = createRoofMaterialSpec({
      productName: "Test",
      roofingMaterial: "long_span_aluminium",
      coverageM2: 3,
      quantityUnit: "sheets",
      wastePercent: 10,
    });
    expect(spec.materialSpec.defaultWastePercent).toBe(10);
  });

  it("calculateRoofMaterialsFromArea returns null for no material", () => {
    const { result, explanation } = calculateRoofMaterialsFromArea(100, null);
    expect(result).toBeNull();
    expect(explanation.length).toBeGreaterThan(0);
  });

  it("calculateRoofMaterialsFromArea calculates purchase quantity", () => {
    const spec = createRoofMaterialSpec({
      productName: "Test",
      roofingMaterial: "long_span_aluminium",
      coverageM2: 3,
      quantityUnit: "sheets",
      wastePercent: 5,
    });
    const { result, explanation } = calculateRoofMaterialsFromArea(100, spec);
    expect(result).not.toBeNull();
    expect(result!.purchaseQuantity).toBeGreaterThan(0);
    expect(explanation.length).toBeGreaterThan(0);
  });
});
