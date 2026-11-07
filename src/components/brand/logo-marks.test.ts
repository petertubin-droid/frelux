import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

/**
 * The header mark ships as two files: the light-surface version and the
 * knock-out for dark surfaces. Both are placed directly on the page, so any
 * background baked into the artwork shows as a box around the monogram, which
 * is exactly the defect this suite exists to prevent.
 */
const MARKS = [
  "public/brand/frelux-mark.svg",
  "public/brand/frelux-mark-light.svg",
];

const read = (path: string) => readFileSync(path, "utf8");

describe("brand mark transparency", () => {
  it("paints no background of its own", () => {
    for (const path of MARKS) {
      const svg = read(path);
      // A full-canvas rect is a tile: it fills the box and reads as a box.
      expect(svg, path).not.toMatch(/<rect[^>]*width="512"/);
      expect(svg, path).not.toMatch(/fill="url\(#tile\)"/);
      expect(svg, path).not.toMatch(/background/i);
      // Nothing may be drawn behind the monogram except its own shapes.
      expect(svg.match(/<rect/g)?.length ?? 0, path).toBe(1);
    }
  });

  it("is cropped to the artwork rather than centred in a square canvas", () => {
    for (const path of MARKS) {
      const svg = read(path);
      expect(svg, path).not.toContain('viewBox="0 0 512 512"');
      expect(svg, path).toMatch(/viewBox="132\.88 77\.8 246\.24 356\.4"/);
    }
  });

  it("keeps the monogram legible on the surface it targets", () => {
    // Light surfaces: the gradient carries the brand colour.
    const light = read("public/brand/frelux-mark.svg");
    expect(light).toContain('fill="url(#monogram)"');
    expect(light).toContain('stop-color="#6D28D9"');

    // Dark surfaces: the monogram reverses to white.
    const dark = read("public/brand/frelux-mark-light.svg");
    expect(dark).toContain('fill="#FFFFFF"');
    expect(dark).not.toContain("url(#monogram)");
  });

  it("keeps the accent rule in both versions", () => {
    for (const path of MARKS) {
      expect(read(path), path).toContain('fill="#F97316"');
    }
  });
});
