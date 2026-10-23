/**
 * Phase 4: Blueprint Intelligence, CAD & BIM.
 *
 * Three deterministic pipeline stages, no LLM anywhere:
 *   1. Document validation for multi-sheet architectural PDFs and
 *      ASCII DXF CAD files (sheet classification, raster/scan detection,
 *      corrupt-page and oversized-sheet checks).
 *   2. Scale calibration intelligence: parse drawing scale annotations
 *      ("1:100", '1/4" = 1\'-0"', "1:200 @ A1") and convert them into a
 *      real-world meters-per-PDF-point factor, plus spatial dimension-text
 *      extraction from page text items.
 *   3. Direct handoff of marked takeoff geometry (and DXF line/polyline
 *      entities) into the FRELUX takeoff calculation engines.
 *
 * Honesty rules: nothing is assumed silently. Any computed quantity that
 * depends on an input the user did not supply (slab thickness, sheet class
 * for annotation-based scale) is refused with an explicit error, and every
 * result carries disclosure notes.
 */

import {
  calculateConcreteTakeoff,
  type ConcreteTakeoffResult,
} from "./advanced-takeoff-engine";
import type { TakeoffCategory, TakeoffMark } from "./blueprint-takeoff-project";

// ---------------------------------------------------------------------------
// 1. Multi-sheet document validation
// ---------------------------------------------------------------------------

/** ISO A-series sheet sizes in millimetres (long side, short side). */
const ISO_SHEETS: Array<{ name: string; longMm: number; shortMm: number }> = [
  { name: "A0", longMm: 1189, shortMm: 841 },
  { name: "A1", longMm: 841, shortMm: 594 },
  { name: "A2", longMm: 594, shortMm: 420 },
  { name: "A3", longMm: 420, shortMm: 297 },
  { name: "A4", longMm: 297, shortMm: 210 },
];

/** ANSI/ARCH sheet sizes in millimetres (long side, short side). */
const ARCH_SHEETS: Array<{ name: string; longMm: number; shortMm: number }> = [
  { name: "ARCH E", longMm: 1219, shortMm: 914 },
  { name: "ARCH D", longMm: 914, shortMm: 610 },
  { name: "ARCH C", longMm: 610, shortMm: 457 },
  { name: "ARCH B", longMm: 457, shortMm: 305 },
  { name: "ARCH A", longMm: 279, shortMm: 216 },
];

/** PDF points per millimetre at 1:1 paper size. */
export const PT_PER_MM = 72 / 25.4;

export interface SheetPageInfo {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  /** pdf.js page rotation (0, 90, 180, 270). */
  rotation: number;
  hasTextContent: boolean;
  /** Whether the operator list contains path-painting operations. */
  hasVectorContent: boolean;
}

export interface SheetFinding {
  severity: "error" | "warning";
  message: string;
}

export interface SheetReport {
  pageNumber: number;
  /** Classified sheet class, e.g. "A1" or "ARCH D", or null if unknown. */
  sheetClass: string | null;
  /** Physical sheet size in mm once classified; null when unclassified. */
  sheetSizeMm: { longMm: number; shortMm: number } | null;
  orientation: "portrait" | "landscape";
  /** Effective long/short side in points after rotation. */
  effectiveLongPt: number;
  effectiveShortPt: number;
  rotated: boolean;
  findings: SheetFinding[];
}

export interface DocumentValidation {
  ok: boolean;
  pageCount: number;
  sheets: SheetReport[];
  findings: SheetFinding[];
  summary: string;
}

const EPS = 0.02; // 2% tolerance for sheet-size classification

function classifySheet(
  longPt: number,
  shortPt: number,
): {
  name: string;
  longMm: number;
  shortMm: number;
} | null {
  const longMm = longPt / PT_PER_MM;
  const shortMm = shortPt / PT_PER_MM;
  const tables = [...ISO_SHEETS, ...ARCH_SHEETS.map((s) => ({ ...s }))];
  for (const sheet of tables) {
    if (
      Math.abs(longMm - sheet.longMm) / sheet.longMm <= EPS &&
      Math.abs(shortMm - sheet.shortMm) / sheet.shortMm <= EPS
    )
      return { name: sheet.name, longMm: sheet.longMm, shortMm: sheet.shortMm };
  }
  return null;
}

