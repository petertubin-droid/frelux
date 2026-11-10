/**
 * Turning an extracted plan into measurements a form can hold.
 *
 * The extraction layer reads a drawing and reports what it found, with the unit
 * and the evidence for each value. Nothing here decides how much material a
 * building needs: this module converts, refuses and hands over the same numbers
 * the user could have typed, and the deterministic engines take it from there.
 *
 * Refusal is a first class outcome. A photograph cannot give dimensions, a
 * drawing without a height cannot produce wall area, and a value the reader had
 * to guess by eye is not a measurement. Each of those returns a reason instead of
 * a number, so no form is ever filled with an invented figure.
 */
import type {
  ConstructionExtractionResult,
  DocumentKind,
  ExtractionField,
  ExtractionSource,
} from "@/lib/construction-extraction";
import { STANDARD_OPENING_M } from "@/lib/measurement/building-schedule";
import { draftsToSchedule, scheduleTotals, type AppliedBuilding } from "@/lib/measurement/building-schedule";
import type { RoomDraft } from "@/lib/measurement/building-presets";

/** One measurement as the form will hold it: metres, and where it came from. */
export interface MeasuredValue {
  value: number;
  /** The unit the document used, kept so the evidence can be shown as read. */
  unit: string;
  rawValue: number;
  source: ExtractionSource;
  confidence: number;
  evidence?: string;
}

export interface PlanMeasurements {
  documentKind: DocumentKind;
  length: MeasuredValue;
  width: MeasuredValue;
  /** Floor to floor height, the height wall area is measured over. */
  storeyHeight: MeasuredValue;
  storeys: { value: number; assumed: boolean };
  doors: { count: number; widthM: number; heightM: number; assumedSize: boolean };
  windows: { count: number; widthM: number; heightM: number; assumedSize: boolean };
  /** Values a person must still check: read by eye, or assumed. */
  needsConfirmation: string[];
}

export type MeasurementOutcome =
  | { ok: true; measurements: PlanMeasurements }
  | { ok: false; reason: string };

/** Below this, a drawing value is treated as unread rather than accepted. */
export const MIN_READING_CONFIDENCE = 0.55;
const MIN_M = 0.5;
const MAX_M = 400;

/**
 * Unit spellings the reader may return, with the factor to metres. Centimetres
 * are accepted here even though no engine takes them, because a drawing may state
 * them; they are converted on the way in.
 */
const UNIT_FACTOR: Record<string, number> = {
  m: 1,
  metre: 1,
  metres: 1,
  meter: 1,
  meters: 1,
  mm: 0.001,
  millimetre: 0.001,
  millimetres: 0.001,
  millimeter: 0.001,
  millimeters: 0.001,
  cm: 0.01,
  centimetre: 0.01,
  centimetres: 0.01,
  ft: 0.3048,
  foot: 0.3048,
  feet: 0.3048,
  in: 0.0254,
  inch: 0.0254,
  inches: 0.0254,
};

function fieldMap(result: ConstructionExtractionResult): Map<string, ExtractionField> {
  const map = new Map<string, ExtractionField>();
  for (const field of result.fields) map.set(field.key, field);
  return map;
}

function lengthUnit(of: ExtractionField): { unit: string; factor: number } | null {
  const unit = String(of.unit ?? "").trim().toLowerCase();
  if (!unit) return null;
  const factor = UNIT_FACTOR[unit];
  return factor === undefined ? null : { unit, factor };
}

/**
 * A length in metres, or the reason it is not one. The unit comes from the
 * extraction field and is never assumed: a bare "3.5" from a millimetre drawing
 * is 3.5 mm, and calling it metres is how a wall becomes 1400 times too tall.
 */
function readLength(
  fields: Map<string, ExtractionField>,
  key: string,
  label: string,
): { value: MeasuredValue } | { reason: string } {
  const field = fields.get(key);
  if (!field) return { reason: `${label} is not on this document.` };

  const raw = typeof field.value === "number" ? field.value : Number(field.value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return { reason: `${label} could not be read as a positive number.` };
  }

  const read = lengthUnit(field);
  if (!read) return { reason: `${label} has no unit on this document.` };

  const metres = raw * read.factor;
  if (!Number.isFinite(metres) || metres < MIN_M || metres > MAX_M) {
    return { reason: `${label} reads as ${metres.toFixed(2)} m, which is outside what a building can be.` };
  }

  const confidence = Number.isFinite(field.confidence) ? field.confidence : 0;
  if (field.source === "visual_estimate" || confidence < MIN_READING_CONFIDENCE) {
    return {
      reason: `${label} was estimated by eye rather than read from a dimension, so it cannot fill the form.`,
    };
  }

  return {
    value: {
      value: metres,
      unit: read.unit,
      rawValue: raw,
      source: field.source,
      confidence,
      evidence: field.evidence,
    },
  };
}

