import { describe, it, expect } from "vitest";
import {
  dbSettingsToMap,
  getSetting,
  dbProfilesToMaterialSpecs,
  dbProfileToMaterialSpec,
} from "./bridge";
import type {
  EmMaterialProfile,
  EmEngineSetting,
} from "@/types/engine-integration";

function makeProfile(): EmMaterialProfile {
  return {
    id: "1",
    material_key: "paint_emulsion",
    product_name: "Premium Emulsion",
    brand: "Dulux",
    category: "paint",
    coverage_type: "area",
    coverage_value: 10,
    coverage_unit: "m2",
    coverage_coats: 2,
    coverage_basis: "per_coat",
    package_size: 20,
    package_unit: "litres",
    quantity_unit: "bucket",
    default_waste_percent: 10,
    application: "emulsion",
    market_code: "NGN",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    is_active: true,
  } as unknown as never;
}

describe("engine-integration/bridge", () => {
  it("dbSettingsToMap converts settings to map", () => {
    const settings: EmEngineSetting[] = [
      {
        id: "1",
        setting_key: "waste",
        setting_value: 15,
        setting_type: "number",
        category: "general",
        description: null,
        is_editable: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        setting_key: "unit",
        setting_value: "meters",
        setting_type: "string",
        category: "general",
        description: null,
        is_editable: true,
        created_at: "",
        updated_at: "",
      },
    ];
    const map = dbSettingsToMap(settings);
    expect(map.get("waste")).toBe(15);
    expect(map.get("unit")).toBe("meters");
  });

  it("getSetting returns default when key missing", () => {
    const map = dbSettingsToMap([]);
    expect(getSetting(map, "missing", "default")).toBe("default");
  });

  it("getSetting returns value when key present", () => {
    const map = dbSettingsToMap([
      {
        id: "1",
        setting_key: "key",
        setting_value: 42,
        setting_type: "number",
        category: "test",
        description: null,
        is_editable: true,
        created_at: "",
        updated_at: "",
      },
    ]);
    expect(getSetting(map, "key", 0)).toBe(42);
  });

  it("getSetting returns default for null value", () => {
    const map = dbSettingsToMap([
      {
        id: "1",
        setting_key: "key",
        setting_value: null,
        setting_type: "string",
        category: "test",
        description: null,
        is_editable: true,
        created_at: "",
        updated_at: "",
      },
    ]);
    expect(getSetting(map, "key", "fallback")).toBe("fallback");
  });

  it("dbProfileToMaterialSpec converts profile", () => {
    const spec = dbProfileToMaterialSpec(makeProfile());
    expect(spec.productName).toBe("Premium Emulsion");
    expect(spec.brand).toBe("Dulux");
    expect(spec.category).toBe("paint");
  });

  it("dbProfilesToMaterialSpecs converts array", () => {
    const specs = dbProfilesToMaterialSpecs([makeProfile(), makeProfile()]);
    expect(specs.length).toBe(2);
  });
});