/**
 * Validates a multi-sheet architectural document. All checks are structural:
 * page geometry, rotation, vector/text presence, sheet classification and
 * physical size sanity. No content interpretation happens here.
 */
export function validateBlueprintDocument(input: {
  fileName: string;
  pageCount: number;
  pages: SheetPageInfo[];
}): DocumentValidation {
  const findings: SheetFinding[] = [];
  const sheets: SheetReport[] = [];

  if (!Number.isInteger(input.pageCount) || input.pageCount < 1) {
    findings.push({
      severity: "error",
      message: "The document reports no readable pages.",
    });
    return {
      ok: false,
      pageCount: input.pageCount || 0,
      sheets,
      findings,
      summary: "Invalid document: no readable pages.",
    };
  }

  let errorCount = 0;
  for (let i = 1; i <= input.pageCount; i++) {
    const info = input.pages.find((p) => p.pageNumber === i);
    const pageFindings: SheetFinding[] = [];
    if (!info) {
      pageFindings.push({
        severity: "error",
        message: `Sheet ${i} could not be read from the document.`,
      });
      errorCount++;
      sheets.push({
        pageNumber: i,
        sheetClass: null,
        sheetSizeMm: null,
        orientation: "landscape",
        effectiveLongPt: 0,
        effectiveShortPt: 0,
        rotated: false,
        findings: pageFindings,
      });
      continue;
    }
    const { widthPt, heightPt, rotation } = info;
    if (
      !Number.isFinite(widthPt) ||
      !Number.isFinite(heightPt) ||
      widthPt <= 0 ||
      heightPt <= 0
    ) {
      pageFindings.push({
        severity: "error",
        message: `Sheet ${i} has unreadable page geometry.`,
      });
      errorCount++;
      sheets.push({
        pageNumber: i,
        sheetClass: null,
        sheetSizeMm: null,
        orientation: "landscape",
        effectiveLongPt: Number.isFinite(widthPt) ? widthPt : 0,
        effectiveShortPt: Number.isFinite(heightPt) ? heightPt : 0,
        rotated: false,
        findings: pageFindings,
      });
      continue;
    }
    const rotated = rotation === 90 || rotation === 270;
    const effectiveLongPt = Math.max(widthPt, heightPt);
    const effectiveShortPt = Math.min(widthPt, heightPt);
    const classified = classifySheet(effectiveLongPt, effectiveShortPt);
    if (!classified) {
      pageFindings.push({
        severity: "warning",
        message: `Sheet ${i} is not a standard A/ARCH sheet size; annotation-based scale detection is unavailable for it. Calibrate from a known dimension instead.`,
      });
    }
    if (!info.hasVectorContent) {
      pageFindings.push({
        severity: "warning",
        message: `Sheet ${i} has no vector drawing content${info.hasTextContent ? "" : " and no text layer"}. It may be a scanned raster image; browser measurements can still be taken but PDF vector fidelity cannot be verified.`,
      });
    }
    const longMm = effectiveLongPt / PT_PER_MM;
    if (longMm > 1500) {
      pageFindings.push({
        severity: "warning",
        message: `Sheet ${i} is unusually large (${Math.round(longMm)} mm on the long side); verify it is a real drawing sheet and not a banner or tiling.`,
      });
    }
    sheets.push({
      pageNumber: i,
      sheetClass: classified?.name ?? null,
      sheetSizeMm: classified
        ? { longMm: classified.longMm, shortMm: classified.shortMm }
        : null,
      orientation: widthPt >= heightPt ? "landscape" : "portrait",
      effectiveLongPt,
      effectiveShortPt,
      rotated,
      findings: pageFindings,
    });
    errorCount += pageFindings.filter((f) => f.severity === "error").length;
  }
  const allFindings = [...findings, ...sheets.flatMap((s) => s.findings)];
  const classifiedSheets = sheets.filter((s) => s.sheetClass).length;
  const summary = `${input.pageCount} sheet${input.pageCount === 1 ? "" : "s"}: ${classifiedSheets} classified as standard sheet${classifiedSheets === 1 ? "" : "s"}, ${allFindings.filter((f) => f.severity === "warning").length} warning(s), ${errorCount} error(s).`;
  return {
    ok: errorCount === 0,
    pageCount: input.pageCount,
    sheets,
    findings: allFindings,
    summary,
  };
}

