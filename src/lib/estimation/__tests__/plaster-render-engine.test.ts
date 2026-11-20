/**
 * German plaster / facade render engine: layered systems, published rates,
 * regional packaging, substrate rules and the IFC covering hook.
 */

import { describe, expect, it } from "vitest";
import {
  calculatePlasterRender,
  GYPSUM_KG_PER_M2_PER_10MM,
  MESH_ROLL_M2,
  packagingForRegion,
  plasterAreasFromModel,
  regionForMarket,
  substrateProfile,
  systemNaming,
  TOPCOAT_KG_PER_M2,
  TYROLEAN_KG_PER_M2_PER_MM,
} from "../plaster-render-engine";

describe("regionForMarket", () => {
  it("maps markets to the region whose products they buy", () => {
    expect(regionForMarket("DE")).toBe("dach_eu");
    expect(regionForMarket("GB")).toBe("uk");
    expect(regionForMarket("US")).toBe("north_america");
    expect(regionForMarket("CA")).toBe("north_america");
    expect(regionForMarket("NG")).toBe("africa");
    expect(regionForMarket("GH")).toBe("africa");
    expect(regionForMarket("BR")).toBe("other");
  });

  it("is case-insensitive and tolerates blanks", () => {
    expect(regionForMarket("de")).toBe("dach_eu");
    expect(regionForMarket("")).toBe("other");
  });
});

describe("packagingForRegion", () => {
  it("sells 50 lb bags and 65 lb pails in North America", () => {
    const na = packagingForRegion("north_america");
    expect(na.bagKg).toBe(22.7);
    expect(na.pailKg).toBe(29.5);
    expect(na.beadLengthM).toBe(3.05);
    expect(na.unitSystem).toBe("imperial");
  });

  it("sells 25 kg bags and 2.5 m beads in EU/UK/Africa", () => {
    for (const region of ["dach_eu", "uk", "africa"] as const) {
      const p = packagingForRegion(region);
      expect(p.bagKg).toBe(25);
      expect(p.beadLengthM).toBe(2.5);
      expect(p.unitSystem).toBe("metric");
    }
  });
});

describe("systemNaming", () => {
  it("uses German names in DACH and ASTM names in North America", () => {
    expect(systemNaming("gypsum_interior", "dach_eu").label).toContain(
      "Gipsputz",
    );
    expect(systemNaming("gypsum_interior", "dach_eu").standard).toContain(
      "13279",
    );
    expect(systemNaming("gypsum_interior", "north_america").standard).toContain(
      "C587",
    );
    expect(systemNaming("exterior_render", "north_america").standard).toContain(
      "C926",
    );
    expect(systemNaming("exterior_render", "dach_eu").label).toContain(
      "Außenputz",
    );
    expect(systemNaming("textured_tyrolene", "africa").label).toContain(
      "Tyrolene",
    );
  });
});

describe("interior gypsum plaster", () => {
  it("computes mass from area, thickness and the published rate", () => {
    const result = calculatePlasterRender({
      system: "gypsum_interior",
      marketCode: "DE",
      areaM2: 100,
      thicknessMm: 10,
      wastePercent: 10,
    });
    const plaster = result.layers.find((l) => l.key === "gypsum_plaster");
    const expected = 100 * GYPSUM_KG_PER_M2_PER_10MM * 1.1;
    expect(plaster?.quantity).toBeCloseTo(expected, 1);
    expect(plaster?.packs?.[0].count).toBe(Math.ceil(expected / 25));
  });

  it("scales linearly with thickness", () => {
    const at10 = calculatePlasterRender({
      system: "gypsum_interior",
      marketCode: "GB",
      areaM2: 50,
      thicknessMm: 10,
    }).layers.find((l) => l.key === "gypsum_plaster")!.quantity;
    const at15 = calculatePlasterRender({
      system: "gypsum_interior",
      marketCode: "GB",
      areaM2: 50,
      thicknessMm: 15,
    }).layers.find((l) => l.key === "gypsum_plaster")!.quantity;
    expect(at15 / at10).toBeCloseTo(1.5, 5);
  });

  it("flags a wet zone instead of quietly pricing standard gypsum", () => {
    const result = calculatePlasterRender({
      system: "gypsum_interior",
      marketCode: "DE",
      areaM2: 20,
      wetZone: true,
    });
    expect(result.warnings.join(" ")).toMatch(/wet/i);
  });

  it("warns when thickness leaves the single-coat range", () => {
    const result = calculatePlasterRender({
      system: "gypsum_interior",
      marketCode: "DE",
      areaM2: 20,
      thicknessMm: 25,
    });
    expect(result.warnings.join(" ")).toMatch(/single-coat range/);
  });

  it("uses 50 lb bags in the US and shows sq ft", () => {
    const result = calculatePlasterRender({
      system: "gypsum_interior",
      marketCode: "US",
      areaM2: 100,
    });
    const plaster = result.layers.find((l) => l.key === "gypsum_plaster");
    expect(plaster?.packs?.[0].label).toContain("22.7");
    expect(result.netAreaDisplay.unit).toBe("sq ft");
    expect(result.netAreaDisplay.value).toBeCloseTo(1076.39, 1);
  });
});