function readCount(fields: Map<string, ExtractionField>, key: string): number | null {
  const field = fields.get(key);
  if (!field) return null;
  const n = typeof field.value === "number" ? field.value : Number(field.value);
  if (!Number.isFinite(n) || n < 0 || n > 500) return null;
  return Math.round(n);
}

/**
 * Measurements from an extraction result, or the reason they cannot be taken.
 *
 * A photograph is refused outright: its "dimensions" are a guess scaled from a
 * door, and a guess is not a measurement. Text descriptions are refused for the
 * same reason unless they carry explicit dimensions, which the reader records as
 * text_description with a unit, so those are read normally.
 */
export function measurementsFromExtraction(
  result: ConstructionExtractionResult,
): MeasurementOutcome {
  if (!result || !Array.isArray(result.fields) || result.fields.length === 0) {
    return { ok: false, reason: "The document produced no measurements." };
  }
  if (result.documentKind === "building_photo") {
    return {
      ok: false,
      reason:
        "A photograph cannot give dimensions. Read a plan or a section, or type the measurements.",
    };
  }

  const fields = fieldMap(result);
  const needsConfirmation: string[] = [];

  const length = readLength(fields, "building_length", "The building length");
  if ("reason" in length) return { ok: false, reason: length.reason };
  const width = readLength(fields, "building_width", "The building width");
  if ("reason" in width) return { ok: false, reason: width.reason };
  const height = readLength(fields, "floor_to_floor_height", "The storey height");
  if ("reason" in height) return { ok: false, reason: height.reason };

  const storeyCount = readCount(fields, "number_of_floors");
  const storeys = storeyCount && storeyCount >= 1 ? storeyCount : 1;
  if (storeyCount === null) {
    needsConfirmation.push("The number of floors was not on the document, so one floor is assumed.");
  }

  const doorWidth = readLength(fields, "door_width", "The door width");
  const doorHeight = readLength(fields, "door_height", "The door height");
  const windowWidth = readLength(fields, "window_width", "The window width");
  const windowHeight = readLength(fields, "window_height", "The window height");

  // An unread opening size is not silently invented: the standard size is used
  // and named, so the deduction can be corrected before anything is priced.
  const doorSize =
    "value" in doorWidth && "value" in doorHeight
      ? { widthM: doorWidth.value.value, heightM: doorHeight.value.value, assumed: false }
      : { widthM: STANDARD_OPENING_M.door.width, heightM: STANDARD_OPENING_M.door.height, assumed: true };
  if (doorSize.assumed) needsConfirmation.push("Door size was not stated, so 0.9 m by 2.1 m is used.");

  const windowSize =
    "value" in windowWidth && "value" in windowHeight
      ? { widthM: windowWidth.value.value, heightM: windowHeight.value.value, assumed: false }
      : { widthM: STANDARD_OPENING_M.window.width, heightM: STANDARD_OPENING_M.window.height, assumed: true };
  if (windowSize.assumed) needsConfirmation.push("Window size was not stated, so 1.2 m by 1.5 m is used.");

  const doors = readCount(fields, "doors_count") ?? 0;
  const windows = readCount(fields, "windows_count") ?? 0;
  if (readCount(fields, "doors_count") === null && readCount(fields, "windows_count") === null) {
    needsConfirmation.push("No openings were counted on the document, so none are deducted.");
  }

  return {
    ok: true,
    measurements: {
      documentKind: result.documentKind,
      length: length.value,
      width: width.value,
      storeyHeight: height.value,
      storeys: { value: storeys, assumed: storeyCount === null },
      doors: { count: doors, widthM: doorSize.widthM, heightM: doorSize.heightM, assumedSize: doorSize.assumed },
      windows: {
        count: windows,
        widthM: windowSize.widthM,
        heightM: windowSize.heightM,
        assumedSize: windowSize.assumed,
      },
      needsConfirmation,
    },
  };
}

/**
 * The measured building the shared store holds, built from those measurements.
 *
 * One envelope space per storey: the drawing gave the overall length, width and
 * height, not where the partitions fall, so the schedule models the envelope the
 * document actually describes. Partition wall lengths are never inferred.
 */
export function buildingFromMeasurements(m: PlanMeasurements): AppliedBuilding {
  const drafts: RoomDraft[] = [
    {
      id: "plan-envelope",
      spaceType: "other",
      label: "Building envelope",
      // The store keeps its drafts in metres here; the unit travels with them.
      length: m.length.value,
      width: m.width.value,
      height: m.storeyHeight.value,
      quantity: m.storeys.value,
      doors: m.doors.count,
      windows: m.windows.count,
    },
  ];

  const schedule = draftsToSchedule(drafts, "meters", { label: "Building envelope" });
  return {
    schedule,
    totals: scheduleTotals(schedule),
    label: "Building envelope",
    unit: "meters",
    drafts,
  };
}
