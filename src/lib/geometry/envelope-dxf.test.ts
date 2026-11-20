import { describe, it, expect } from "vitest";
import { buildEnvelopeDxf, envelopeDxfFileName } from "./envelope-dxf";

describe("buildEnvelopeDxf", () => {
  it("writes a millimetre DXF with a closed footprint polyline", () => {
    const dxf = buildEnvelopeDxf({ widthMm: 10000, depthMm: 8000 });
    expect(dxf.startsWith("0\nSECTION")).toBe(true);
    expect(dxf.trimEnd().endsWith("EOF")).toBe(true);
    expect(dxf).toContain("$INSUNITS");
    expect(dxf).toContain("ENTITIES");
    // Two closed polylines: outer footprint and inner face.
    expect(dxf.match(/LWPOLYLINE/g)?.length).toBe(2);
    expect(dxf).toContain("FRELUX-FOOTPRINT");
    expect(dxf).toContain("FRELUX-INNER-FACE");
    expect(dxf).toContain("10000");
    expect(dxf).toContain("8000");
  });

  it("offsets the inner face by the wall thickness", () => {
    const dxf = buildEnvelopeDxf({
      widthMm: 10000,
      depthMm: 8000,
      wallThicknessMm: 230,
    });
    expect(dxf).toContain("230");
    expect(dxf).toContain("9770");
    expect(dxf).toContain("7770");
  });

  it("places each opening on the wall it was measured on", () => {
    const dxf = buildEnvelopeDxf({
      widthMm: 10000,
      depthMm: 8000,
      openings: [
        {
          view: "front",
          kind: "door",
          widthMm: 900,
          heightMm: 2100,
          offsetMm: 1000,
        },
        {
          view: "right",
          kind: "window",
          widthMm: 1200,
          heightMm: 1200,
          offsetMm: 2000,
        },
      ],
    });
    expect(dxf).toContain("FRELUX-OPENINGS");
    expect(dxf).toContain("DOOR 900x2100");
    expect(dxf).toContain("WINDOW 1200x1200");
    // A door on the front wall sits at y = 0; a window on the right wall at x = 10000.
    expect(dxf).toContain("1000");
    expect(dxf).toContain("10000");
  });

  it("refuses to write a drawing with no footprint", () => {
    expect(() => buildEnvelopeDxf({ widthMm: 0, depthMm: 8000 })).toThrow(
      /width must be a positive length/i,
    );
    expect(() => buildEnvelopeDxf({ widthMm: 10000, depthMm: -1 })).toThrow(
      /depth must be a positive length/i,
    );
  });

  it("names the file after the footprint", () => {
    expect(envelopeDxfFileName(10000, 8000)).toBe(
      "frelux-envelope-10m-x-8m.dxf",
    );
  });
});
