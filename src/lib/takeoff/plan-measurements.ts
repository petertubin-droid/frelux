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
  ExtractedRoom,
  ExtractionField,
  ExtractionSource,
} from "@/lib/construction-extraction";
import { STANDARD_OPENING_M } from "@/lib/measurement/building-schedule";
import { draftsToSchedule, scheduleTotals, type AppliedBuilding } from "@/lib/measurement/building-schedule";
import type { RoomDraft } from "@/lib/measurement/building-presets";
import type { SpaceType } from "@/lib/measurement/types";

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


/** A room the form will hold: metres, with where its height came from. */
export interface PlanRoom {
  label: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  /** True when the room height was taken from the storey height, not the room. */
  heightAssumed: boolean;
  doors: number;
  windows: number;
  source: ExtractionSource;
  confidence: number;
}

export interface RoomReading {
  rooms: PlanRoom[];
  /** Rooms the drawing offered that cannot be a measurement, with the reason. */
  refused: { label: string; reason: string }[];
}

const ROOM_WORDS: { match: RegExp; type: SpaceType }[] = [
  { match: /bed/i, type: "bedroom" },
  { match: /kitchen/i, type: "kitchen" },
  { match: /bath|w\.?c\.?|toilet/i, type: "bathroom" },
  { match: /dining/i, type: "dining" },
  { match: /parlour|parlor|lounge|living|sitting/i, type: "living_room" },
  { match: /corridor|passage|hall/i, type: "corridor" },
  { match: /store|pantry/i, type: "store" },
  { match: /stair/i, type: "staircase" },
  { match: /office|study/i, type: "office" },
  { match: /garage|car ?port/i, type: "garage" },
  { match: /veranda|porch|balcony/i, type: "veranda" },
];

function spaceTypeOf(label: string): SpaceType {
  for (const entry of ROOM_WORDS) if (entry.match.test(label)) return entry.type;
  return "other";
}

/**
 * Rooms from an extraction result, or the reason a room cannot be used.
 *
 * The same rules that govern the building as a whole govern each room: a room
 * read only by eye is refused, a room whose sides are missing was already
 * dropped by the server, and a room with no stated height takes the storey
 * height and says so. Nothing is divided, averaged or shared out.
 */
export function roomsFromExtraction(
  result: ConstructionExtractionResult,
  storeyHeightM: number,
): RoomReading {
  const offered: ExtractedRoom[] = Array.isArray(result.rooms) ? result.rooms : [];
  const rooms: PlanRoom[] = [];
  const refused: { label: string; reason: string }[] = [];

  offered.forEach((room, index) => {
    const label = (room.label || `Room ${index + 1}`).trim();
    const confidence = Number.isFinite(room.confidence) ? room.confidence : 0;

    if (room.source === "visual_estimate" || confidence < MIN_READING_CONFIDENCE) {
      refused.push({
        label,
        reason: "its sides were estimated by eye rather than read from dimensions",
      });
      return;
    }

    const lengthM = Number(room.lengthM);
    const widthM = Number(room.widthM);
    if (
      !Number.isFinite(lengthM) ||
      !Number.isFinite(widthM) ||
      lengthM < MIN_M ||
      widthM < MIN_M ||
      lengthM > MAX_M ||
      widthM > MAX_M
    ) {
      refused.push({ label, reason: "its sides are not a size a room can be" });
      return;
    }

    const statedHeight = room.heightM === null ? null : Number(room.heightM);
    const usableHeight =
      statedHeight !== null && Number.isFinite(statedHeight) && statedHeight >= 1.5 && statedHeight <= 12
        ? statedHeight
        : null;

    rooms.push({
      label,
      lengthM,
      widthM,
      heightM: usableHeight ?? storeyHeightM,
      heightAssumed: usableHeight === null,
      doors: Math.max(0, Math.round(Number(room.doors) || 0)),
      windows: Math.max(0, Math.round(Number(room.windows) || 0)),
      source: room.source,
      confidence,
    });
  });

  return { rooms, refused };
}

export interface RoomReconciliation {
  roomAreaM2: number;
  footprintM2: number;
  /** Footprint the labelled rooms do not account for: circulation, not invented space. */
  unlabelledM2: number;
  /** True when the rooms exceed the footprint, which means a reading is wrong. */
  overMeasured: boolean;
  note: string;
}

