// ============================================================
// .ifczip reader tests — engine-1B BIM milestone. Zips are built
// in-test with fflate's zipSync (the same library the reader
// decompresses with). All refusals are explicit: the takeoff is
// never guessed at.
// ============================================================

import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { readIfcZipFile, DEFAULT_MAX_IFCZIP_BYTES } from "./ifczip";

const IFC_TEXT =
  "ISO-10303-21;\nFILE_SCHEMA(('IFC4'));\nDATA;\n#1=IFCWALL('x',$,'w',$,$,$,$,$);\nENDSEC;\nEND-ISO-10303-21;";

describe("readIfcZipFile", () => {
  it("extracts the single .ifc entry of a valid .ifczip", () => {
    const zipped = zipSync({ "villa.ifc": strToU8(IFC_TEXT) });
    const r = readIfcZipFile(zipped);
    expect(r.ok).toBe(true);
    expect(r.entry_name).toBe("villa.ifc");
    expect(r.file_text).toContain("IFCWALL");
    expect(r.errors).toHaveLength(0);
  });

  it("tolerates unrelated sibling entries but reports them", () => {
    const zipped = zipSync({
      "model.ifc": strToU8(IFC_TEXT),
      "readme.txt": strToU8("notes"),
    });
    const r = readIfcZipFile(zipped);
    expect(r.ok).toBe(true);
    expect(r.other_entries).toContain("readme.txt");
  });

  it("refuses an archive with multiple .ifc entries (ambiguous, never guessed)", () => {
    const zipped = zipSync({
      "a.ifc": strToU8(IFC_TEXT),
      "b.ifc": strToU8(IFC_TEXT),
    });
    const r = readIfcZipFile(zipped);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/2 \.ifc entries/i);
  });

  it("refuses an archive with no .ifc entry and names what it found", () => {
    const zipped = zipSync({ "model.ifcxml": strToU8("<ifcxml/>") });
    const r = readIfcZipFile(zipped);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/no \.ifc entry/i);
    expect(r.errors[0]).toContain("model.ifcxml");
  });

  it("refuses corrupted bytes with an honest error", () => {
    const r = readIfcZipFile(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/could not be opened/i);
  });

  it("enforces the decompressed-size cap (zip-bomb protection)", () => {
    const big = "x".repeat(DEFAULT_MAX_IFCZIP_BYTES + 1024);
    const zipped = zipSync({ "big.ifc": strToU8(big) });
    const r = readIfcZipFile(zipped);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/safety cap/i);
  });
});
