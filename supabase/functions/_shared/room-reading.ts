/**
 * Reading rooms out of a drawing, kept apart from the HTTP function so the same
 * code that runs in production is the code under test.
 *
 * A room is dropped rather than repaired when a side is missing: a room with an
 * invented side is not a measurement, and every quantity downstream would inherit
 * the invention.
 */

export interface SanitizedRoom {
  label: string;
  /** Metres, converted from the room's own stated unit. */
  lengthM: number;
  widthM: number;
  /** Wall height for this room; null when the drawing does not state one. */
  heightM: number | null;
  doors: number;
  windows: number;
  source: string;
  confidence: number;
  evidence?: string;
}

export const MAX_ROOMS = 24;
const ROOM_SIDE_MIN_M = 0.5;
const ROOM_SIDE_MAX_M = 100;
const ROOM_HEIGHT_MIN_M = 1.5;
const ROOM_HEIGHT_MAX_M = 12;

/** Unit conversion to metres, the unit every engine reads. */
export function toMeters(value: number, unit: string): number {
  switch (String(unit || "").toLowerCase()) {
    case "mm":
      return value / 1000;
    case "cm":
      return value / 100;
    case "in":
    case "inch":
    case "inches":
      return value * 0.0254;
    case "ft":
    case "feet":
    case "foot":
      return value * 0.3048;
    default:
      return value; // already metres
  }
}

function cleanLabel(raw: unknown, index: number): string {
  const text = typeof raw === "string" && raw.trim() ? raw.trim().replace(/\s+/g, " ") : "";
  if (!text) return `Room ${index + 1}`;
  return text.slice(0, 40);
}

export function sanitizeRooms(raw: unknown): { rooms: SanitizedRoom[]; dropped: number } {
  if (!Array.isArray(raw)) return { rooms: [], dropped: 0 };
  const rooms: SanitizedRoom[] = [];
  let dropped = 0;

  raw.slice(0, MAX_ROOMS).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      dropped += 1;
      return;
    }
    const row = item as Record<string, unknown>;
    const unit = typeof row.unit === "string" ? row.unit : "m";

    const side = (value: unknown): number | null => {
      const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
      if (!Number.isFinite(num) || num <= 0) return null;
      const metres = toMeters(num, unit);
      if (metres < ROOM_SIDE_MIN_M || metres > ROOM_SIDE_MAX_M) return null;
      return Math.round(metres * 1000) / 1000;
    };

    const lengthM = side(row.length);
    const widthM = side(row.width);
    if (lengthM === null || widthM === null) {
      dropped += 1;
      return;
    }

    let heightM: number | null = null;
    if (row.height !== undefined && row.height !== null && row.height !== "") {
      const rawHeight = typeof row.height === "number" ? row.height : parseFloat(String(row.height));
      if (Number.isFinite(rawHeight) && rawHeight > 0) {
        const metres = toMeters(rawHeight, unit);
        if (metres >= ROOM_HEIGHT_MIN_M && metres <= ROOM_HEIGHT_MAX_M) {
          heightM = Math.round(metres * 1000) / 1000;
        }
      }
    }

    const count = (value: unknown): number => {
      const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
      if (!Number.isFinite(num) || num < 0) return 0;
      return Math.min(50, Math.round(num));
    };

    let confidence = typeof row.confidence === "number" ? row.confidence : parseFloat(String(row.confidence ?? ""));
    if (!Number.isFinite(confidence)) confidence = 0;
    confidence = Math.max(0, Math.min(1, confidence));

    rooms.push({
      label: cleanLabel(row.label, index),
      lengthM,
      widthM,
      heightM,
      doors: count(row.doors),
      windows: count(row.windows),
      source: typeof row.source === "string" ? row.source : "inferred",
      confidence,
      evidence: typeof row.evidence === "string" ? row.evidence.slice(0, 240) : undefined,
    });
  });

  if (raw.length > MAX_ROOMS) dropped += raw.length - MAX_ROOMS;
  return { rooms, dropped };
}