/**
 * How the labelled rooms compare with the building the drawing gives.
 *
 * This never adjusts a room to make the numbers agree. It reports the difference
 * so a person can see that 38 m² of rooms sit inside a 54 m² footprint, which is a
 * corridor and a staircase the plan did not label, rather than a silent error.
 */
export function roomReconciliation(
  measurements: PlanMeasurements,
  rooms: PlanRoom[],
): RoomReconciliation {
  const footprintM2 = measurements.length.value * measurements.width.value;
  const roomAreaM2 = rooms.reduce((sum, room) => sum + room.lengthM * room.widthM, 0);
  const unlabelledM2 = footprintM2 - roomAreaM2;
  const overMeasured = unlabelledM2 < -0.01;

  const note = rooms.length
    ? overMeasured
      ? `The labelled rooms total ${roomAreaM2.toFixed(2)} m², which is more than the ${footprintM2.toFixed(2)} m² footprint. One of the readings is wrong; check the room sides against the plan.`
      : unlabelledM2 <= 0.01
        ? `The labelled rooms account for the whole ${footprintM2.toFixed(2)} m² footprint.`
        : `The labelled rooms total ${roomAreaM2.toFixed(2)} m² inside a ${footprintM2.toFixed(2)} m² footprint. The remaining ${unlabelledM2.toFixed(2)} m² is space the plan did not label, such as circulation.`
    : `No rooms were labelled, so the footprint of ${footprintM2.toFixed(2)} m² is used as one space.`;

  return { roomAreaM2, footprintM2, unlabelledM2, overMeasured, note };
}


// =========================================================
// Roof readings
// =========================================================

export type RoofShape = "gable" | "hip" | "mono_pitch" | "flat";

/** A roof as the drawing states it, ready for a roof calculator's form. */
export interface PlanRoof {
  lengthM: number;
  widthM: number;
  /** Pitch as the drawing states it, in degrees. */
  pitchDegrees: number;
  /** The same pitch in the rise per 12 that framing forms ask for. */
  risePer12: number;
  overhangM: number;
  /** Ridge length when the drawing dimensions it; null when it does not. */
  ridgeLengthM: number | null;
  shape: RoofShape | null;
  valleys: number;
  hips: number;
  documentKind: DocumentKind;
  /** Values that were not on the document, named for the person to check. */
  needsConfirmation: string[];
}

export type RoofOutcome = { ok: true; roof: PlanRoof } | { ok: false; reason: string };

const ROOF_SHAPES: Record<string, RoofShape> = {
  gable: "gable",
  hip: "hip",
  mono_pitch: "mono_pitch",
  monopitch: "mono_pitch",
  mono: "mono_pitch",
  lean_to: "mono_pitch",
  flat: "flat",
};

const MAX_PITCH_DEGREES = 75;

/**
 * Roof measurements from an extraction result, or the reason there are none.
 *
 * Pitch is taken in degrees only. A drawing that states a ratio is not read as an
 * angle here, because a rise of 1:2 is 26.57 degrees and silently treating "2" as
 * degrees understates every rafter. Overhang keeps its own range rather than the
 * room-side minimum, since 300 mm eaves are normal and 0.5 m is not the floor.
 */
