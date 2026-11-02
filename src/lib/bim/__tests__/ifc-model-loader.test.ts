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
