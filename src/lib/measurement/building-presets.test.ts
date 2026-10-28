import { describe, it, expect } from "vitest";
import {
  seedProjectWithPreset,
  getBuildingPresets,
  findBuildingPreset,
  presetToRoomDrafts,
  presetWallHeight,
  displayDimension,
  defaultPresetUnit,
  HOUSING_PROFILE_BY_MARKET,
  PRESET_MARKET_CODES,
  type BuildingPreset,
} from "./building-presets";
import { APPROVED_MARKET_CODES } from "@/lib/international/countries";
import { SPACE_TYPE_LABELS } from "./types";

const ALL_32_MARKETS = [
  "NG", "GH", "CI", "KE", "TZ", "ET", "EG", "ZA", "AE", "SA",
  "US", "CA", "GB", "AU", "NZ", "IN", "CN", "JP", "KR", "SG",
  "DE", "FR", "ES", "IT", "NL", "PL", "SE", "CH", "TR", "BR",
  "MX", "ID",
];

describe("building presets — market coverage", () => {
  it("covers every approved FRELUX market (all 32)", () => {
    expect(PRESET_MARKET_CODES.length).toBe(32);
    for (const code of ALL_32_MARKETS) {
      expect(HOUSING_PROFILE_BY_MARKET[code], `missing profile for ${code}`).toBeDefined();
    }
    // Approved platform markets that this module is not the source of truth
    // for (if any) must not silently pass through unhandled.
    for (const code of APPROVED_MARKET_CODES) {
      expect(HOUSING_PROFILE_BY_MARKET[code], `approved market ${code} has no housing profile`).toBeDefined();
    }
  });

  it("returns a non-empty preset list for every market", () => {
    for (const code of ALL_32_MARKETS) {
      const presets = getBuildingPresets(code);
      expect(presets.length).toBeGreaterThanOrEqual(3);
      for (const p of presets) {
        expect(p.id).toBeTruthy();
        expect(p.label).toBeTruthy();
        expect(p.bedrooms).toBeGreaterThanOrEqual(1);
        expect(p.rooms.length).toBeGreaterThan(0);
        expect(p.wallHeightM).toBeGreaterThan(2);
      }
    }
  });


  it("offers at least 5 house types in every market (owner directive)", () => {
    for (const code of ALL_32_MARKETS) {
      const presets = getBuildingPresets(code);
      expect(presets.length, `${code} has only ${presets.length} presets`).toBeGreaterThanOrEqual(5);
    }
  });

  it("has unique preset ids within each market", () => {
    for (const code of ALL_32_MARKETS) {
      const ids = getBuildingPresets(code).map((p) => p.id);
      expect(new Set(ids).size, `${code} has duplicate preset ids`).toBe(ids.length);
    }
  });

  it("falls back to the West Africa profile for unknown markets", () => {
    const presets = getBuildingPresets("XX");
    const ng = getBuildingPresets("NG");
    expect(presets).toBe(ng);
    expect(getBuildingPresets(undefined)).toBe(ng);
  });

  it("is case-insensitive on the market code", () => {
    expect(getBuildingPresets("us")[0].id).toBe(getBuildingPresets("US")[0].id);
  });
});

