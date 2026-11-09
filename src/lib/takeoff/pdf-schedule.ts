/**
 * Plan PDF to schedule.
 *
 * Vector PDFs carry their annotations as positioned text, not as geometry with
 * meaning. This module reads those text items, groups them into lines by their
 * position on the page, and hands each line to the dimension reader.
 *
 * What it does not do: it does not infer a scale, does not measure polylines and
 * does not claim a room is a rectangle because it looks like one. A dimension
 * printed on the sheet is evidence; a line on the sheet is not, until somebody
 * calibrates it.
 *
 * Confidence is reported per candidate:
 *   high   the label sits on the same line as the dimensions
 *   medium the label was taken from the line above or below
 *   low    no label was found and the dimension stands alone
 */

import type { LengthUnit, RoomInput, ScheduleInput } from "./types";
import { parseDimensions } from "./dimensions";

/** The subset of a pdfjs text item this module needs. */
export interface PdfTextItem {
  str?: string;
  transform?: number[];
}

export interface TextLine {
  page: number;
  text: string;
  x: number;
  y: number;
}

export interface ScheduleCandidate {
  id: string;
  label: string;
  length: number;
  width: number;
  unit: LengthUnit;
  raw: string;
  page: number;
  evidence: string;
  confidence: "high" | "medium" | "low";
  notes: string[];
}

export interface ScheduleReaderResult {
  candidates: ScheduleCandidate[];
  /** Dimensions too small to be a room, kept as labelled evidence. */
  openings: { raw: string; label: string; page: number }[];
  /** Scale notes printed on the sheet, reported but never applied. */
  scaleNotes: string[];
  pagesRead: number;
  /** True when no page carried any readable text, meaning a scanned plan. */
  scanned: boolean;
}

interface Positioned {
  str: string;
  x: number;
  y: number;
}

const LINE_TOLERANCE_PT = 3;
const LABEL_ABOVE_PT = 30;
const LABEL_BELOW_PT = 18;
/** A room side below this is treated as an opening, not a room dimension. */
const MIN_ROOM_SIDE_M = 1.2;
/** A room side above this is not a room on a domestic or commercial sheet. */
const MAX_ROOM_SIDE_M = 60;

/**
 * Groups positioned text into lines. Two items share a line when their baseline
 * is within the tolerance, which is why the tolerance is a parameter rather
 * than a magic number buried in the sort.
 */
export function clusterTextItems(
  items: PdfTextItem[],
  page = 1,
  tolerance: number = LINE_TOLERANCE_PT,
): TextLine[] {
  const positioned: Positioned[] = items
    .map((item) => {
      const transform = item.transform ?? [];
      return {
        str: (item.str ?? "").trim(),
        x: Number(transform[4] ?? 0),
        y: Number(transform[5] ?? 0),
      };
    })
    .filter((item) => item.str.length > 0);

  positioned.sort((a, b) => b.y - a.y || a.x - b.x);

  const groups: { page: number; y: number; x: number; parts: Positioned[] }[] =
    [];
  for (const item of positioned) {
    const current = groups[groups.length - 1];
    if (current && Math.abs(current.y - item.y) <= tolerance) {
      current.parts.push(item);
      continue;
    }
    groups.push({ page, y: item.y, x: item.x, parts: [item] });
  }

  return groups.map((line) => {
    const parts = [...line.parts].sort((a, b) => a.x - b.x);
    return {
      page: line.page,
      y: line.y,
      x: parts[0]?.x ?? 0,
      text: parts
        .map((part) => part.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    };
  });
}

const SCALE_RE = /\b1\s*:\s*\d{1,4}\b/;

const looksLikeLabel = (text: string): boolean => {
  const stripped = text.replace(/[\d.,×x*\s-]/gi, "");
  // A label needs a word: "BEDROOM 1" survives, "3600 4200" does not.
  return stripped.length >= 3 && /[A-Za-z]{3}/.test(text);
};

/**
 * Strips the dimension itself from a label, and any number carrying a unit, but
 * keeps the room number: "BEDROOM 1 3600 x 4200" is BEDROOM 1, not BEDROOM.
 */
const cleanLabel = (text: string, dimensionRaw?: string): string => {
  let out = text;
  if (dimensionRaw) out = out.split(dimensionRaw).join(" ");
  return out
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|ft|in)\b/gi, " ")
    .replace(/[×x*]/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:,-]+|[\s:,-]+$/g, "")
    .trim();
};

/**
 * Reads room candidates out of one page of lines. The label search is
 * deliberately narrow: same line, then the nearest line above, then the nearest
 * line below. Anything further away is another room's label.
 */
