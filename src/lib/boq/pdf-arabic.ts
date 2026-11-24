/**
 * Arabic, Indic, and CJK BOQ export, drawn by pdf-lib.
 *
 * The jsPDF renderer cannot shape complex scripts: it draws codepoints left to right
 * with no joining or GSUB/GPOS shaping, which is why complex-script documents were
 * previously routed to the browser print dialog. A printed page cannot be hashed,
 * sealed or verified, so those documents were the one part of the BOQ the authority
 * chain could not reach.
 *
 * This module produces the file itself. It mirrors the jsPDF layout band for
 * band (header, project block, item table, commercial summary, notes, review,
 * footer), with key features that come from the script:
 *
 *  1. Every string is shaped with fontkit and drawn as glyph outlines through
 *     `drawShapedRun`, so joins, ligatures, conjuncts, matras, and stacked marks
 *     are the shaper's decisions rather than the renderer's guesses.
 *  2. The page is mirrored for right-to-left documents (Arabic): the item number sits
 *     on the right, the amount on the left, and each cell anchors to its own
 *     starting edge. Left-to-right complex scripts (Devanagari, CJK) retain standard
 *     left-to-right table ordering.
 *  3. The visible glyphs are outlines, so no font program travels in the file
 *     and the payload stays small. The cost is that the complex text is not text a
 *     reader can select. A hidden text layer exists (options.textLayer) but is
 *     off by default: pdf-lib writes a glyph-mapped ToUnicode table, and a shaped run
 *     has several codepoints per glyph, so the layer copies as mojibake. Searchable
 *     complex text needs a real ToUnicode CMap, which is not claimed here.
 *  4. Shipped fonts:
 *     - Noto Naskh Arabic for Arabic script
 *     - Noto Sans Devanagari for Devanagari / Indic script
 *     - Noto Sans CJK for Chinese, Japanese, and Korean scripts
 *     All documents using these scripts produce real, deterministic, hashable PDFs.
 */

import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";
import * as fontkitNs from "fontkit";
import type { StandardBoqDocument } from "@/lib/finance/boq-standard";
import { formatByCode } from "@/lib/international/currency-format";
import { documentStatusLabel } from "./compile";
import { reviewerCredit } from "@/lib/identity/credentials";
import type { BoqStudioDocument } from "./types";
import { drawShapedRun, shapeText, type ShapedRun } from "./arabic-shaping";
import { downloadSealedPdf, sealAndStampPdf } from "@/lib/pdf-seal";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fontkit: any = (fontkitNs as any).default ?? fontkitNs;
type FontkitFont = any;

/** Arabic, Arabic Supplement, Arabic Extended-A, and the presentation forms. */
const ARABIC_SCRIPT =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Devanagari (Hindi, Marathi, Nepali, Sanskrit, etc.). */
const DEVANAGARI_SCRIPT = /[\u0900-\u097F]/;

/** CJK Ideographs, Hiragana, Katakana, and Hangul. */
const CJK_SCRIPT =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

/** True when this text is written in Arabic script. */
export function isArabicDocument(text: string): boolean {
  return ARABIC_SCRIPT.test(text);
}

/** True when this text contains Devanagari script. */
export function isDevanagariDocument(text: string): boolean {
  return DEVANAGARI_SCRIPT.test(text);
}

/** True when this text contains CJK script (Chinese, Japanese, Korean). */
export function isCjkDocument(text: string): boolean {
  return CJK_SCRIPT.test(text);
}

/** True when this text uses an outline-rendered complex script. */
export function isOutlineDocument(text: string): boolean {
  return (
    isArabicDocument(text) || isDevanagariDocument(text) || isCjkDocument(text)
  );
}

/** A4 landscape in points, the same sheet the jsPDF export uses. */
export const PAGE = { width: 842, height: 595 };
const MM = 2.834645669;
const MARGIN = 12 * MM;
const CONTENT = PAGE.width - MARGIN * 2;
const HEADER_H = 18 * MM;
const FOOTER_RESERVE = 18;