describe("building presets — per-market house types", () => {
  it("gives Nigeria bungalows and duplexes", () => {
    const labels = getBuildingPresets("NG").map((p) => p.label);
    expect(labels).toContain("2 Bedroom Bungalow");
    expect(labels).toContain("3 Bedroom Bungalow");
    expect(labels).toContain("4 Bedroom Duplex");
    expect(labels).toContain("5 Bedroom Duplex");
  });

  it("gives the US North American house stock", () => {
    const labels = getBuildingPresets("US").map((p) => p.label);
    expect(labels.some((l) => /Ranch/.test(l))).toBe(true);
    expect(labels.some((l) => /Two-Storey|Townhouse|Condo/.test(l))).toBe(true);
  });

  it("gives the UK its most common types (semi-detached, terraced, flat)", () => {
    const labels = getBuildingPresets("GB").map((p) => p.label);
    expect(labels.some((l) => /Semi-Detached/.test(l))).toBe(true);
    expect(labels.some((l) => /Terraced/.test(l))).toBe(true);
    expect(labels.some((l) => /Flat/.test(l))).toBe(true);
  });

  it("gives India BHK flats", () => {
    const labels = getBuildingPresets("IN").map((p) => p.label);
    expect(labels.some((l) => /1 BHK/.test(l))).toBe(true);
    expect(labels.some((l) => /3 BHK/.test(l))).toBe(true);
  });

  it("gives China compact apartments", () => {
    const labels = getBuildingPresets("CN").map((p) => p.label);
    expect(labels.some((l) => /3 Bedroom Apartment/.test(l))).toBe(true);
  });

  it("AU, CA, UK, CN all receive their own profile treatment", () => {
    const au = getBuildingPresets("AU");
    const ca = getBuildingPresets("CA");
    const gb = getBuildingPresets("GB");
    const cn = getBuildingPresets("CN");
    expect(au[0].id.startsWith("oce")).toBe(true);
    expect(ca[0].id.startsWith("na")).toBe(true);
    expect(gb[0].id.startsWith("uk")).toBe(true);
    expect(cn[0].id.startsWith("ea2")).toBe(true);
  });
});

describe("building presets — room sets", () => {
  const findMaster = (p: BuildingPreset) =>
    p.rooms.find((r) => r.spaceType === "bedroom");

  it("3BR bungalow (NG) has 3 bedrooms via quantity grouping", () => {
    const preset = getBuildingPresets("NG").find((p) => p.bedrooms === 3)!;
    const bedrooms = preset.rooms.filter((r) => r.spaceType === "bedroom");
    const total = bedrooms.reduce((s, r) => s + r.quantity, 0);
    expect(total).toBe(3);
    expect(findMaster(preset)).toBeDefined();
  });

  it("every preset room has positive dimensions and quantity", () => {
    for (const code of ALL_32_MARKETS) {
      for (const p of getBuildingPresets(code)) {
        for (const r of p.rooms) {
          expect(r.lengthM).toBeGreaterThan(0);
          expect(r.widthM).toBeGreaterThan(0);
          expect(r.quantity).toBeGreaterThanOrEqual(1);
          expect(SPACE_TYPE_LABELS[r.spaceType]).toBeDefined();
        }
      }
    }
  });

  it("presets include the rooms users expect (bedroom, living, kitchen, bath)", () => {
    const preset = getBuildingPresets("NG").find((p) => p.bedrooms === 3)!;
    const types = new Set(preset.rooms.map((r) => r.spaceType));
    expect(types.has("bedroom")).toBe(true);
    expect(types.has("kitchen")).toBe(true);
    expect(types.has("toilet")).toBe(true);
    // A lobby/entrance or corridor exists in the bungalow sets.
    expect(types.has("corridor")).toBe(true);
    expect(types.has("parlour")).toBe(true);
  });
});