export function readScheduleFromLines(
  lines: TextLine[],
): Omit<ScheduleReaderResult, "pagesRead" | "scanned"> {
  const candidates: ScheduleCandidate[] = [];
  const openings: { raw: string; label: string; page: number }[] = [];
  const scaleNotes: string[] = [];

  const sorted = [...lines].sort((a, b) => a.page - b.page || b.y - a.y);

  for (const [index, line] of sorted.entries()) {
    const scale = line.text.match(SCALE_RE);
    if (scale && !scaleNotes.includes(scale[0])) scaleNotes.push(scale[0]);

    const parsed = parseDimensions(line.text);
    if (!parsed.pairs.length) continue;

    for (const pair of parsed.pairs) {
      const onLineLabel = cleanLabel(line.text, pair.raw);
      const notes: string[] = [];
      if (pair.unitInferred) {
        notes.push("Unit read from magnitude, not from the sheet.");
      }

      let label = looksLikeLabel(onLineLabel) ? onLineLabel : "";
      let confidence: ScheduleCandidate["confidence"] = label ? "high" : "low";
      let evidence = line.text;

      if (!label) {
        const above = sorted
          .filter(
            (other) =>
              other.page === line.page &&
              other.y > line.y &&
              other.y - line.y <= LABEL_ABOVE_PT &&
              looksLikeLabel(other.text) &&
              !parseDimensions(other.text).pairs.length,
          )
          .sort((a, b) => a.y - b.y)[0];
        const below = sorted
          .filter(
            (other) =>
              other.page === line.page &&
              other.y < line.y &&
              line.y - other.y <= LABEL_BELOW_PT &&
              looksLikeLabel(other.text) &&
              !parseDimensions(other.text).pairs.length,
          )
          .sort((a, b) => b.y - a.y)[0];
        const neighbour = above ?? below;
        if (neighbour) {
          label = cleanLabel(neighbour.text);
          confidence = "medium";
          evidence = `${neighbour.text} / ${line.text}`;
          notes.push(
            above
              ? "Label read from the line above the dimensions."
              : "Label read from the line below the dimensions.",
          );
        }
      }

      const smallest = Math.min(pair.length, pair.width);
      const largest = Math.max(pair.length, pair.width);

      if (smallest < MIN_ROOM_SIDE_M) {
        openings.push({
          raw: pair.raw,
          label: label || "Unlabelled opening",
          page: line.page,
        });
        continue;
      }
      if (largest > MAX_ROOM_SIDE_M) {
        notes.push(
          "Dimension is beyond any room on a normal sheet and was kept for review.",
        );
      }

      candidates.push({
        id: `cand-${line.page}-${Math.round(line.y)}-${Math.round(pair.length * 1000)}-${index}`,
        label: label || `Room on page ${line.page}`,
        length: pair.length,
        width: pair.width,
        unit: "m",
        raw: pair.raw,
        page: line.page,
        evidence,
        confidence,
        notes,
      });
    }
  }

  return {
    candidates: dedupe(candidates),
    openings,
    scaleNotes,
  };
}

const dedupe = (candidates: ScheduleCandidate[]): ScheduleCandidate[] => {
  const seen = new Set<string>();
  const out: ScheduleCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.page}|${candidate.label.toLowerCase()}|${candidate.length}|${candidate.width}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
};

/**
 * Builds rooms from accepted candidates. A dimension pair describes a rectangle,
 * so each room gets four walls: two of its length and two of its width. The wall
 * height is not on a plan, so it is passed in and flagged when it is missing.
 */
export function roomsFromCandidates(
  candidates: ScheduleCandidate[],
  wallHeight: number,
): RoomInput[] {
  return candidates.map((candidate, index) => {
    const heightKnown = Number.isFinite(wallHeight) && wallHeight > 0;
    const height = heightKnown ? wallHeight : 0;
    const assume = !heightKnown;
    const wall = (id: string, length: number) => ({
      id,
      label: `${candidate.label} wall`,
      length,
      height,
      unit: "m" as LengthUnit,
      assumed: assume,
    });
    const base = `pdf-${candidate.page}-${index}-${Math.round(candidate.length * 100)}`;
    return {
      id: `room-${base}`,
      label: candidate.label,
      walls: [
        wall(`wall-${base}-1`, candidate.length),
        wall(`wall-${base}-2`, candidate.length),
        wall(`wall-${base}-3`, candidate.width),
        wall(`wall-${base}-4`, candidate.width),
      ],
      floor: {
        id: `floor-${base}`,
        length: candidate.length,
        width: candidate.width,
        unit: "m" as LengthUnit,
        assumed: false,
      },
    } satisfies RoomInput;
  });
}

export const scheduleFromCandidates = (
  candidates: ScheduleCandidate[],
  wallHeight: number,
): ScheduleInput => ({
  id: `imported-${Date.now()}`,
  label: "Imported from plan",
  rooms: roomsFromCandidates(candidates, wallHeight),
});

/**
 * pdfjs 6 needs Iterator helpers, which arrived in Chrome 122 and Node 22. An
 * older browser fails with a bare ReferenceError, which would read as "your PDF
 * is broken" when the truth is the browser. This turns that into the truth.
 */
export const pdfReadFailureMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (
    /Iterator|not defined/i.test(message) &&
    error instanceof ReferenceError
  ) {
    return "This browser cannot read PDF plans in place. Update the browser, or type the room dimensions.";
  }
  if (/password/i.test(message)) {
    return "This PDF is password protected, so it cannot be read.";
  }
  return message || "The plan could not be read.";
};

/**
 * Reads every page of a PDF through pdfjs. Imported lazily so the reader is not
 * in the initial bundle, and so this module stays testable without a worker.
 */
export async function extractScheduleFromPdf(
  file: File,
): Promise<ScheduleReaderResult> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) })
      .promise;

    const lines: TextLine[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items as unknown as PdfTextItem[];
      lines.push(...clusterTextItems(items, pageNumber));
    }

    const read = readScheduleFromLines(lines);
    const scanned = !lines.some((line) => line.text.trim().length > 0);

    return { ...read, pagesRead: doc.numPages, scanned };
  } catch (error) {
    throw new Error(pdfReadFailureMessage(error));
  }
}