// ---------------------------------------------------------------------------
// 2. Scale annotation parsing and spatial dimension extraction
// ---------------------------------------------------------------------------

export interface ScaleAnnotation {
  /** Real-world length per paper length (e.g. 100 for 1:100). */
  ratio: number;
  notation: "metric-ratio" | "imperial";
  /** Sheet class hint found in the annotation, e.g. "A1" in "1:200 @ A1". */
  sheetClassHint: string | null;
  matchedText: string;
}

const METRIC_RE = /\b1\s*[:/]\s*(\d{1,5})\b/g;
const SHEET_HINT_RE = /@\s*(A[0-4]\b|ARCH\s*[A-E]\b)/i;
const IMPERIAL_RE =
  /(\d{1,2})\s*\/\s*(2|4|8|16|32|64|128)\s*["”]?\s*=\s*1\s*['’]\s*-?\s*(\d{1,2})?\s*["”]?/g;

/** Parses scale annotations from drawing text, e.g. "SCALE 1:100". */
export function parseScaleAnnotation(text: string): ScaleAnnotation | null {
  if (!text) return null;
  const metric = [...text.matchAll(METRIC_RE)];
  const imperial = [...text.matchAll(IMPERIAL_RE)];
  if (metric.length === 0 && imperial.length === 0) return null;
  let chosen: ScaleAnnotation | null = null;
  // Imperial notation ("1/4" = 1'-0"") also matches the loose metric ratio
  // regex, so it must be tried first; it is unambiguous when present.
  if (imperial.length) {
    const m = imperial[0];
    const numerator = Number(m[1]);
    const denominator = Number(m[2]);
    if (numerator > 0 && denominator >= numerator) {
      const paperInches = numerator / denominator;
      const realInches = 12; // "… = 1'-0"" always targets one drawing foot
      chosen = {
        ratio: realInches / paperInches,
        notation: "imperial",
        sheetClassHint: null,
        matchedText: m[0].trim(),
      };
    }
  }
  if (!chosen && metric.length) {
    const m = metric[0];
    const ratio = Number(m[1]);
    if (Number.isFinite(ratio) && ratio >= 1 && ratio <= 10000) {
      const hintMatch = text.match(SHEET_HINT_RE);
      chosen = {
        ratio,
        notation: "metric-ratio",
        sheetClassHint: hintMatch
          ? hintMatch[1].toUpperCase().replace(/\s+/g, " ")
          : null,
        matchedText: m[0].trim(),
      };
    }
  }
  return chosen;
}

export interface DetectedScale {
  /** Real-world metres per PDF point at page scale 1.0. */
  metersPerPt: number;
  ratio: number;
  sheetClass: string;
  note: string;
}

/**
 * Converts a parsed scale annotation into a meters-per-point factor using the
 * physically classified sheet size. Refuses (returns null reason) when the
 * sheet size is unknown, because annotation scales only hold for the sheet
 * size they were plotted at.
 */
export function detectScaleFromSheet(params: {
  pageLongPt: number;
  annotation: ScaleAnnotation;
  sheetClass: string | null;
}): { scale: DetectedScale } | { error: string } {
  const { pageLongPt, annotation, sheetClass } = params;
  if (!Number.isFinite(pageLongPt) || pageLongPt <= 0)
    return { error: "Page geometry is not available for scale detection." };
  const cls =
    (sheetClass ?? annotation.sheetClassHint ?? "").toUpperCase().trim() ||
    null;
  const table = [...ISO_SHEETS, ...ARCH_SHEETS].find((s) => s.name === cls);
  if (!table)
    return {
      error: `The drawing declares ${annotation.matchedText} but the sheet size (${cls ?? "unclassified"}) is unknown. Annotation scales are only valid for a known physical sheet size; calibrate from a known dimension instead.`,
    };
  const longMm = table.longMm;
  const pageLongMm = pageLongPt / PT_PER_MM;
  const toleranceOk = Math.abs(pageLongMm - longMm) / longMm <= 0.05;
  if (!toleranceOk)
    return {
      error: `The declared scale ${annotation.matchedText} was plotted for a ${table.name} sheet, but this page measures about ${Math.round(pageLongMm)} mm on its long side. The annotation does not apply; calibrate from a known dimension instead.`,
    };
  // Long side of the paper spans longMm of paper, which at 1:ratio
  // represents longMm * ratio millimetres in the real world.
  const realLongM = (longMm / 1000) * annotation.ratio;
  const metersPerPt = realLongM / pageLongPt;
  const note =
    annotation.notation === "imperial"
      ? `${annotation.matchedText} on a ${table.name} sheet: 1 inch of paper represents ${Math.round(annotation.ratio)} real inches.`
      : `Scale ${annotation.matchedText} on a ${table.name} sheet: 1 mm of paper represents ${annotation.ratio} mm in the real world.`;
  return {
    scale: {
      metersPerPt,
      ratio: annotation.ratio,
      sheetClass: table.name,
      note,
    },
  };
}

