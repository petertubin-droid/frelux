/**
 * Arabic BOQ export, drawn by pdf-lib.
 *
 * The jsPDF renderer cannot shape Arabic: it draws codepoints left to right
 * with no joining, which is why Arabic documents were routed to the browser
 * print dialog and the app stopped producing the file. A printed page cannot be
 * hashed, sealed or verified, so those documents were the one part of the BOQ
 * the authority chain could not reach.
 *
 * This module produces the file itself. It mirrors the jsPDF layout band for
 * band (header, project block, item table, commercial summary, notes, review,
 * footer), with three differences that come from the script:
 *
 *  1. Every string is shaped with fontkit and drawn as glyph outlines through
 *     `drawShapedRun`, so joins, ligatures and stacked marks are the shaper's
 *     decisions rather than the renderer's guesses.
 *  2. The page is mirrored for a right-to-left document: the item number sits
 *     on the right, the amount on the left, and each cell anchors to its own
 *     starting edge. A mirrored table is not decoration: an Arabic reader scans
 *     from the right, and a table that starts on the left reads backwards.
 *  3. Nothing is embedded. Glyphs arrive as paths, so no font program travels
 *     in the file and the payload stays smaller than a subset would be. The
 *     cost is that Arabic text is not selectable or searchable; a hidden text
 *     layer would restore that, and is not claimed here.
 *
 * Scope: Arabic (and the Arabic Supplement/Extended blocks). Other shaped
 * scripts still need a font we do not ship, and still go to Print.
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

/** True when this text is written in Arabic script and needs this renderer. */
export function isArabicDocument(text: string): boolean {
  return ARABIC_SCRIPT.test(text);
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

export interface ArabicBoqOptions {
  summaryOnly?: boolean;
  showMaterialRate?: boolean;
  showLabourRate?: boolean;
  /** Fixed timestamp, so the same document hashes to the same file. */
  now?: Date;
  /** Test seam: a fontkit font already loaded from disk. */
  font?: FontkitFont;
}

let cachedFont: FontkitFont | null = null;

/** Load the shipped Naskh face once per session. */
export async function loadNaskhFont(): Promise<FontkitFont> {
  if (cachedFont) return cachedFont;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const res = await fetch(`${base}/fonts/pdf/NotoNaskhArabic-Regular.ttf`);
  if (!res.ok) throw new Error("The Arabic PDF font could not be loaded.");
  cachedFont = fontkit.create(new Uint8Array(await res.arrayBuffer()));
  return cachedFont;
}

/** Test hook: forget the fetched font. */
export function resetNaskhFontCache(): void {
  cachedFont = null;
}

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
 * placement step rather than in every call site is what keeps the two
 * directions from drifting apart.
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
 * reader can see.
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
  return width;
}

/**
 * Wrap a paragraph to a width by measuring the shaped line, not the character
 * count. Arabic words are not one advance per character, so a wrap that counts
 * characters overruns the column on some lines and leaves gaps on others.
 */
export function wrapShaped(
  font: FontkitFont,
  text: string,
  sizePt: number,
  maxWidth: number,
): string[] {
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

export async function buildArabicBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: ArabicBoqOptions = {},
): Promise<Uint8Array> {
  const font = options.font ?? (await loadNaskhFont());
  const pdf = await PDFDocument.create();
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);

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

  /**
   * One direction for the whole document: the title and the item descriptions
   * are written in the same script, and a page that mirrors half its table
   * would be worse than either choice.
   */
  const rtl = isArabicDocument(boqDocumentText(standard, studio));

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let ctx: DrawContext = { page, font, rtl };
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
    ctx = { page, font, rtl };
    drawHeader();
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + FOOTER_RESERVE) newPage();
  };

  drawHeader();

  // ---------------------------------------------------------------- title
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

  // ------------------------------------------------------------ meta grid
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
        y,
        7.5,
        BRAND,
        column.align,
        2,
      );
    });
    y -= 15;
  };

  if (!summaryOnly) drawTableHead();

  // --------------------------------------------------------------- items
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
        `${section.code}  ${section.title}`,
        { left: MARGIN, width: CONTENT },
        y,
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
        `${section.code}  ${section.title}`,
        { left: columnLefts[0], width: columns[0].width },
        y,
        8,
        rgb(0, 0, 0),
        "start",
        1,
      );
      drawIn(
        ctx,
        String(count),
        { left: columnLefts[1], width: columns[1].width },
        y,
        8,
        rgb(0, 0, 0),
        "end",
        2,
      );
      drawIn(
        ctx,
        rateText(section.sectionTotal),
        { left: columnLefts[2], width: columns[2].width },
        y,
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
      "end",
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

  // ---------------------------------------------------------------- notes
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

/**
 * Build and seal an Arabic BOQ.
 *
 * The returned `hash` is the SHA-256 of the sealed bytes, which are the bytes
 * the caller downloads, so anyone holding the file can recompute it and get the
 * same string. That is the whole point of the migration: a printed page cannot
 * be hashed, and a document nobody can hash is a document nobody can verify.
 */
export async function sealArabicBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: ArabicBoqOptions & { stampOnBlockchain?: boolean } = {},
): Promise<{
  bytes: Uint8Array;
  hash: string;
  verificationId?: string;
  stampError?: string;
}> {
  const bytes = await buildArabicBoqPdf(standard, studio, options);
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

/** Build, seal and download an Arabic BOQ, returning the hash of the file. */
export async function downloadArabicBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: ArabicBoqOptions & { stampOnBlockchain?: boolean } = {},
): Promise<{
  hash: string;
  verificationId?: string;
  stampError?: string;
}> {
  const { bytes, hash, verificationId, stampError } = await sealArabicBoqPdf(
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