describe("exterior render by grain", () => {
  it("scales topcoat by grain, not thickness", () => {
    const at15 = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "DE",
      areaM2: 100,
      grainMm: 1.5,
    }).layers.find((l) => l.key === "topcoat")!.quantity;
    const at3 = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "DE",
      areaM2: 100,
      grainMm: 3,
    }).layers.find((l) => l.key === "topcoat")!.quantity;
    expect(at15).toBeCloseTo(100 * TOPCOAT_KG_PER_M2[1.5] * 1.1, 1);
    expect(at3).toBeCloseTo(100 * TOPCOAT_KG_PER_M2[3] * 1.1, 1);
    expect(at3).toBeGreaterThan(at15);
  });

  it("adds 10% mesh for the mandatory 100 mm overlaps", () => {
    const result = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "GB",
      areaM2: 200,
    });
    const mesh = result.accessories.find((a) => a.key === "mesh");
    expect(mesh?.quantity).toBeCloseTo(220, 1);
    expect(mesh?.packs?.[0].count).toBe(Math.ceil(220 / MESH_ROLL_M2));
  });

  it("requires a primer on AAC and keeps it optional on clay brick", () => {
    const aac = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "DE",
      areaM2: 100,
      substrate: "aac",
    });
    expect(aac.substrate.primerRequired).toBe(true);
    expect(aac.substrate.primerMultiplier).toBe(1.5);
    expect(aac.layers.find((l) => l.key === "primer")?.optional).toBe(false);

    const brick = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "DE",
      areaM2: 100,
      substrate: "clay_brick",
    });
    expect(brick.substrate.primerRequired).toBe(false);
    expect(brick.layers.find((l) => l.key === "primer")?.optional).toBe(true);
  });

  it("sizes beads from corners plus reveal perimeters", () => {
    const result = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "NG",
      areaM2: 100,
      externalCornerLengthM: 12,
      openingPerimeterM: 8,
    });
    const beads = result.accessories.find((a) => a.key === "beads");
    expect(beads?.quantity).toBe(20);
    expect(beads?.packs?.[0].count).toBe(8); // 20 m / 2.5 m
  });
});

describe("Tyrolean textured render", () => {
  it("sizes the backing render through the existing plastering engine", () => {
    const result = calculatePlasterRender({
      system: "textured_tyrolene",
      marketCode: "NG",
      areaM2: 100,
      thicknessMm: 15,
      texturedCoatMm: 4,
    });
    const backing = result.layers.find((l) => l.key === "backing_render");
    expect(backing?.quantity).toBeGreaterThan(0);
    expect(backing?.basis).toMatch(/plastering engine/i);
    const sand = result.accessories.find((a) => a.key === "sand");
    expect(sand?.unit).toBe("m3");
    expect(sand?.quantity).toBeGreaterThan(0);
  });

  it("scales the textured coat at 1 kg/m² per mm", () => {
    const result = calculatePlasterRender({
      system: "textured_tyrolene",
      marketCode: "NG",
      areaM2: 100,
      texturedCoatMm: 4,
      wastePercent: 10,
    });
    const coat = result.layers.find((l) => l.key === "tyrolene");
    expect(coat?.quantity).toBeCloseTo(
      100 * TYROLEAN_KG_PER_M2_PER_MM * 4 * 1.1,
      1,
    );
  });

  it("warns when the textured coat is outside the usual range", () => {
    const result = calculatePlasterRender({
      system: "textured_tyrolene",
      marketCode: "NG",
      areaM2: 50,
      texturedCoatMm: 9,
    });
    expect(result.warnings.join(" ")).toMatch(/textured coat 9 mm/i);
  });
});

describe("area handling", () => {
  it("builds area from length x height x walls minus openings", () => {
    const result = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "GB",
      lengthM: 10,
      heightM: 3,
      wallCount: 2,
      openingAreaM2: 12,
    });
    expect(result.grossAreaM2).toBe(60);
    expect(result.openingsDeductedM2).toBe(12);
    expect(result.netAreaM2).toBe(48);
  });

  it("warns instead of inventing an area", () => {
    const result = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "GB",
    });
    expect(result.netAreaM2).toBe(0);
    expect(result.warnings.join(" ")).toMatch(/No wall area/i);
  });
});

describe("substrateProfile", () => {
  it("states why each substrate needs (or does not need) a primer", () => {
    expect(substrateProfile("aac").note).toMatch(/suction/i);
    expect(substrateProfile("concrete").note).toMatch(/bonding/i);
    expect(substrateProfile("eps_insulation").note).toMatch(/ETICS/);
  });
});

describe("plasterAreasFromModel", () => {
  const covering = (
    name: string,
    area: number | null,
    predefinedType?: string,
  ) =>
    ({
      expressID: 1,
      globalId: name,
      ifcClass: "IFCCOVERING",
      name,
      quantities:
        area === null
          ? []
          : [{ name: "NetArea", kind: "area" as const, value: area }],
      geometry: [],
      ...(predefinedType ? { predefinedType } : {}),
    }) as never;

  it("sums declared covering areas and counts openings", () => {
    const result = plasterAreasFromModel([
      covering("Render-Ext", 120.5, "CLADDING"),
      covering("Plaster-Int", 80.25, "PLASTERING"),
      covering("No-Area", null),
      {
        expressID: 2,
        globalId: "D1",
        ifcClass: "IFCDOOR",
        name: "D1",
        quantities: [],
        geometry: [],
      } as never,
    ]);
    expect(result.coveringAreaM2).toBe(200.75);
    expect(result.coveringsCounted).toBe(2);
    expect(result.coveringsWithoutArea).toBe(1);
    expect(result.openingCount).toBe(1);
    expect(result.notes.join(" ")).toMatch(/deduct the openings/i);
  });

  it("says so when the model carries no coverings", () => {
    const result = plasterAreasFromModel([]);
    expect(result.coveringAreaM2).toBe(0);
    expect(result.notes.join(" ")).toMatch(/No IfcCovering/i);
  });
});