export interface DimensionCandidate {
  text: string;
  meters: number;
  unit: "mm" | "m" | "ft-in";
  x: number;
  y: number;
}

const DIM_MM_RE = /^(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:mm|MM)$/;
const DIM_M_RE = /^(\d{1,4}(?:[.,]\d{1,2})?)\s*m(?:m)?\.?$/i;
const DIM_BARE_RE = /^(\d{2,6})$/;
const DIM_FTIN_RE =
  /^(\d{1,2})\s*['’]\s*-?\s*(\d{1,2})(?:\.(\d{1,2}))?\s*["”]$/;

/**
 * Extracts spatial dimension candidates from positioned page text items.
 * Only clearly dimension-shaped strings are accepted; anything ambiguous is
 * skipped rather than guessed.
 */
export function extractDimensionCandidates(
  textItems: Array<{ str: string; x: number; y: number }>,
): DimensionCandidate[] {
  const out: DimensionCandidate[] = [];
  for (const item of textItems) {
    const raw = item.str.trim();
    if (!raw || raw.length > 14) continue;
    let meters: number | null = null;
    let unit: DimensionCandidate["unit"] = "mm";
    const mm = raw.match(DIM_MM_RE);
    if (mm) {
      meters = Number(mm[1].replace(",", ".")) / 1000;
      unit = "mm";
    } else {
      const m = raw.match(DIM_M_RE);
      if (m && /m\b/i.test(raw) && !/^mm/i.test(raw.replace(/^\d/, ""))) {
        meters = Number(m[1].replace(",", "."));
        unit = "m";
      } else {
        const ftin = raw.match(DIM_FTIN_RE);
        if (ftin) {
          const feet = Number(ftin[1]);
          const inches =
            Number(ftin[2]) +
            Number(ftin[3] ?? 0) / 10 ** (ftin[3]?.length ?? 0);
          meters = (feet * 12 + inches) * 0.0254;
          unit = "ft-in";
        } else {
          const bare = raw.match(DIM_BARE_RE);
          // Bare 3-5 digit integers on drawings are millimetre dimensions.
          if (bare && raw.length >= 3 && raw.length <= 5) {
            meters = Number(raw) / 1000;
            unit = "mm";
          }
        }
      }
    }
    if (meters == null) continue;
    if (meters <= 0.01 || meters > 200) continue; // reject implausible spans
    out.push({ text: raw, meters, unit, x: item.x, y: item.y });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. ASCII DXF (CAD) document handling
// ---------------------------------------------------------------------------

export interface DxfPoint {
  x: number;
  y: number;
}

export interface DxfLine {
  start: DxfPoint;
  end: DxfPoint;
  /** Real-world length in metres. */
  lengthM: number;
}

export interface DxfPolyline {
  points: DxfPoint[];
  closed: boolean;
  /** Path length in metres (perimeter when closed). */
  lengthM: number;
  /** Enclosed area in m² when closed, else null. */
  areaM2: number | null;
}

export interface DxfParseResult {
  /** Declared drawing units label, e.g. "millimetres". */
  units: string;
  /** Factor applied to convert DXF coordinates into metres. */
  unitFactorToM: number;
  entityCounts: { line: number; polyline: number; circle: number };
  /** Coordinates converted to metres. */
  lines: DxfLine[];
  polylines: DxfPolyline[];
  /** Circles kept as centre + radius (metres). */
  circles: Array<DxfPoint & { radiusM: number }>;
  bboxM: { minX: number; minY: number; maxX: number; maxY: number } | null;
  skippedEntities: number;
  warnings: string[];
}

const DXF_UNITS: Record<number, { label: string; toM: number }> = {
  1: { label: "inches", toM: 0.0254 },
  2: { label: "feet", toM: 0.3048 },
  4: { label: "millimetres", toM: 0.001 },
  5: { label: "centimetres", toM: 0.01 },
  6: { label: "metres", toM: 1 },
  70: { label: "metres", toM: 1 }, // 70 = meters in some DXF dialects
};

const DXF_ENTITY_CAP = 20000;

function dxfFail(message: string): { error: string } {
  return { error: message };
}

/**
 * Parses an ASCII DXF (CAD) document's geometry into metre-based lines and
 * polylines, honouring the declared $INSUNITS header. Binary DXF is refused.
 * Entity counts are capped to keep parsing bounded in the browser.
 */
export function parseDxfDocument(
  raw: string,
): { dxf: DxfParseResult } | { error: string } {
  if (!raw || raw.length === 0) return dxfFail("The CAD file is empty.");
  if (raw.includes("AutoCAD Binary DXF") || raw.charCodeAt(0) === 0)
    return dxfFail(
      "Binary DXF files are not supported; export ASCII DXF from the CAD application.",
    );
  // DXF is a flat list of group-code / value pairs.
  const tokens = raw.split(/\r?\n/).map((l) => l.trim());
  if (tokens.length < 4)
    return dxfFail("The file does not contain a readable DXF pair structure.");
  let units = DXF_UNITS[4]; // DXF default unit convention is millimetres
  let unitDeclared = false;
  const rawLines: Array<{ start: DxfPoint; end: DxfPoint }> = [];
  const rawPolylines: Array<{ points: DxfPoint[]; closed: boolean }> = [];
  const rawCircles: Array<DxfPoint & { radius: number }> = [];
  let skipped = 0;
  let section = "";
  let entityType = "";
  const entityCounts = { line: 0, polyline: 0, circle: 0 };
  const totalEntities = () =>
    rawLines.length + rawPolylines.length + rawCircles.length;

  // Single pass over the pair list.
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const code = tokens[i];
    const value = tokens[i + 1];
    // Pair layout: ["0","SECTION","2","HEADER",...]; the "2 <name>" pair
    // follows the "0 SECTION" pair, so the section name is at i-1.
    if (code === "2" && tokens[i - 1] === "SECTION") {
      section = value.toUpperCase();
      continue;
    }
    if (section === "HEADER" && code === "9" && value === "$INSUNITS") {
      // The value follows as group code 70
      const nextCode = tokens[i + 2];
      const nextValue = tokens[i + 3];
      if (nextCode === "70") {
        const declared = Number(nextValue);
        const known = DXF_UNITS[declared];
        if (known) {
          units = known;
          unitDeclared = true;
        }
      }
      continue;
    }
    if (section === "ENTITIES" && code === "0") {
      entityType = value.toUpperCase();
      if (totalEntities() >= DXF_ENTITY_CAP) {
        skipped++;
        continue;
      }
      if (entityType === "LINE") {
        const parsed = readDxfLine(tokens, i + 2);
        if (parsed) {
          rawLines.push(parsed);
          entityCounts.line++;
        } else skipped++;
      } else if (entityType === "LWPOLYLINE") {
        const parsed = readDxfPolyline(tokens, i + 2);
        if (parsed) {
          rawPolylines.push(parsed);
          entityCounts.polyline++;
        } else skipped++;
      } else if (entityType === "CIRCLE") {
        const parsed = readDxfCircle(tokens, i + 2);
        if (parsed) {
          rawCircles.push(parsed);
          entityCounts.circle++;
        } else skipped++;
      }
      continue;
    }
  }
  if (totalEntities() === 0)
    return dxfFail(
      "No LINE, LWPOLYLINE or CIRCLE entities were found in the DXF ENTITIES section. The export may have been flattened to a block reference or non-geometric content.",
    );
  const toM = units.toM;
  const convertedLines: DxfLine[] = rawLines.map((l) => ({
    start: { x: l.start.x * toM, y: l.start.y * toM },
    end: { x: l.end.x * toM, y: l.end.y * toM },
    lengthM: Math.hypot(
      (l.end.x - l.start.x) * toM,
      (l.end.y - l.start.y) * toM,
    ),
  }));
  const convertedPolylines: DxfPolyline[] = rawPolylines.map((p) => {
    const pts = p.points.map((pt) => ({ x: pt.x * toM, y: pt.y * toM }));
    let lengthM = 0;
    for (let k = 0; k + 1 < pts.length; k++)
      lengthM += Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y);
    if (p.closed && pts.length > 1) {
      lengthM += Math.hypot(
        pts[0].x - pts[pts.length - 1].x,
        pts[0].y - pts[pts.length - 1].y,
      );
    }
    return {
      points: pts,
      closed: p.closed,
      lengthM,
      areaM2: p.closed ? Math.abs(shoelaceM2(pts)) : null,
    };
  });
  const convertedCircles: Array<DxfPoint & { radiusM: number }> =
    rawCircles.map((c) => ({
      x: c.x * toM,
      y: c.y * toM,
      radiusM: c.radius * toM,
    }));
  const allPts: DxfPoint[] = [];
  for (const l of convertedLines) allPts.push(l.start, l.end);
  for (const p of convertedPolylines) allPts.push(...p.points);
  for (const c of convertedCircles) allPts.push({ x: c.x, y: c.y });
  let bboxM: DxfParseResult["bboxM"] = null;
  if (allPts.length) {
    bboxM = {
      minX: Math.min(...allPts.map((p) => p.x)),
      minY: Math.min(...allPts.map((p) => p.y)),
      maxX: Math.max(...allPts.map((p) => p.x)),
      maxY: Math.max(...allPts.map((p) => p.y)),
    };
  }
  const warnings: string[] = [];
  if (!unitDeclared)
    warnings.push(
      "The DXF header does not declare $INSUNITS; drawing units were read as the DXF default (millimetres). Verify the resulting lengths before use.",
    );
  if (skipped > 0)
    warnings.push(
      `${skipped} entities were skipped: unreadable geometry or over the ${DXF_ENTITY_CAP}-entity browser safety cap.`,
    );
  if (bboxM && Number.isFinite(bboxM.maxX - bboxM.minX)) {
    const spanM = Math.max(bboxM.maxX - bboxM.minX, bboxM.maxY - bboxM.minY);
    if (spanM > 2000)
      warnings.push(
        "The drawing spans over 2 km in model space; the detected units may not match the drawing's intent.",
      );
    if (spanM < 0.5)
      warnings.push(
        "The drawing spans under 0.5 m in model space; the detected units may not match the drawing's intent.",
      );
  }
  return {
    dxf: {
      units: units.label,
      unitFactorToM: toM,
      entityCounts,
      lines: convertedLines,
      polylines: convertedPolylines,
      circles: convertedCircles,
      bboxM,
      skippedEntities: skipped,
      warnings,
    },
  };
}

function shoelaceM2(pts: DxfPoint[]): number {
  let twiceArea = 0;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % pts.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twiceArea) / 2;
}