const BRAND = rgb(15 / 255, 23 / 255, 42 / 255);
const ACCENT = rgb(37 / 255, 99 / 255, 235 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const RULE = rgb(220 / 255, 225 / 255, 232 / 255);
const HEAD_FILL = rgb(241 / 255, 245 / 255, 249 / 255);

/**
 * The text that decides the script for the whole document.
 *
 * Kept as one function so the page and the renderer cannot disagree about
 * which documents take this path.
 */
export function boqDocumentText(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): string {
  return [
    studio.title,
    studio.description,
    studio.client?.name,
    studio.client?.address,
    studio.contractor?.name,
    ...(studio.assumptions ?? []),
    ...(studio.exclusions ?? []),
    ...standard.sections.flatMap((section) => [
      section.title,
      ...section.subSections.flatMap((sub) => [
        sub.title,
        ...sub.items.flatMap((item) => [item.description]),
      ]),
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

/** True when this document must be drawn by the Arabic renderer. */
export function needsArabicRenderer(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): boolean {
  return isArabicDocument(boqDocumentText(standard, studio));
}

/** True when this document uses Devanagari script. */
export function needsDevanagariRenderer(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): boolean {
  return isDevanagariDocument(boqDocumentText(standard, studio));
}

/** True when this document uses CJK script. */
export function needsCjkRenderer(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): boolean {
  return isCjkDocument(boqDocumentText(standard, studio));
}

/** True when this document needs outline rendering (Arabic, Devanagari, or CJK). */
export function needsOutlineRenderer(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): boolean {
  return isOutlineDocument(boqDocumentText(standard, studio));
}

export interface OutlineBoqOptions {
  summaryOnly?: boolean;
  showMaterialRate?: boolean;
  showLabourRate?: boolean;
  /** Fixed timestamp, so the same document hashes to the same file. */
  now?: Date;
  /** Test seam: a fontkit font already loaded from disk. */
  font?: FontkitFont;
  /** Test seam: the same face as bytes, for the invisible text layer. */
  fontBytes?: Uint8Array;
  /**
   * Draw an invisible text layer. OFF by default, and here is the measurement
   * behind that: pdf-lib maps text through glyph ids, and a shaped complex run
   * has several codepoints per glyph, so the ToUnicode table it writes does not
   * round-trip. Extracting "فيلا في لكي" from an embedded subset returns
   * "ف\u0006ي\u0001لا", and the unsubsetted face returns "ğ3یń ﻟﻜیń". A layer
   * that copies as mojibake is worse than no layer: it invites a search that
   * silently fails. Faithful extraction needs a real ToUnicode CMap,
   * which this engine cannot emit for shaped scripts.
   */
  textLayer?: boolean;
}

export type ArabicBoqOptions = OutlineBoqOptions;

let cachedNaskhFont: FontkitFont | null = null;
let cachedNaskhBytes: Uint8Array | null = null;

let cachedDevanagariFont: FontkitFont | null = null;
let cachedDevanagariBytes: Uint8Array | null = null;

let cachedCjkFont: FontkitFont | null = null;
let cachedCjkBytes: Uint8Array | null = null;

async function fetchFontBytes(filename: string): Promise<Uint8Array> {
  // In Node / vitest (including happy-dom environments), read directly from disk.
  if (typeof process !== "undefined" && Boolean(process.versions?.node)) {
    try {
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      return new Uint8Array(
        readFileSync(resolve(process.cwd(), "public/fonts/pdf", filename)),
      );
    } catch {
      // Fall through to fetch if file read fails
    }
  }

  // In the browser, fetch the font asset over HTTP.
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL.replace(/\/+$/, "")
      : "";
  const res = await fetch(`${base}/fonts/pdf/${filename}`);
  if (!res.ok) throw new Error(`The PDF font ${filename} could not be loaded.`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Load the shipped Naskh face once per session. */
export async function loadNaskhFont(): Promise<FontkitFont> {
  if (cachedNaskhFont) return cachedNaskhFont;
  const bytes = await loadNaskhBytes();
  cachedNaskhFont = fontkit.create(bytes);
  return cachedNaskhFont;
}

/** The Naskh face as bytes. */
export async function loadNaskhBytes(): Promise<Uint8Array> {
  if (cachedNaskhBytes) return cachedNaskhBytes;
  cachedNaskhBytes = await fetchFontBytes("NotoNaskhArabic-Regular.ttf");
  return cachedNaskhBytes;
}

/** Load the shipped Devanagari face once per session. */
export async function loadDevanagariFont(): Promise<FontkitFont> {
  if (cachedDevanagariFont) return cachedDevanagariFont;
  const bytes = await loadDevanagariBytes();
  cachedDevanagariFont = fontkit.create(bytes);
  return cachedDevanagariFont;
}

/** The Devanagari face as bytes. */
export async function loadDevanagariBytes(): Promise<Uint8Array> {
  if (cachedDevanagariBytes) return cachedDevanagariBytes;
  cachedDevanagariBytes = await fetchFontBytes("NotoSansDevanagari-Regular.ttf");
  return cachedDevanagariBytes;
}

/** Load the shipped CJK face once per session. */
export async function loadCjkFont(): Promise<FontkitFont> {
  if (cachedCjkFont) return cachedCjkFont;
  const bytes = await loadCjkBytes();
  const raw = fontkit.create(bytes);
  cachedCjkFont = raw.getVariation ? raw.getVariation({ wght: 400 }) : raw;
  return cachedCjkFont;
}

/** The CJK face as bytes. */
export async function loadCjkBytes(): Promise<Uint8Array> {
  if (cachedCjkBytes) return cachedCjkBytes;
  cachedCjkBytes = await fetchFontBytes("NotoSansCJK-Regular.otf");
  return cachedCjkBytes;
}

/** Test hook: forget the fetched fonts. */
export function resetOutlineFontCache(): void {
  cachedNaskhFont = null;
  cachedNaskhBytes = null;
  cachedDevanagariFont = null;
  cachedDevanagariBytes = null;
  cachedCjkFont = null;
  cachedCjkBytes = null;
}

export const resetNaskhFontCache = resetOutlineFontCache;

function money(amount: number, currency: string): string {
  return formatByCode(amount, currency || "XXX", { decimals: "native" });
}

/* ------------------------------------------------------------------ */
/* Text placement                                                      */
/* ------------------------------------------------------------------ */

/**
 * Mirror a logical (left-to-right) box for a right-to-left page.
 *
 * The layout is written once, left to right, and mirrored here. Doing it at the
 * box level means table math, column widths, padding and wrap math are identical
 * for both reading directions.
 */
export function mirror(left: number, width: number, rtl: boolean): number {
  return rtl ? PAGE.width - left - width : left;
}

/** Width of a shaped string in points. */
export function shapedWidth(
  font: FontkitFont,
  text: string,
  sizePt: number,
): number {
  if (!text) return 0;
  const run = shapeText(text, font);
  return (run.advance / run.unitsPerEm) * sizePt;
}

/**
 * Round the numbers in an SVG path.
 *
 * fontkit emits six decimals per coordinate, and a BOQ draws the same glyph
 * hundreds of times, so the precision is most of the file. One hundredth of a
 * font unit is 1/204800 of an em: at 8 pt that is 0.0004 pt, far below the
 * resolution of any press. Rounding halves the payload and changes nothing a
 * human can see.
 */
export function roundPath(path: string, places = 2): string {
  return path.replace(/-?\d+\.\d+/g, (n) =>
    String(Number(Number(n).toFixed(places))),
  );
}

/** A page whose glyph paths are rounded before they are drawn. */
function roundingPage<
  T extends {
    drawSvgPath: (path: string, options: Record<string, unknown>) => unknown;
  },
>(page: T): T {
  return {
    ...page,
    drawSvgPath: (path: string, options: Record<string, unknown>) =>
      page.drawSvgPath(roundPath(path), options),
  } as T;
}

interface DrawContext {
  page: ReturnType<PDFDocument["addPage"]>;
  font: FontkitFont;
  rtl: boolean;
  /** Invisible text for selection and search; null when the layer is off. */
  textFont: {
    widthOfTextAtSize: (text: string, size: number) => number;
  } | null;
}

type Align = "start" | "end" | "center";

/**
 * Draw one string inside a logical box.
 *
 * `start` is the reading edge of the cell: the left edge in a left-to-right
 * document, the right edge in a right-to-left one. The run itself is always
 * laid out by the shaper; only its anchor moves.
 */
function drawIn(
  ctx: DrawContext,
  text: string,
  box: { left: number; width: number },
  y: number,
  sizePt: number,
  color = rgb(0, 0, 0),
  align: Align = "start",
  pad = 0,
): number {
  if (!text) return 0;
  const width = shapedWidth(ctx.font, text, sizePt);
  const left = mirror(box.left, box.width, ctx.rtl);
  let x: number;
  if (align === "center") {
    x = left + (box.width - width) / 2;
  } else {
    const atStart = align === "start" ? !ctx.rtl : ctx.rtl;
    x = atStart ? left + pad : left + box.width - pad - width;
  }
  const run: ShapedRun = shapeText(text, ctx.font);
  drawShapedRun(roundingPage(ctx.page), run, ctx.font, {
    x,
    y,
    sizePt,
    // pdf-lib validates the colour instance, not a plain {r,g,b}; the shaper's
    // option type is intentionally loose so it stays engine-agnostic.
    color: rgb(color.red, color.green, color.blue) as unknown as {
      r: number;
      g: number;
      b: number;
    },
  });

  // Invisible text at the same origin, in reading order. It carries no visual
  // weight (opacity 0) and is what a reader selects or searches for.
  if (ctx.textFont) {
    const plain = ctx.textFont.widthOfTextAtSize(text, sizePt);
    const textX = align === "start" ? x : x + width - plain;
    try {
      ctx.page.drawText(text, {
        x: Math.max(0, textX),
        y,
        size: sizePt,
        font: ctx.textFont as never,
        opacity: 0,
      });
    } catch {
      // A glyph the subset font cannot draw must not sink the document: the
      // outlines above are the document, the layer is an aid.
    }
  }
  return width;
}

/**
 * Wrap a paragraph to a width by measuring the shaped line, not the character
 * count. Complex words and ideographs are not one advance per character, so a wrap
 * that counts characters overruns the column on some lines and leaves gaps on others.
 */
export function wrapShaped(
  font: FontkitFont,
  text: string,
  sizePt: number,
  maxWidth: number,
): string[] {
  // If text contains CJK ideographs, use word segmentation so long Chinese/Japanese
  // text without spaces can break across lines naturally.
  const hasCjk =
    /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text);
  if (
    hasCjk &&
    typeof Intl !== "undefined" &&
    typeof (Intl as any).Segmenter === "function"
  ) {
    const segmenter = new (Intl as any).Segmenter(undefined, {
      granularity: "word",
    });
    const segments: string[] = [];
    for (const seg of segmenter.segment(text)) {
      if (seg.segment.trim()) segments.push(seg.segment);
    }
    if (segments.length > 0) {
      const lines: string[] = [];
      let current = "";
      for (const seg of segments) {
        const segIsCjk =
          /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(seg);
        const joiner = segIsCjk || !current ? "" : " ";
        const candidate = current ? `${current}${joiner}${seg}` : seg;
        if (shapedWidth(font, candidate, sizePt) <= maxWidth || !current) {
          current = candidate;
        } else {
          lines.push(current);
          current = seg;
        }
      }
      if (current) lines.push(current);
      return lines;
    }
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (shapedWidth(font, candidate, sizePt) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Wrap Latin text with the standard font, for labels and figures. */
function wrapLatin(
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  text: string,
  sizePt: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, sizePt) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

export async function buildOutlineBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: OutlineBoqOptions = {},
): Promise<Uint8Array> {
  const docText = boqDocumentText(standard, studio);
  const rtl = isArabicDocument(docText);

  let font = options.font;
  let fontBytes = options.fontBytes;

  if (!font) {
    if (rtl) {
      font = await loadNaskhFont();
      fontBytes = fontBytes ?? (await loadNaskhBytes());
    } else if (isDevanagariDocument(docText)) {
      font = await loadDevanagariFont();
      fontBytes = fontBytes ?? (await loadDevanagariBytes());
    } else if (isCjkDocument(docText)) {
      font = await loadCjkFont();
      fontBytes = fontBytes ?? (await loadCjkBytes());
    } else {
      // Default fallback face
      font = await loadNaskhFont();
      fontBytes = fontBytes ?? (await loadNaskhBytes());
    }
  }

  const pdf = await PDFDocument.create();
  // Subsetting the layer font needs fontkit registered on this document.
  pdf.registerFontkit(fontkit);
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // The visible glyphs are outlines; this subset font carries the text layer.
  // Subsetting keeps only the glyphs this document uses, so the payload grows by
  // the text, not by the face size.
  const textLayerFont =
    options.textLayer !== true || !fontBytes
      ? null
      : await pdf.embedFont(fontBytes, {
          subset: true,
        });

  const currency = standard.metadata.currency;
  const status = documentStatusLabel(studio);
  const isSurvey = studio.mode === "market_survey";
  const summaryOnly = options.summaryOnly === true;
  const showMaterial = options.showMaterialRate !== false;
  const showLabour = options.showLabourRate !== false;

  const allItems = standard.sections.flatMap((section) =>
    section.subSections.flatMap((sub) => sub.items),
  );
  const pricedLines = allItems.filter((item) => item.unitRate > 0).length;
  const rateText = (value: number) =>
    isSurvey && !(value > 0) ? "TBC" : money(value, currency);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let ctx: DrawContext = { page, font, rtl, textFont: textLayerFont };
  let y = MARGIN;
  let pageIndex = 1;
  let totalPages = 1;

  const drawHeader = () => {
    page.drawRectangle({
      x: 0,
      y: PAGE.height - HEADER_H,
      width: PAGE.width,
      height: HEADER_H,
      color: BRAND,
    });
    const white = rgb(1, 1, 1);
    const bandTop = PAGE.height - 11;
    page.drawText("FRELUX", {
      x: MARGIN,
      y: bandTop,
      size: 13,
      font: latinBold,
      color: white,
    });
    page.drawText(isSurvey ? "Market survey schedule" : "Bill of Quantities", {
      x: MARGIN + 26 * MM,
      y: bandTop,
      size: 9,
      font: latin,
      color: white,
    });
    const ref = `${studio.reference || "No reference"}  ·  R${studio.revision}`;
    const refWidth = latin.widthOfTextAtSize(ref, 9);
    page.drawText(ref, {
      x: PAGE.width - MARGIN - refWidth,
      y: bandTop,
      size: 9,
      font: latin,
      color: white,
    });
    y = PAGE.height - 26 * MM;
  };

  const drawFooter = () => {
    const grey = MUTED;
    page.drawText(status, {
      x: MARGIN,
      y: MARGIN,
      size: 7.5,
      font: latin,
      color: grey,
    });
    const mid = `${studio.prepared_date || options.now?.toISOString().slice(0, 10) || ""}  ·  ${currency}  ·  ${studio.measurement_system}`;
    const midWidth = latin.widthOfTextAtSize(mid, 7.5);
    page.drawText(mid, {
      x: (PAGE.width - midWidth) / 2,
      y: MARGIN,
      size: 7.5,
      font: latin,
      color: grey,
    });
    const label = `Page ${pageIndex} of ${totalPages}`;
    const labelWidth = latin.widthOfTextAtSize(label, 7.5);
    page.drawText(label, {
      x: PAGE.width - MARGIN - labelWidth,
      y: MARGIN,
      size: 7.5,
      font: latin,
      color: grey,
    });
  };

  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    pageIndex += 1;
    ctx = { page, font, rtl, textFont: textLayerFont };
    drawHeader();
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + FOOTER_RESERVE) newPage();
  };

  drawHeader();

  // -------------------------------------------------------- title & meta
  const titleSize = 14;
  const titleLines = wrapShaped(
    font,
    studio.title ||
      (isSurvey ? "Untitled market survey" : "Untitled Bill of Quantities"),
    titleSize,
    CONTENT,
  );
  for (const line of titleLines) {
    drawIn(
      ctx,
      line,
      { left: MARGIN, width: CONTENT },
      y,
      titleSize,
      BRAND,
      "start",
    );
    y -= titleSize + 2;
  }
  y -= 2;

  if (studio.description) {
    for (const line of wrapShaped(font, studio.description, 9, CONTENT)) {
      drawIn(ctx, line, { left: MARGIN, width: CONTENT }, y, 9, MUTED, "start");
      y -= 11;
    }
  }
  y -= 4;

  const metaRows: Array<[string, string]> = [
    ["Client", studio.client.name || "-"],
    ["Contractor", studio.contractor.name || "-"],
    ["Location", studio.client.address || "-"],
    ["Prepared by", studio.prepared_by || "-"],
    ["Standard", studio.standard],
    ["Revision", `R${studio.revision}`],
    ["Prepared date", studio.prepared_date || "-"],
    ["Status", status],
    ...(isSurvey
      ? ([
          ["Document type", "Market survey"],
          ["Market", studio.survey?.market_city || "-"],
          ["Rates captured", `${pricedLines}/${allItems.length} lines`],
          ["Survey date", studio.survey?.survey_date || "-"],
        ] as Array<[string, string]>)
      : []),
  ];
  const colWidth = CONTENT / 4;
  metaRows.forEach(([label, value], index) => {
    const col = index % 4;
    const rowY = y - Math.floor(index / 4) * 24;
    const box = { left: MARGIN + col * colWidth, width: colWidth - 6 };
    page.drawText(label.toUpperCase(), {
      x: mirror(box.left, box.width, false),
      y: rowY,
      size: 6.5,
      font: latin,
      color: MUTED,
    });
    drawIn(ctx, value, box, rowY - 10, 9, rgb(0, 0, 0), "start");
  });
  y -= Math.ceil(metaRows.length / 4) * 24 + 6;

  // -------------------------------------------------------------- columns
  interface Column {
    label: string;
    width: number;
    align: Align;
  }
  const columns: Column[] = summaryOnly
    ? [
        { label: "Section", width: CONTENT - 51 - 102, align: "start" },
        { label: "Items", width: 51, align: "end" },
        { label: "Section total", width: 102, align: "end" },
      ]
    : (() => {
        const cols: Column[] = [
          { label: "Item", width: 51, align: "start" },
          { label: "Description", width: 0, align: "start" },
          { label: "Unit", width: 40, align: "start" },
          { label: "Qty", width: 51, align: "end" },
        ];
        if (showMaterial)
          cols.push({ label: "Material", width: 68, align: "end" });
        if (showLabour) cols.push({ label: "Labour", width: 68, align: "end" });
        cols.push({ label: "Rate", width: 68, align: "end" });
        cols.push({ label: "Amount", width: 85, align: "end" });
        const fixed = cols.reduce((sum, c) => sum + c.width, 0);
        const desc = cols.find((c) => c.label === "Description");
        if (desc) desc.width = CONTENT - fixed;
        return cols;
      })();

  /** Logical left offset of each column, in table order. */
  const columnLefts: number[] = [];
  columns.reduce((left, column) => {
    columnLefts.push(left);
    return left + column.width;
  }, MARGIN);

  const drawTableHead = () => {
    ensure(14);
    page.drawRectangle({
      x: MARGIN,
      // The band sits directly under the current line.
      y: y - 12,
      width: CONTENT,
      height: 12,
      color: HEAD_FILL,
    });
    columns.forEach((column, index) => {
      drawIn(
        ctx,
        column.label,
        { left: columnLefts[index], width: column.width },
        y - 9,
        7.5,
        BRAND,
        column.align,
        2,
      );
    });
    y -= 15;
  };

  if (!summaryOnly) drawTableHead();

  // ---------------------------------------------------------------- items
  const descriptionColumn = summaryOnly ? 0 : 1;

  if (summaryOnly) {
    const note =
      "Summary preview: line-level quantities, specifications, and rates are omitted. This preliminary estimate is not a tender schedule or professional certification.";
    for (const line of wrapLatin(latin, note, 8, CONTENT)) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 8,
        font: latin,
        color: MUTED,
      });
      y -= 10;
    }
    y -= 4;
  }

  for (const section of standard.sections) {
    ensure(20);
    if (!summaryOnly) {
      drawIn(
        ctx,
        `Section ${section.code} — ${section.title}`,
        { left: MARGIN, width: CONTENT },
        y - 9,
        9,
        ACCENT,
        "start",
      );
      y -= 13;
    }

    if (summaryOnly) {
      const count = section.subSections.reduce(
        (sum, sub) => sum + sub.items.length,
        0,
      );
      drawIn(
        ctx,
        `Section ${section.code} — ${section.title}`,
        { left: columnLefts[0], width: columns[0].width },
        y - 9,
        8,
        rgb(0, 0, 0),
        "start",
        1,
      );
      drawIn(
        ctx,
        String(count),
        { left: columnLefts[1], width: columns[1].width },
        y - 9,
        8,
        rgb(0, 0, 0),
        "end",
        2,
      );
      drawIn(
        ctx,
        rateText(section.sectionTotal),
        { left: columnLefts[2], width: columns[2].width },
        y - 9,
        8,
        rgb(0, 0, 0),
        "end",
        2,
      );
      y -= 18;
      continue;
    }

    for (const sub of section.subSections) {
      for (const item of sub.items) {
        const descWidth = columns[descriptionColumn].width - 4;
        const descLines = wrapShaped(font, item.description, 8, descWidth);
        const rowHeight = Math.max(16, descLines.length * 10 + 6);
        if (y - rowHeight < MARGIN + FOOTER_RESERVE) {
          newPage();
          drawTableHead();
        }
        const rowY = y;
        drawIn(
          ctx,
          item.itemNumber,
          { left: columnLefts[0], width: columns[0].width },
          rowY,
          8,
          rgb(0, 0, 0),
          "start",
          2,
        );
        descLines.forEach((line, lineIndex) => {
          drawIn(
            ctx,
            line,
            { left: columnLefts[1], width: columns[1].width },
            rowY - lineIndex * 10,
            8,
            rgb(0, 0, 0),
            "start",
            2,
          );
        });
        drawIn(
          ctx,
          item.unit,
          { left: columnLefts[2], width: columns[2].width },
          rowY,
          8,
          rgb(0, 0, 0),
          "start",
          2,
        );
        drawIn(
          ctx,
          String(item.quantity),
          { left: columnLefts[3], width: columns[3].width },
          rowY,
          8,
          rgb(0, 0, 0),
          "end",
          2,
        );
        let cursor = 4;
        if (showMaterial) {
          drawIn(
            ctx,
            rateText(item.materialRate),
            { left: columnLefts[cursor], width: columns[cursor].width },
            rowY,
            8,
            rgb(0, 0, 0),
            "end",
            2,
          );
          cursor += 1;
        }
        if (showLabour) {
          drawIn(
            ctx,
            rateText(item.laborRate),
            { left: columnLefts[cursor], width: columns[cursor].width },
            rowY,
            8,
            rgb(0, 0, 0),
            "end",
            2,
          );
          cursor += 1;
        }
        drawIn(
          ctx,
          rateText(item.unitRate),
          { left: columnLefts[cursor], width: columns[cursor].width },
          rowY,
          8,
          rgb(0, 0, 0),
          "end",
          2,
        );
        cursor += 1;
        drawIn(
          ctx,
          rateText(item.totalCost),
          { left: columnLefts[cursor], width: columns[cursor].width },
          rowY,
          8,
          BRAND,
          "end",
          2,
        );
        y -= rowHeight;
      }
    }

    ensure(16);
    drawIn(
      ctx,
      `Section ${section.code} total`,
      { left: MARGIN, width: CONTENT - 102 },
      y,
      8,
      rgb(0, 0, 0),
      "start",
      2,
    );
    drawIn(
      ctx,
      rateText(section.sectionTotal),
      { left: MARGIN + CONTENT - 102, width: 102 },
      y,
      8,
      BRAND,
      "end",
      2,
    );
    y -= 16;
  }

  // ---------------------------------------------------- commercial summary
  ensure(60);
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT, y },
    thickness: 0.7,
    color: RULE,
  });
  y -= 4;

  const summaryRows: Array<[string, number, boolean?]> = isSurvey
    ? [
        [
          "Market total, rates captured in market",
          standard.summary.measuredWorksTotal,
          true,
        ],
      ]
    : [
        ["Measured works", standard.summary.measuredWorksTotal],
        ["Preliminaries", standard.summary.preliminariesAmount],
        [
          "Subtotal before overhead & profit",
          standard.summary.subtotalBeforeOhp,
        ],
        ["Overhead & profit", standard.summary.overheadProfitAmount],
        ["Contingency", standard.summary.contingencyAmount],
        ["Subtotal before tax", standard.summary.subtotalBeforeTax],
        [standard.summary.taxCategory, standard.summary.taxAmount],
        ["Gross total", standard.summary.grossTotal, true],
        ...(standard.summary.retentionAmount > 0
          ? ([
              ["Retention / holdback", standard.summary.retentionAmount],
              ["Net payable", standard.summary.netPayableTotal, true],
            ] as Array<[string, number, boolean?]>)
          : []),
      ];

  if (isSurvey) {
    const outstanding = allItems.length - pricedLines;
    const note =
      outstanding === 0
        ? "Every line carries a market rate. No preliminaries, overhead, contingency, retention or tax are applied to a market survey."
        : `${outstanding} of ${allItems.length} lines are still to be priced in the market. The total shows only the rates entered so far, with no preliminaries, overhead, contingency, retention or tax.`;
    for (const line of wrapLatin(latin, note, 8, CONTENT)) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 8,
        font: latin,
        color: MUTED,
      });
      y -= 10;
    }
    y -= 4;
  }

  for (const [label, value, strong] of summaryRows) {
    ensure(16);
    const box = { left: MARGIN + CONTENT - 300, width: 300 };
    drawIn(
      ctx,
      label,
      box,
      y,
      strong ? 9 : 8.5,
      strong ? BRAND : rgb(0, 0, 0),
      "start",
    );
    const amount = money(value, currency);
    const amountBox = { left: MARGIN + CONTENT - 120, width: 120 };
    drawIn(
      ctx,
      amount,
      amountBox,
      y,
      strong ? 9 : 8.5,
      strong ? BRAND : rgb(0, 0, 0),
      "end",
    );
    y -= 14;
  }

  // ------------------------------------------------------ notes & review
  const notesBlock = (title: string, entries: string[]) => {
    if (entries.length === 0) return;
    y -= 8;
    ensure(24);
    drawIn(ctx, title, { left: MARGIN, width: CONTENT }, y, 9, BRAND, "start");
    y -= 13;
    entries.forEach((entry, index) => {
      const lines = wrapShaped(font, `${index + 1}. ${entry}`, 8, CONTENT - 6);
      ensure(lines.length * 11 + 6);
      lines.forEach((line, lineIndex) => {
        drawIn(
          ctx,
          line,
          { left: MARGIN, width: CONTENT - 6 },
          y - lineIndex * 11,
          8,
          rgb(0, 0, 0),
          "start",
          2,
        );
      });
      y -= lines.length * 11 + 4;
    });
  };

  if (!summaryOnly) {
    notesBlock("Assumptions", studio.assumptions);
    notesBlock("Exclusions", studio.exclusions);
  }

  if (studio.review.status === "reviewed" && studio.review.reviewer_name) {
    y -= 10;
    ensure(30);
    drawIn(
      ctx,
      "Professional review",
      { left: MARGIN, width: CONTENT },
      y,
      9,
      BRAND,
      "start",
    );
    y -= 13;
    drawIn(
      ctx,
      reviewerCredit(
        studio.review.reviewer_name,
        studio.review.reviewer_qualification,
        studio.review.reviewer_credential_verified === true,
      ),
      { left: MARGIN, width: CONTENT },
      y,
      8,
      rgb(0, 0, 0),
      "start",
    );
    y -= 11;
    if (studio.review.reviewed_at) {
      page.drawText(`Reviewed ${studio.review.reviewed_at.slice(0, 10)}`, {
        x: MARGIN,
        y,
        size: 8,
        font: latin,
        color: rgb(0, 0, 0),
      });
      y -= 11;
    }
    if (studio.review.note) {
      for (const line of wrapShaped(font, studio.review.note, 8, CONTENT)) {
        drawIn(
          ctx,
          line,
          { left: MARGIN, width: CONTENT },
          y,
          8,
          rgb(0, 0, 0),
          "start",
        );
        y -= 11;
      }
    }
  }

  totalPages = pageIndex;
  // Footers are drawn last, when the page count is finally known.
  pdf.getPages().forEach((p, index) => {
    page = p as typeof page;
    pageIndex = index + 1;
    drawFooter();
  });

  // Deterministic metadata: the same document hashes to the same file.
  const stamp = options.now ?? new Date();
  pdf.setCreationDate(stamp);
  pdf.setModificationDate(stamp);
  pdf.setProducer("FRELUX");
  pdf.setCreator("FRELUX");
  pdf.setTitle(`BOQ ${studio.reference || studio.title}`);
  pdf.setSubject(`Revision ${studio.revision}`);

  return pdf.save();
}

