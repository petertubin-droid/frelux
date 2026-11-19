/**
 * Rooms that follow the visitor between trades.
 *
 * A room's dimensions do not change because the trade changed: the same 4.2 x
 * 3.6 m bedroom is painted, tiled and rendered. Until now every calculator kept
 * its own room rows, so a visitor retyped the same house four times and the
 * second trade knew nothing about the first.
 *
 * Rooms are stored on the device, in metres, with the market and the display
 * unit they were entered in recorded beside them. Metres are the canonical
 * measure so a room entered in feet on a US visit still feeds a metric
 * calculator correctly; the recorded unit exists so the interface can show the
 * visitor the number they actually typed, and the market exists so a room can
 * be labelled with where it was measured.
 */

import type { HouseRoomRow, Unit } from "@/types";
import { metersToUnit } from "@/lib/estimation/multi-unit";

export const DEVICE_ROOMS_KEY = "frelux_rooms_v1";

/** A generous ceiling that keeps a runaway list out of the storage quota. */
export const MAX_DEVICE_ROOMS = 50;

export interface DeviceRoom {
  id: string;
  label: string;
  /** Canonical dimensions in metres. */
  lengthM: number;
  widthM: number;
  heightM: number;
  doors: number;
  windows: number;
  quantity: number;
  /** The market the room was measured in, or null when it was unknown. */
  market: string | null;
  /** The unit the visitor typed the dimensions in. */
  enteredUnit: Unit;
  savedAt: string;
}

export interface DeviceRoomsRead {
  rooms: DeviceRoom[];
  /** False when this browser has no usable storage (private mode, quota). */
  available: boolean;
}

export interface DeviceRoomsWrite {
  saved: number;
  skipped: number;
  /** Plain sentence when the write could not keep everything. */
  notice: string;
}

/**
 * The device store, or null when there is none.
 *
 * There is deliberately no write probe: a probe cannot tell a quota failure
 * from a private-mode refusal, and pretending it can would put a wrong reason in
 * front of the visitor. A failed write is caught where it happens and described
 * as what it is.
 */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Metres from whatever unit the visitor was working in. */
function toMeters(value: number, unit: Unit): number {
  if (!Number.isFinite(value)) return 0;
  switch (unit) {
    case "feet":
      return value * 0.3048;
    case "inches":
      return value * 0.0254;
    case "centimeters":
      return value / 100;
    case "millimeters":
      return value / 1000;
    case "meters":
    default:
      return value;
  }
}

function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** Reads the library, ignoring anything that is not a usable room. */
export function listDeviceRooms(): DeviceRoomsRead {
  const store = storage();
  if (!store) return { rooms: [], available: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(store.getItem(DEVICE_ROOMS_KEY) ?? "[]");
  } catch {
    return { rooms: [], available: true };
  }
  if (!Array.isArray(parsed)) return { rooms: [], available: true };
  const rooms = parsed.filter((entry): entry is DeviceRoom => {
    if (!entry || typeof entry !== "object") return false;
    const room = entry as Partial<DeviceRoom>;
    return (
      typeof room.id === "string" &&
      typeof room.label === "string" &&
      isFinitePositive(room.lengthM) &&
      isFinitePositive(room.widthM)
    );
  });
  return { rooms, available: true };
}

/**
 * Saves room rows, replacing an entry that describes the same room.
 *
 * Identity is the label plus the dimensions to the centimetre: a visitor who
 * recalculates the same bedroom in another trade updates that room instead of
 * collecting five copies of it.
 */
export function saveDeviceRooms(
  rows: HouseRoomRow[],
  options: { market?: string | null; unit: Unit; labelFallback?: string },
): DeviceRoomsWrite {
  const store = storage();
  if (!store) {
    return {
      saved: 0,
      skipped: rows.length,
      notice:
        "This browser is not keeping data, so rooms cannot be saved on this device. Sign in to keep rooms across devices.",
    };
  }
  const existing = listDeviceRooms().rooms;
  const now = new Date().toISOString();
  let skipped = 0;

  const usable = rows.filter((row) => {
    const ok = isFinitePositive(row.length) && isFinitePositive(row.width);
    if (!ok) skipped += 1;
    return ok;
  });

  const next = [...existing];
  for (const row of usable) {
    const record: DeviceRoom = {
      id: roomIdentity(row, options.unit),
      label: row.label?.trim() || options.labelFallback || "Room",
      lengthM: toMeters(row.length, options.unit),
      widthM: toMeters(row.width, options.unit),
      heightM: isFinitePositive(row.height)
        ? toMeters(row.height, options.unit)
        : 0,
      doors: Number.isFinite(row.doors) ? row.doors : 0,
      windows: Number.isFinite(row.windows) ? row.windows : 0,
      quantity: isFinitePositive(row.quantity) ? row.quantity : 1,
      market: options.market ?? null,
      enteredUnit: options.unit,
      savedAt: now,
    };
    const at = next.findIndex((room) => room.id === record.id);
    if (at >= 0) next[at] = record;
    else next.push(record);
  }

  // Newest first, then trimmed to the ceiling so the oldest rooms fall off
  // rather than the save failing outright.
  const ordered = next
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
    .slice(0, MAX_DEVICE_ROOMS);

  try {
    store.setItem(DEVICE_ROOMS_KEY, JSON.stringify(ordered));
  } catch {
    return {
      saved: 0,
      skipped: rows.length,
      notice:
        "This device is not keeping data, so the rooms were not saved. Sign in to keep rooms across devices.",
    };
  }

  const dropped = Math.max(0, next.length - ordered.length);
  return {
    saved: usable.length,
    skipped,
    notice:
      dropped > 0
        ? `Saved. The oldest ${dropped} room${dropped === 1 ? " was" : "s were"} removed to stay within ${MAX_DEVICE_ROOMS} rooms on this device.`
        : skipped > 0
          ? `Saved ${usable.length}. ${skipped} room${skipped === 1 ? " was" : "s were"} skipped for a missing dimension.`
          : `Saved ${usable.length} room${usable.length === 1 ? "" : "s"} on this device.`,
  };
}

/** A stable key for "the same room", in metres to the centimetre. */
export function roomIdentity(row: HouseRoomRow, unit: Unit): string {
  const cm = (value: number) => Math.round(toMeters(value, unit) * 100);
  const label = (row.label ?? "").trim().toLowerCase();
  return `${label}|${cm(row.length)}x${cm(row.width)}`;
}

export function deleteDeviceRoom(id: string): DeviceRoomsRead {
  const store = storage();
  const { rooms, available } = listDeviceRooms();
  if (!store) return { rooms, available: false };
  const next = rooms.filter((room) => room.id !== id);
  try {
    store.setItem(DEVICE_ROOMS_KEY, JSON.stringify(next));
  } catch {
    return { rooms, available };
  }
  return { rooms: next, available: true };
}

/**
 * Converts stored rooms back into calculator rows in the visitor's unit.
 *
 * The unit is the one the current calculator is working in, not the one the
 * room was entered in: a visitor who switched to feet gets feet, and the number
 * is a conversion rather than a reinterpretation of the same digits.
 */
export function deviceRoomsToRows(
  rooms: DeviceRoom[],
  unit: Unit,
): HouseRoomRow[] {
  return rooms.map((room) => ({
    id: room.id,
    label: room.label,
    length: round(metersToUnit(room.lengthM, unit)),
    width: round(metersToUnit(room.widthM, unit)),
    height:
      room.heightM > 0 ? round(metersToUnit(room.heightM, unit)) : undefined,
    quantity: room.quantity || 1,
    doors: room.doors || 0,
    windows: room.windows || 0,
  }));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