export function roofFromExtraction(result: ConstructionExtractionResult): RoofOutcome {
  if (!result || !Array.isArray(result.fields) || result.fields.length === 0) {
    return { ok: false, reason: "The document produced no roof measurements." };
  }
  if (result.documentKind === "building_photo") {
    return {
      ok: false,
      reason: "A photograph cannot give roof dimensions. Read a roof plan or a section, or type them.",
    };
  }

  const fields = fieldMap(result);
  const length = readLength(fields, "building_length", "The roof length");
  if ("reason" in length) return { ok: false, reason: length.reason };
  const width = readLength(fields, "building_width", "The roof width");
  if ("reason" in width) return { ok: false, reason: width.reason };

  const needsConfirmation: string[] = [];

  // ── pitch ──
  const pitchField = fields.get("roof_pitch_degrees");
  let pitchDegrees = 0;
  if (!pitchField) {
    needsConfirmation.push("The pitch was not stated, so a flat roof (0 degrees) is set. Change it before framing.");
  } else {
    const raw = typeof pitchField.value === "number" ? pitchField.value : Number(pitchField.value);
    const unit = String(pitchField.unit ?? "").trim().toLowerCase();
    const confidence = Number.isFinite(pitchField.confidence) ? pitchField.confidence : 0;
    if (!Number.isFinite(raw) || raw < 0 || raw > MAX_PITCH_DEGREES) {
      return { ok: false, reason: `The pitch reads as ${String(pitchField.value)}, which is not an angle a roof can have.` };
    }
    if (unit && !/^(deg|degree|degrees|°|º)$/.test(unit)) {
      return {
        ok: false,
        reason: `The pitch is stated in ${unit}, not degrees. A ratio is not an angle; enter the pitch in degrees.`,
      };
    }
    if (pitchField.source === "visual_estimate" || confidence < MIN_READING_CONFIDENCE) {
      return { ok: false, reason: "The pitch was estimated by eye rather than read from the drawing." };
    }
    pitchDegrees = raw;
  }

  // ── overhang ──
  const overhangField = fields.get("roof_overhang");
  let overhangM = 0;
  if (!overhangField) {
    needsConfirmation.push("No eaves overhang was stated, so the roof is measured flush with the walls (0 m).");
  } else {
    const raw = typeof overhangField.value === "number" ? overhangField.value : Number(overhangField.value);
    if (!Number.isFinite(raw) || raw < 0 || raw > 3) {
      return { ok: false, reason: `The overhang reads as ${String(overhangField.value)} m, which is not a roof edge.` };
    }
    overhangM = raw;
  }

  // ── ridge, valleys, hips, shape ──
  const ridgeField = fields.get("ridge_length");
  let ridgeLengthM: number | null = null;
  if (ridgeField) {
    const raw = typeof ridgeField.value === "number" ? ridgeField.value : Number(ridgeField.value);
    if (Number.isFinite(raw) && raw >= MIN_M && raw <= MAX_M) ridgeLengthM = raw;
  }

  const typeField = fields.get("roof_type");
  const shapeKey = typeField ? String(typeField.value ?? "").trim().toLowerCase() : "";
  const shape = ROOF_SHAPES[shapeKey] ?? null;
  if (!shape) {
    needsConfirmation.push("The roof shape was not stated, so the calculator's own default is left in place.");
  }

  const count = (key: string): number => {
    const field = fields.get(key);
    if (!field) return 0;
    const raw = typeof field.value === "number" ? field.value : Number(field.value);
    return Number.isFinite(raw) && raw >= 0 ? Math.min(50, Math.round(raw)) : 0;
  };

  return {
    ok: true,
    roof: {
      lengthM: length.value.value,
      widthM: width.value.value,
      pitchDegrees,
      // A 30 degree pitch is a rise of 6.93 per 12; the framing form asks for the
      // rise, so the conversion is done once here rather than in every consumer.
      risePer12: Math.round(Math.tan((pitchDegrees * Math.PI) / 180) * 12 * 100) / 100,
      overhangM,
      ridgeLengthM,
      shape,
      valleys: count("valleys_count"),
      hips: count("hips_count"),
      documentKind: result.documentKind,
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
export function buildingFromMeasurements(
  m: PlanMeasurements,
  rooms: PlanRoom[] = [],
): AppliedBuilding {
  if (rooms.length > 0) {
    // Rooms are the schedule when the drawing labels them. Each room keeps its
    // own sides, so a 3.6 m kitchen is never averaged into a 4.2 m bedroom.
    const drafts: RoomDraft[] = rooms.map((room, index) => ({
      id: `plan-room-${index}`,
      spaceType: spaceTypeOf(room.label),
      label: room.label,
      length: room.lengthM,
      width: room.widthM,
      height: room.heightM,
      quantity: 1,
      doors: room.doors,
      windows: room.windows,
    }));
    const schedule = draftsToSchedule(drafts, "meters", { label: "Measured rooms" });
    return {
      schedule,
      totals: scheduleTotals(schedule),
      label: "Measured rooms",
      unit: "meters",
      drafts,
    };
  }

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
