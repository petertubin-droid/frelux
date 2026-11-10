import { describe, expect, it } from "vitest";
// The production reader, imported by the edge function itself. Same file, so a
// change here cannot drift from what runs.
import { MAX_ROOMS, sanitizeRooms, toMeters } from "../../../supabase/functions/_shared/room-reading.ts";

describe("the room reader that runs in production", () => {
  it("converts a millimetre room by its own unit", () => {
    const { rooms, dropped } = sanitizeRooms([
      { label: "Kitchen", length: 3600, width: 2800, height: 3000, unit: "mm", doors: 1, windows: 1 },
    ]);
    expect(dropped).toBe(0);
    expect(rooms[0]).toMatchObject({ label: "Kitchen", lengthM: 3.6, widthM: 2.8, heightM: 3 });
  });

  it("drops a room with one side rather than inventing the other", () => {
    const { rooms, dropped } = sanitizeRooms([
      { label: "Bedroom", length: 4, unit: "m" },
      "not an object",
    ]);
    expect(rooms).toEqual([]);
    expect(dropped).toBe(2);
  });

  it("drops a side that cannot be a room, and an area offered as a side", () => {
    const { rooms, dropped } = sanitizeRooms([
      { label: "Hall", length: 400, width: 3 },
      { label: "Store", length: 0, width: 3 },
    ]);
    expect(rooms).toEqual([]);
    expect(dropped).toBe(2);
  });

  it("leaves an impossible room height unset instead of clamping it into range", () => {
    const { rooms } = sanitizeRooms([{ label: "Loft", length: 4, width: 3, height: 0.8, unit: "m" }]);
    expect(rooms[0].heightM).toBeNull();
  });

  it("names an unnamed room by its position", () => {
    const { rooms } = sanitizeRooms([{ length: 4, width: 3 }, { label: "   ", length: 4, width: 3 }]);
    expect(rooms.map((r) => r.label)).toEqual(["Room 1", "Room 2"]);
  });

  it("caps the room count and reports what it dropped", () => {
    const many = Array.from({ length: MAX_ROOMS + 3 }, (_, i) => ({ label: `R${i}`, length: 4, width: 3 }));
    const { rooms, dropped } = sanitizeRooms(many);
    expect(rooms).toHaveLength(MAX_ROOMS);
    expect(dropped).toBe(3);
  });

  it("holds confidence and opening counts inside their range", () => {
    const { rooms } = sanitizeRooms([
      { label: "Den", length: 4, width: 3, confidence: 4, doors: -2, windows: 900 },
    ]);
    expect(rooms[0].confidence).toBe(1);
    expect(rooms[0].doors).toBe(0);
    expect(rooms[0].windows).toBe(50);
  });

  it("reads feet and inches at the standard factors", () => {
    expect(toMeters(1, "ft")).toBeCloseTo(0.3048, 8);
    expect(toMeters(1, "in")).toBeCloseTo(0.0254, 8);
    const { rooms } = sanitizeRooms([{ label: "Room", length: 13, width: 10, unit: "ft" }]);
    expect(rooms[0].lengthM).toBeCloseTo(3.962, 3);
  });
});
