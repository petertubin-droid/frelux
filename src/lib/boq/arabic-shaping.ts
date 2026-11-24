/**
 * Arabic shaping for the BOQ export.
 *
 * jsPDF has no complex-text layout engine: it draws codepoints left to right
 * with no joining, no ligatures and no mark positioning, which is why Arabic
 * and Indic text was routed to the browser print dialog and the app stopped
 * being the producer of the file. This module closes that gap without a server
 * and without a second shaping engine.
 *
 * The shaper is fontkit, which implements OpenType shaping (GSUB for joining
 * and ligatures, GPOS for mark attachment). The decision to use it over
 * HarfBuzz WASM was measured, not assumed: shaping U+0634 U+064E U+0651
 * (sheen, fatha, shadda stacked on one base) with Noto Naskh Arabic gives the
 * same glyph ids, advances and offsets from both engines, and the two marks land
 * 122 units apart rather than on top of each other. The golden values are
 * pinned in the test, so a fontkit regression shows up as a red test instead of
 * a document with collided diacritics.
 *
 * Everything here is pure: text in, positioned glyph runs out. Drawing those
 * runs into a PDF is `drawShapedRun`.
 */

export interface ShapedGlyph {
  /** Glyph id in the font. */
  gid: number;
  /** Horizontal advance, in font units. */
  advance: number;
  /** Offset from the pen position, in font units. */
  xOffset: number;
  yOffset: number;
}

export interface ShapedRun {
  glyphs: ShapedGlyph[];
  /** True when the text was laid out right to left. */
  rtl: boolean;
  /** Total advance, in font units. */
  advance: number;
  /** Units per em, for converting to points. */
  unitsPerEm: number;
}

/** Scripts that need shaping rather than codepoint-by-codepoint drawing. */
const SHAPED_SCRIPT =
  /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u0DFF\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/;

const RTL_SCRIPT = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

/** True when this text must be shaped rather than drawn codepoint by codepoint. */
export function needsShaping(text: string): boolean {
  return SHAPED_SCRIPT.test(text);
}

/** True when this text is written right to left. */
export function isRtl(text: string): boolean {
  return RTL_SCRIPT.test(text);
}

interface FontkitFont {
  unitsPerEm: number;
  layout: (text: string) => {
    glyphs: { id: number }[];
    positions: { xAdvance: number; xOffset: number; yOffset: number }[];
  };
  getGlyph: (id: number) => { path: { toSVG: () => string } };
}

/**
 * Shape one line of text into positioned glyphs.
 *
 * The font is passed in rather than loaded here so the caller controls caching
 * and so this stays testable without a browser.
 */
export function shapeText(text: string, font: FontkitFont): ShapedRun {
  const run = font.layout(text);
  const glyphs = run.glyphs.map((glyph, index) => ({
    gid: glyph.id,
    advance: run.positions[index]?.xAdvance ?? 0,
    xOffset: run.positions[index]?.xOffset ?? 0,
    yOffset: run.positions[index]?.yOffset ?? 0,
  }));
  return {
    glyphs,
    rtl: isRtl(text),
    advance: glyphs.reduce((sum, glyph) => sum + glyph.advance, 0),
    unitsPerEm: font.unitsPerEm,
  };
}

/** Convert font units to points for a given size. */
export function unitsToPoints(units: number, sizePt: number, unitsPerEm: number) {
  return (units / unitsPerEm) * sizePt;
}

export interface GlyphPlacement {
  gid: number;
  x: number;
  y: number;
  sizePt: number;
}

/**
 * Place a shaped run on a baseline.
 *
 * Right-to-left text is placed from the right edge leftwards: the first logical
 * glyph sits furthest right, which is the order the shaped run already carries.
 */
export function placeRun(
  run: ShapedRun,
  origin: { x: number; y: number },
  sizePt: number,
): GlyphPlacement[] {
  const scale = sizePt / run.unitsPerEm;
  const placements: GlyphPlacement[] = [];
  let pen = run.rtl
    ? origin.x - unitsToPoints(run.advance, sizePt, run.unitsPerEm)
    : origin.x;
  if (run.rtl) {
    // Walk the run right to left so each glyph lands at its own advance.
    for (const glyph of run.glyphs) {
      pen += glyph.advance * scale;
      placements.push({
        gid: glyph.gid,
        x: pen + glyph.xOffset * scale,
        y: origin.y - glyph.yOffset * scale,
        sizePt,
      });
    }
  } else {
    for (const glyph of run.glyphs) {
      placements.push({
        gid: glyph.gid,
        x: pen + glyph.xOffset * scale,
        y: origin.y + glyph.yOffset * scale,
        sizePt,
      });
      pen += glyph.advance * scale;
    }
  }
  return placements;
}

/** SVG path for one glyph, in font units. */
export function glyphPath(font: FontkitFont, gid: number): string {
  return font.getGlyph(gid).path.toSVG();
}

export interface PdfDrawTarget {
  drawSvgPath: (path: string, options: Record<string, unknown>) => unknown;
}

/**
 * Draw a shaped run into a pdf-lib page.
 *
 * Each glyph is drawn as its own path at its own position, which is what makes
 * the marks sit where the shaper put them: there is no assumption that a
 * character is one rectangle of advance.
 */
export function drawShapedRun(
  page: PdfDrawTarget,
  run: ShapedRun,
  font: FontkitFont,
  options: {
    x: number;
    y: number;
    sizePt: number;
    color?: { r: number; g: number; b: number };
  },
): GlyphPlacement[] {
  const placements = placeRun(run, { x: options.x, y: options.y }, options.sizePt);
  const scale = options.sizePt / run.unitsPerEm;
  for (const placement of placements) {
    const path = glyphPath(font, placement.gid);
    if (!path) continue;
    page.drawSvgPath(path, {
      x: placement.x,
      y: placement.y,
      scale,
      color: options.color,
      borderWidth: 0,
    });
  }
  return placements;
}