export const buildArabicBoqPdf = buildOutlineBoqPdf;

/**
 * Build and seal an outline BOQ (Arabic, Devanagari, or CJK).
 *
 * The returned `hash` is the SHA-256 of the sealed bytes, which are the bytes
 * the caller downloads, so anyone holding the file can recompute it and get the
 * same string. That is the whole point of the migration: a printed page cannot
 * be hashed, and a document nobody can hash is a document nobody can verify.
 */
export async function sealOutlineBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: OutlineBoqOptions & { stampOnBlockchain?: boolean } = {},
): Promise<{
  bytes: Uint8Array;
  hash: string;
  verificationId?: string;
  stampError?: string;
}> {
  const bytes = await buildOutlineBoqPdf(standard, studio, options);
  const { sealed, hash, verificationId, stampError } = await sealAndStampPdf(
    bytes,
    {
      title: `BOQ ${studio.reference || studio.title}`,
      subject: `Revision ${studio.revision}`,
      reference: studio.reference,
    },
    {
      stampOnBlockchain: options.summaryOnly
        ? false
        : (options.stampOnBlockchain ?? false),
      documentTitle: studio.title || `BOQ ${studio.reference || "Document"}`,
      documentReference: studio.reference,
      documentType: "boq",
    },
  );
  return { bytes: sealed, hash, verificationId, stampError };
}

export const sealArabicBoqPdf = sealOutlineBoqPdf;

/** Build, seal and download an outline BOQ, returning the hash of the file. */
export async function downloadOutlineBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: OutlineBoqOptions & { stampOnBlockchain?: boolean } = {},
): Promise<{
  hash: string;
  verificationId?: string;
  stampError?: string;
}> {
  const { bytes, hash, verificationId, stampError } = await sealOutlineBoqPdf(
    standard,
    studio,
    options,
  );
  const safe = (studio.reference || studio.title || "boq")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const modeSuffix = studio.mode === "market_survey" ? "-market-survey" : "";
  downloadSealedPdf(
    bytes,
    `${safe || "boq"}-R${studio.revision}${modeSuffix}${options.summaryOnly ? "-summary" : ""}.pdf`,
  );
  return { hash, verificationId, stampError };
}

export const downloadArabicBoqPdf = downloadOutlineBoqPdf;