function readDxfLine(
  tokens: string[],
  entityStart: number,
): { start: DxfPoint; end: DxfPoint } | null {
  let x1: number | null = null;
  let y1: number | null = null;
  let x2: number | null = null;
  let y2: number | null = null;
  for (let i = entityStart; i + 1 < tokens.length; i += 2) {
    const code = tokens[i];
    if (code === "0") break; // next entity begins
    const value = Number(tokens[i + 1]);
    if (code === "10") x1 = value;
    else if (code === "20") y1 = value;
    else if (code === "11") x2 = value;
    else if (code === "21") y2 = value;
  }
  if ([x1, y1, x2, y2].some((v) => v == null || !Number.isFinite(v)))
    return null;
  return { start: { x: x1!, y: y1! }, end: { x: x2!, y: y2! } };
}

function readDxfPolyline(
  tokens: string[],
  entityStart: number,
): { points: DxfPoint[]; closed: boolean } | null {
  const pts: DxfPoint[] = [];
  let closed = false;
  for (let i = entityStart; i + 1 < tokens.length; i += 2) {
    const code = tokens[i];
    if (code === "0") break;
    if (code === "70") closed = (Number(tokens[i + 1]) & 1) === 1;
    else if (code === "10") {
      const x = Number(tokens[i + 1]);
      // paired 20 arrives on the following pair
      const y = Number(tokens[i + 3]);
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
    }
  }
  if (pts.length < 2) return null;
  return { points: pts, closed };
}

