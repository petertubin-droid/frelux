/**
 * Pillar 3 engine tests: web-ifc model loader, exercised against the REAL
 * wasm in node (not mocks): a real IFC4 file with geometry
 * (cube-advanced-brep.ifc) and a crafted IFC4 file with quantities.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseIfcModel } from "../ifc-model-loader";

const FIXTURES = join(__dirname, "fixtures");

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

describe("parseIfcModel (real web-ifc, IFC2x3 and IFC4)", () => {
  it("extracts placed geometry from a real IFC4 file", async () => {
    const result = await parseIfcModel(fixture("cube-advanced-brep.ifc"));
    expect(result.ok).toBe(true);
    expect(result.schema).toBe("IFC4");
    expect(result.elementsWithGeometry).toBeGreaterThan(0);
    const geoElement = result.elements.find((e) => e.geometry.length > 0);
    expect(geoElement).toBeDefined();
    const part = geoElement!.geometry[0];
    // Real triangulation from web-ifc: interleaved x,y,z,u,v,w was split into
    // positions + normals, so counts match and vertices exist.
    expect(part.positions.length).toBe(part.normals.length);
    expect(part.positions.length % 3).toBe(0);
    expect(part.positions.length / 3).toBeGreaterThan(100);
    expect(part.indices.length % 3).toBe(0);
    expect(part.matrix.length).toBe(16);
    expect(part.color.every((c) => c >= 0 && c <= 1)).toBe(true);
  });

  it("extracts IfcQuantityVolume/Area/Length per element via IfcRelDefinesByProperties", async () => {
    const result = await parseIfcModel(fixture("column-quantities.ifc"));
    expect(result.ok).toBe(true);
    expect(result.schema).toBe("IFC4");
    expect(result.elements).toHaveLength(2);
    for (const col of result.elements) {
      expect(col.ifcClass).toBe("IFCCOLUMN");
      expect(col.globalId).toMatch(/^2XAKEYK0zDwQgCf\$QnrOi[ab]$/);
      const vol = col.quantities.find((q) => q.kind === "volume");
      const area = col.quantities.find((q) => q.kind === "area");
      const len = col.quantities.find((q) => q.kind === "length");
      expect(vol).toMatchObject({ name: "NetVolume", value: 2.4 });
      expect(area).toMatchObject({ name: "NetArea", value: 8.2 });
      expect(len).toMatchObject({ name: "NetLength", value: 3.6 });
    }
    expect(result.elementsWithQuantities).toBe(2);
    // The fixture declares no geometry: the loader reports that honestly.
    expect(result.warnings.join(" ")).toContain(
      "No 3D geometry could be generated",
    );
  });

  it("reports empty models honestly instead of inventing elements", async () => {
    const result = await parseIfcModel(
      new TextEncoder().encode(
        "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n",
      ),
    );
    expect(result.ok).toBe(true);
    expect(result.elements).toHaveLength(0);
    expect(result.warnings.join(" ")).toContain(
      "No recognized construction elements",
    );
  });
});

describe("parseIfcModel: spatial, type, material and unit context", () => {
  it("reads storey, type object, material and declared SI units", async () => {
    const result = await parseIfcModel(fixture("element-context.ifc"));
    expect(result.ok).toBe(true);
    expect(result.schema).toBe("IFC4");
    expect(result.elements).toHaveLength(2);
    for (const wall of result.elements) {
      expect(wall.ifcClass).toBe("IFCWALL");
      expect(wall.storey).toBe("Level 1");
      expect(wall.typeName).toBe("WT-200");
      expect(wall.material).toBe("Concrete C30/37");
      const vol = wall.quantities.find((q) => q.kind === "volume");
      expect(vol).toMatchObject({ name: "NetVolume", value: 4.8 });
    }
    expect(result.units).toEqual({
      length: "METRE",
      area: "SQUARE_METRE",
      volume: "CUBIC_METRE",
      undeclared: false,
    });
    expect(result.coverage.countsByClass.IFCWALL).toBe(2);
    expect(result.coverage.unmappedClasses).toEqual([]);
  });

  it("reports undeclared units honestly on a file without IfcUnitAssignment", async () => {
    const result = await parseIfcModel(fixture("column-quantities.ifc"));
    expect(result.units.undeclared).toBe(true);
    expect(
      result.warnings.some((w) => w.includes("no IfcUnitAssignment")),
    ).toBe(true);
  });
});

describe("parseIfcModel property sets (real web-ifc)", () => {
  it("reads declared single-value and enumerated properties per element", async () => {
    const result = await parseIfcModel(fixture("property-sets.ifc"));
    expect(result.ok).toBe(true);
    const wall = result.elements.find((e) => e.name === "Wall-Ext");
    const door = result.elements.find((e) => e.name === "Door-FD60");
    expect(wall?.properties?.map((p) => `${p.pset}.${p.name}`)).toEqual(
      expect.arrayContaining([
        "Pset_WallCommon.FireRating",
        "Pset_WallCommon.IsExternal",
        "Pset_WallCommon.LoadBearing",
        "Pset_WallInsulation.ThermalTransmittance",
      ]),
    );
    expect(wall?.properties?.find((p) => p.name === "FireRating")?.value).toBe(
      "2 HR",
    );
    expect(wall?.properties?.find((p) => p.name === "IsExternal")?.value).toBe(
      true,
    );
    // enumerated value comes through as its declared first value
    expect(
      door?.properties?.find((p) => p.name === "SecurityRating")?.value,
    ).toBe("High");
    expect(result.elementsWithProperties).toBeGreaterThanOrEqual(2);
  });

  it("flattens complex properties into dotted nested names", async () => {
    const result = await parseIfcModel(fixture("property-sets.ifc"));
    const door = result.elements.find((e) => e.name === "Door-FD60");
    expect(door?.properties?.some((p) => p.name === "Layers.Inner")).toBe(true);
    expect(
      door?.properties?.find((p) => p.name === "Layers.Inner")?.value,
    ).toBe("x");
    // nested entries are marked so a consumer can tell them apart
    expect(
      door?.properties?.find((p) => p.name === "Layers.Inner")?.nested,
    ).toBe(true);
  });

  it("keeps bounded and list values structured instead of picking a number", async () => {
    const result = await parseIfcModel(fixture("property-sets.ifc"));
    const door = result.elements.find((e) => e.name === "Door-FD60");
    const bounded = door?.properties?.find((p) => p.name === "UValue")?.value;
    expect(bounded).toEqual({
      kind: "bounded",
      upper: 0.26,
      lower: 0.2,
      setPoint: 0.24,
    });
    const list = door?.properties?.find((p) => p.name === "Finishes")?.value;
    expect(list).toEqual({ kind: "list", values: ["Paint", "Tile"] });
  });

  it("reads nested complex entries under dotted names", async () => {
    const result = await parseIfcModel(fixture("property-sets.ifc"));
    const door = result.elements.find((e) => e.name === "Door-FD60");
    expect(door?.properties?.find((p) => p.name === "Spec.Finish")?.value).toBe(
      "Satin",
    );
  });

  it("counts table values as skipped rather than inventing rows", async () => {
    const result = await parseIfcModel(fixture("property-sets.ifc"));
    expect(result.skippedComplexProperties).toBeGreaterThanOrEqual(1);
    const door = result.elements.find((e) => e.name === "Door-FD60");
    expect(door?.properties?.some((p) => p.name === "ThermalTable")).toBe(
      false,
    );
  });
});

describe("representation-derived quantities (real web-ifc)", () => {
  it("derives volume, area and depth from an extrusion with no declared quantities", async () => {
    const result = await parseIfcModel(fixture("extruded-wall.ifc"));
    expect(result.ok).toBe(true);
    const wall = result.elements.find((e) => e.name === "Wall-NoQty");
    expect(wall).toBeDefined();
    // the file declares nothing
    expect(wall?.quantities).toEqual([]);
    const derived = wall?.derivedQuantities ?? [];
    expect(derived.map((d) => d.kind)).toEqual(["volume", "area", "length"]);
    expect(derived[0].value).toBeCloseTo(1.2, 6); // 2.0 x 0.2 x 3.0
    expect(derived[1].value).toBeCloseTo(0.4, 6);
    expect(derived[2].value).toBeCloseTo(3, 6);
    for (const d of derived) {
      expect(d.method).toBe("extruded-area-solid");
    }
    expect(result.elementsWithDerivedQuantities).toBe(1);
    expect(
      result.warnings.some((w) => w.includes("DERIVED from extrusion")),
    ).toBe(true);
  });
});

describe("mesh-derived quantities (real brep fixture)", () => {
  it("derives surface area from a real brep and refuses volume when the tessellation is not watertight", async () => {
    const result = await parseIfcModel(fixture("cube-advanced-brep.ifc"));
    const element = result.elements.find(
      (e) => (e.derivedQuantities?.length ?? 0) > 0,
    );
    expect(element).toBeDefined();
    const derived = element!.derivedQuantities!;
    const area = derived.find((q) => q.kind === "area");
    expect(area?.method).toBe("mesh-surface");
    expect(area!.value).toBeGreaterThan(0);
    // This fixture's tessellation has 136 boundary edges (faces do not share
    // vertices), so it is NOT watertight and no volume is claimed. The
    // watertight case is covered by the synthetic cube in
    // model-representation.test.ts.
    expect(derived.some((q) => q.kind === "volume")).toBe(false);
    expect(result.elementsWithDerivedQuantities).toBeGreaterThanOrEqual(1);
  });
});

describe("IFC4.3 (IFC4X3_ADD2) schema", () => {
  it("reads the schema string and the same geometry/derivation path", async () => {
    const result = await parseIfcModel(fixture("ifc43-wall.ifc"));
    expect(result.ok).toBe(true);
    expect(result.schema).toBe("IFC4X3_ADD2");
    const wall = result.elements.find((e) => e.name === "Wall-NoQty");
    expect(wall).toBeDefined();
    const volume = wall?.derivedQuantities?.find((q) => q.kind === "volume");
    expect(volume?.value).toBeCloseTo(1.2, 6);
  });
});

describe("IfcCovering takeoff (plaster/render areas)", () => {
  it("takes off coverings and their declared PredefinedType", async () => {
    const result = await parseIfcModel(fixture("covering-areas.ifc"));
    const coverings = result.elements.filter(
      (e) => e.ifcClass === "IFCCOVERING",
    );
    expect(coverings).toHaveLength(3);
    const cladding = coverings.find((c) => c.name === "Render-Ext");
    const plastering = coverings.find((c) => c.name === "Plaster-Int");
    const untyped = coverings.find((c) => c.name === "Ceiling-NoType");
    expect(cladding?.predefinedType).toBe("CLADDING");
    expect(plastering?.predefinedType).toBe("PLASTERING");
    expect(untyped?.predefinedType).toBeUndefined();
    expect(cladding?.quantities.find((q) => q.kind === "area")?.value).toBe(
      120.5,
    );
    expect(plastering?.quantities.find((q) => q.kind === "area")?.value).toBe(
      80.25,
    );
  });
});
