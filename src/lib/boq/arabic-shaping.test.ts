import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as fontkitNs from "fontkit";
import {
  glyphPath,
  isRtl,
  needsShaping,
  placeRun,
  shapeText,
  unitsToPoints,
} from "./arabic-shaping";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fontkit: any = (fontkitNs as any).default ?? fontkitNs;

const FONT = resolve(
  process.cwd(),
  "public/fonts/pdf/NotoNaskhArabic-Regular.ttf",
);
const naskh = fontkit.create(readFileSync(FONT));

/**
 * The golden case that decided the shaper: shadda and fatha stacked on the same
 * base letter. If mark attachment regresses, the two marks collapse onto one
 * another and these numbers move.
 */
const STACKED = "\u0634\u064E\u0651"; // sheen + fatha + shadda

describe("Arabic shaping (golden case: shadda over fatha)", () => {
  it("shapes to four glyphs, not one per codepoint", () => {
    const run = shapeText(STACKED, naskh);
    // Three codepoints in; the base letter is shaped into its medial form and
    // the two marks become positioned glyphs, plus the trailing advance.
    expect(run.glyphs).toHaveLength(4);
    expect(run.rtl).toBe(true);
  });

  it("pins the glyph ids and offsets the font actually produces", () => {
    const run = shapeText(STACKED, naskh);
    const simplified = run.glyphs.map((glyph) => [
      glyph.gid,
      Math.round(glyph.xOffset),
      Math.round(glyph.yOffset),
      Math.round(glyph.advance),
    ]);
    expect(simplified).toEqual([
      [379, 614, -85, 0],
      [373, 616, -207, 0],
      [298, 591, -436, 0],
      [32, 0, 0, 1013],
    ]);
  });

  it("keeps the two marks apart instead of stacking them at one offset", () => {
    const run = shapeText(STACKED, naskh);
    const markOffsets = run.glyphs
      .filter((glyph) => glyph.advance === 0 && glyph.yOffset !== 0)
      .map((glyph) => glyph.yOffset);
    expect(markOffsets.length).toBeGreaterThanOrEqual(2);
    const separation = Math.abs(markOffsets[0] - markOffsets[1]);
    // 122 font units at 1000 upem: about 0.12 em, which is the shadda sitting
    // clear of the fatha rather than on top of it.
    expect(separation).toBe(122);
    expect(unitsToPoints(separation, 10, run.unitsPerEm)).toBeCloseTo(1.22, 2);
  });

  it("gives each glyph a drawable outline", () => {
    const run = shapeText(STACKED, naskh);
    for (const glyph of run.glyphs) {
      const path = glyphPath(naskh, glyph.gid);
      expect(typeof path).toBe("string");
      expect(path.length).toBeGreaterThan(0);
    }
  });

  it("places a right-to-left run from the right edge leftwards", () => {
    const run = shapeText(STACKED, naskh);
    const placed = placeRun(run, { x: 200, y: 100 }, 10);
    // The run occupies its advance, so the rightmost glyph starts at the
    // origin minus the run width plus its own advance.
    const scale = 10 / run.unitsPerEm;
    const width = run.advance * scale;
    // Pen position plus the glyph's own mark offset.
    expect(placed[0].x).toBeCloseTo(
      200 - width + run.glyphs[0].advance * scale + run.glyphs[0].xOffset * scale,
      6,
    );
    // Every placement stays inside the run's box.
    for (const glyph of placed) {
      expect(glyph.x).toBeGreaterThanOrEqual(200 - width - 1);
      expect(glyph.x).toBeLessThanOrEqual(200 + 1);
    }
  });
});

describe("script detection", () => {
  it("routes Arabic, Hebrew, Indic, Thai and CJK to the shaper", () => {
    for (const text of ["فاتورة", "חשבון", "नमस्ते", "ใบเสนอราคา", "見積書"]) {
      expect(needsShaping(text)).toBe(true);
    }
  });

  it("leaves Latin and figures on the fast path", () => {
    for (const text of ["Bill of Quantities", "BOQ-2026", "12,345.67"]) {
      expect(needsShaping(text)).toBe(false);
      expect(isRtl(text)).toBe(false);
    }
  });

  it("knows which scripts run right to left", () => {
    expect(isRtl("فاتورة")).toBe(true);
    expect(isRtl("חשבון")).toBe(true);
    expect(isRtl("見積書")).toBe(false);
  });
});