function readDxfCircle(
  tokens: string[],
  entityStart: number,
): (DxfPoint & { radius: number }) | null {
  let x: number | null = null;
  let y: number | null = null;
  let r: number | null = null;
  for (let i = entityStart; i + 1 < tokens.length; i += 2) {
    const code = tokens[i];
    if (code === "0") break;
    if (code === "10") x = Number(tokens[i + 1]);
    else if (code === "20") y = Number(tokens[i + 1]);
    else if (code === "40") r = Number(tokens[i + 1]);
  }
  if ([x, y, r].some((v) => v == null || !Number.isFinite(v))) return null;
  if (r! <= 0) return null;
  return { x: x!, y: y!, radius: r! };
}

/** Converts parsed DXF geometry into takeoff marks in a normalised space. */
export function marksFromDxf(
  dxf: DxfParseResult,
  options: { category: TakeoffCategory; maxMarks?: number },
): { marks: TakeoffMark[]; skipped: number } {
  const cap = options.maxMarks ?? 2000;
  const marks: TakeoffMark[] = [];
  let skipped = 0;
  const id = () => `dxf-${marks.length + 1}`;
  for (const line of dxf.lines) {
    if (marks.length >= cap) {
      skipped++;
      continue;
    }
    marks.push({
      id: id(),
      page: 1,
      type: "linear",
      category: options.category,
      label: `DXF line ${marks.length + 1} (${line.lengthM.toFixed(2)} m)`,
      points: [
        { x: line.start.x, y: line.start.y },
        { x: line.end.x, y: line.end.y },
      ],
      quantity: line.lengthM,
      unit: "m",
      color: "#2563eb",
      notes: `Parsed from DXF LINE in ${dxf.units}.`,
    });
  }
  for (const poly of dxf.polylines) {
    if (marks.length >= cap) {
      skipped++;
      continue;
    }
    if (poly.closed) {
      marks.push({
        id: id(),
        page: 1,
        type: "area",
        category: options.category,
        label: `DXF closed polyline ${marks.length + 1} (${poly.areaM2?.toFixed(2)} m²)`,
        points: poly.points,
        quantity: poly.areaM2 ?? 0,
        unit: "m²",
        color: "#059669",
        notes: `Parsed from DXF LWPOLYLINE (closed) in ${dxf.units}.`,
      });
    } else {
      marks.push({
        id: id(),
        page: 1,
        type: "linear",
        category: options.category,
        label: `DXF polyline ${marks.length + 1} (${poly.lengthM.toFixed(2)} m)`,
        points: poly.points,
        quantity: poly.lengthM,
        unit: "m",
        color: "#2563eb",
        notes: `Parsed from DXF LWPOLYLINE in ${dxf.units}.`,
      });
    }
  }
  return { marks, skipped };
}

