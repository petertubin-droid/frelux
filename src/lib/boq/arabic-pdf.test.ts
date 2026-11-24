import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "@cantoo/pdf-lib";
import * as fontkitNs from "fontkit";
import { drawShapedRun, placeRun, shapeText } from "./arabic-shaping";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fontkit: any = (fontkitNs as any).default ?? fontkitNs;

const FONT = resolve(
  process.cwd(),
  "public/fonts/pdf/NotoNaskhArabic-Regular.ttf",
);
const naskh = fontkit.create(readFileSync(FONT));
const STACKED = "\u0634\u064E\u0651";

/** Build the golden Arabic page: one line, marks stacked on one base. */
async function buildGoldenPage(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const latin = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("BOQ - Arabic golden case", { x: 48, y: 780, size: 12, font: latin });

  const run = shapeText(STACKED, naskh);
  drawShapedRun(page, run, naskh, { x: 400, y: 700, sizePt: 36 });

  // Determinism: no wall-clock metadata, so the same input is the same file.
  doc.setCreationDate(new Date("2026-11-24T00:00:00Z"));
  doc.setModificationDate(new Date("2026-11-24T00:00:00Z"));
  doc.setProducer("FRELUX");
  doc.setCreator("FRELUX");
  return doc.save();
}

describe("Arabic golden PDF", () => {
  it("produces a real one-page PDF", async () => {
    const bytes = await buildGoldenPage();
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("draws each shaped glyph as its own path", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const run = shapeText(STACKED, naskh);
    const placed = drawShapedRun(page, run, naskh, { x: 400, y: 700, sizePt: 36 });
    // Four glyphs in, four placements out: nothing was dropped.
    expect(placed).toHaveLength(4);
    // The two marks land at different heights, which is the whole point.
    const markYs = placed
      .slice(0, 2)
      .map((glyph) => Math.round(glyph.y));
    expect(new Set(markYs).size).toBe(2);
    expect(Math.abs(markYs[0] - markYs[1])).toBeGreaterThan(1);
  });

  it("is byte-stable, so the export can be hashed and anchored", async () => {
    const a = createHash("sha256").update(await buildGoldenPage()).digest("hex");
    const b = createHash("sha256").update(await buildGoldenPage()).digest("hex");
    expect(a).toBe(b);
  });

  it("keeps the run inside the page box", async () => {
    const run = shapeText(STACKED, naskh);
    const placed = placeRun(run, { x: 400, y: 700 }, 36);
    for (const glyph of placed) {
      expect(glyph.x).toBeGreaterThan(0);
      expect(glyph.x).toBeLessThan(595);
      expect(glyph.y).toBeGreaterThan(0);
      expect(glyph.y).toBeLessThan(842);
    }
  });
});