describe("building presets — unit conversion", () => {
  it("converts canonical metres to feet with 1-dp rounding", () => {
    expect(displayDimension(3.7, "feet")).toBe(12.1); // 3.7 m ≈ 12.14 ft
    expect(displayDimension(3.0, "feet")).toBe(9.8);
  });

  it("keeps metres at 2-dp", () => {
    expect(displayDimension(3.7, "meters")).toBe(3.7);
    expect(displayDimension(4.567, "meters")).toBe(4.57);
  });

  it("seeds drafts in feet for the NG 3BR bungalow", () => {
    const preset = getBuildingPresets("NG").find((p) => p.bedrooms === 3)!;
    const drafts = presetToRoomDrafts(preset, "feet");
    expect(drafts.length).toBe(preset.rooms.length);
    const master = drafts.find((d) => d.label === "Master Bedroom")!;
    expect(master.length).toBeGreaterThan(10); // ~13.8 ft
    expect(master.length).toBeLessThan(15);
    expect(master.quantity).toBe(1);
    expect(drafts.find((d) => d.label === "Bedroom")!.quantity).toBe(2);
  });

  it("seeds drafts in metres for CN", () => {
    const preset = getBuildingPresets("CN").find((p) => p.bedrooms === 3)!;
    const drafts = presetToRoomDrafts(preset, "meters");
    const master = drafts[0];
    expect(master.length).toBeLessThan(5);
    expect(master.length).toBeGreaterThanOrEqual(3);
  });

  it("draft ids are stable and unique within a preset", () => {
    const preset = getBuildingPresets("GB")[1];
    const drafts = presetToRoomDrafts(preset, "meters");
    const ids = new Set(drafts.map((d) => d.id));
    expect(ids.size).toBe(drafts.length);
    drafts.forEach((d) => expect(d.id.startsWith(preset.id)).toBe(true));
  });

  it("converts wall height per unit", () => {
    const preset = findBuildingPreset("US", "na3br-ranch")!;
    expect(presetWallHeight(preset, "feet")).toBe(8.0); // 2.44 m ≈ 8 ft
    expect(presetWallHeight(preset, "meters")).toBe(2.44);
  });

  it("picks feet for imperial/NG/IN markets and metres elsewhere", () => {
    expect(defaultPresetUnit("NG")).toBe("feet");
    expect(defaultPresetUnit("US")).toBe("feet");
    expect(defaultPresetUnit("GB")).toBe("meters"); // UK rooms are quoted in metres
    expect(defaultPresetUnit("IN")).toBe("feet");
    expect(defaultPresetUnit("DE")).toBe("meters");
    expect(defaultPresetUnit("CN")).toBe("meters");
    expect(defaultPresetUnit("AU")).toBe("meters");
    expect(defaultPresetUnit(null)).toBe("feet"); // reference market fallback
  });
});

describe("seedProjectWithPreset", () => {
  const project = {
    id: "p1",
    calculatorContext: "screeding",
    projectMode: "house_building",
    preferredUnit: "meters",
    sections: [{ id: "s1", label: "Building Spaces", groups: [] }],
  } as import("./types").MeasurementProject;

  it("seeds the NG 3BR bungalow rooms as editable groups", () => {
    const seeded = seedProjectWithPreset(project, "NG", "wa-3br-bungalow");
    expect(seeded.sections).toHaveLength(1);
    const groups = seeded.sections[0].groups;
    expect(groups.length).toBe(8); // 3 bedroom rows + parlour + dining + kitchen + 2 T&B + lobby + store... (preset room rows)
    const master = groups.find((g) => g.label === "Master Bedroom")!;
    expect(master.entry.quantity).toBe(1);
    // NG presets seed in feet
    expect(master.entry.unit).toBe("feet");
    expect(master.entry.length).toBeGreaterThan(10);
    const bedroom = groups.find((g) => g.label === "Bedroom")!;
    expect(bedroom.entry.quantity).toBe(2);
    expect(bedroom.entry.doors).toBe(1);
  });

  it("seeds the GB semi-detached in metres", () => {
    const seeded = seedProjectWithPreset(project, "GB", "uk-3br-semi");
    const main = seeded.sections[0].groups.find((g) => g.label === "Main Bedroom")!;
    expect(main.entry.unit).toBe("meters");
    expect(main.entry.length).toBeCloseTo(3.5, 1);
  });

  it("forces house_building mode and replaces stale sections", () => {
    const fenceProject = {
      ...project,
      projectMode: "fence",
      sections: [{ id: "s1", label: "Fence Dimensions", groups: [] }],
    } as import("./types").MeasurementProject;
    const seeded = seedProjectWithPreset(fenceProject, "US", "na3br-ranch");
    expect(seeded.projectMode).toBe("house_building");
    expect(seeded.sections[0].label).toBe("Building Spaces");
    expect(seeded.sections[0].groups.length).toBeGreaterThan(0);
  });

  it("returns the project untouched for an unknown preset", () => {
    expect(seedProjectWithPreset(project, "NG", "nope")).toBe(project);
  });
});