// ---------------------------------------------------------------------------
// 4. Direct handoff into the FRELUX takeoff calculation engines
// ---------------------------------------------------------------------------

export interface TakeoffEngineHandoff {
  linearRunsM: number;
  totalAreaM2: number;
  totalCount: number;
  byCategory: Record<string, { count: number; quantity: number; unit: string }>;
  /** Concrete slab engine results, one per qualifying area mark. */
  concreteSlabs: Array<{
    markId: string;
    areaM2: number;
    lengthM: number;
    widthM: number;
    depthM: number;
    result: ConcreteTakeoffResult;
  }>;
  notes: string[];
}

function polygonAreaM2(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  return shoelaceM2(points);
}

function polylineLengthM(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 0; i + 1 < points.length; i++)
    total += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y,
    );
  return total;
}

function bboxSidesM(
  points: { x: number; y: number }[],
): { longM: number; shortM: number } | null {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { longM: Math.max(w, h), shortM: Math.min(w, h) };
}

/**
 * Recomputes marked quantities from raw geometry and per-page scales, then
 * hands qualifying area marks straight into the concrete takeoff engine.
 * The slab depth must be supplied by the user: it is never assumed.
 */
export function buildTakeoffEngineHandoff(params: {
  marks: TakeoffMark[];
  /** Pixels per metre per page (the page calibration convention). */
  scalesByPage: Record<number, number>;
  /** Slab depth in metres; required for concrete engine handoff. */
  slabThicknessM: number;
  cementBagMassKg?: number;
}): { handoff: TakeoffEngineHandoff } | { errors: string[] } {
  const { marks, scalesByPage, slabThicknessM } = params;
  const errors: string[] = [];
  const notes: string[] = [
    "Quantities are recomputed from raw mark geometry and per-page scale calibration, not from cached mark quantities.",
  ];
  if (!Number.isFinite(slabThicknessM) || slabThicknessM <= 0)
    errors.push(
      "Slab depth must be a positive number in metres before handing area marks to the concrete engine.",
    );
  const usedPages = new Set(marks.map((m) => m.page));
  for (const p of usedPages) {
    const s = Number(scalesByPage[p]);
    if (!Number.isFinite(s) || s <= 0)
      errors.push(
        `Page ${p} has marks but no scale calibration; calibrate it before building the engine handoff.`,
      );
  }
  if (errors.length) return { errors };

  const pxPerM = (p: number) => scalesByPage[p];
  const byCategory: TakeoffEngineHandoff["byCategory"] = {};
  let linearRunsM = 0;
  let totalAreaM2 = 0;
  let totalCount = 0;
  const concreteSlabs: TakeoffEngineHandoff["concreteSlabs"] = [];

  for (const mark of marks) {
    const scale = pxPerM(mark.page);
    const quantity =
      mark.type === "linear"
        ? polylineLengthM(mark.points) / scale
        : mark.type === "area"
          ? polygonAreaM2(mark.points) / (scale * scale)
          : 1;
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push(`Mark ${mark.id} has invalid geometry and was excluded.`);
      continue;
    }
    if (mark.type === "linear") linearRunsM += quantity;
    else if (mark.type === "area") totalAreaM2 += quantity;
    else totalCount += quantity;
    const entry = byCategory[mark.category] ?? {
      count: 0,
      quantity: 0,
      unit: mark.unit,
    };
    entry.count += 1;
    entry.quantity += quantity;
    byCategory[mark.category] = entry;
  }
  if (errors.length) return { errors };

  const depth = slabThicknessM;
  const areaCategories: TakeoffCategory[] = ["paving", "general"];
  for (const mark of marks) {
    if (mark.type !== "area") continue;
    if (!areaCategories.includes(mark.category)) continue;
    const scale = pxPerM(mark.page);
    const areaM2 = polygonAreaM2(mark.points) / (scale * scale);
    const sides = bboxSidesM(
      mark.points.map((p) => ({ x: p.x / scale, y: p.y / scale })),
    );
    if (!sides || sides.longM <= 0 || sides.shortM <= 0) continue;
    const engine = calculateConcreteTakeoff({
      elementType: "slab",
      lengthM: sides.longM,
      widthM: sides.shortM,
      depthM: depth,
      cementParts: 1,
      sandParts: 2,
      aggregateParts: 4,
      wastePercent: 5,
      cementBagMassKg: params.cementBagMassKg ?? 50,
    });
    if (!engine.ok || !engine.data) {
      errors.push(
        `Area mark ${mark.id} could not be handed to the concrete engine: ${engine.errors.join(" ")}`,
      );
      continue;
    }
    if (engine.ok && engine.data) {
      concreteSlabs.push({
        markId: mark.id,
        areaM2,
        lengthM: sides.longM,
        widthM: sides.shortM,
        depthM: depth,
        result: engine.data,
      });
    }
  }
  if (errors.length) return { errors };
  notes.push(
    `Concrete slab handoff uses bounding-box length x width per area mark at a fixed ${depth} m depth and a 1:2:4 mix with 5% waste; adjust either in the concrete calculator for final numbers.`,
  );
  notes.push(
    "Area marks are approximated by their bounding rectangle for the concrete engine; the marked polygon area is reported alongside for cross-checking.",
  );
  return {
    handoff: {
      linearRunsM,
      totalAreaM2,
      totalCount,
      byCategory,
      concreteSlabs,
      notes,
    },
  };
}
