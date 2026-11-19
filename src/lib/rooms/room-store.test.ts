import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEVICE_ROOMS_KEY,
  MAX_DEVICE_ROOMS,
  deleteDeviceRoom,
  deviceRoomsToRows,
  listDeviceRooms,
  roomIdentity,
  saveDeviceRooms,
} from "@/lib/rooms/room-store";
import type { HouseRoomRow } from "@/types";

const row = (over: Partial<HouseRoomRow> = {}): HouseRoomRow => ({
  id: "r1",
  label: "Master bedroom",
  length: 4.2,
  width: 3.6,
  height: 2.7,
  quantity: 1,
  doors: 1,
  windows: 2,
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("device room library", () => {
  it("stores a room in metres and hands it back in the visitor's unit", () => {
    const result = saveDeviceRooms([row()], { unit: "meters", market: "NG" });
    expect(result.saved).toBe(1);
    expect(result.notice).toBe("Saved 1 room on this device.");

    const { rooms } = listDeviceRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].lengthM).toBeCloseTo(4.2, 5);
    expect(rooms[0].market).toBe("NG");
    expect(rooms[0].enteredUnit).toBe("meters");
  });

  it("converts a room entered in feet to metres, and back to feet", () => {
    saveDeviceRooms([row({ length: 14, width: 12, height: 9 })], {
      unit: "feet",
      market: "US",
    });
    const { rooms } = listDeviceRooms();
    expect(rooms[0].lengthM).toBeCloseTo(4.2672, 4);

    const rows = deviceRoomsToRows(rooms, "feet");
    expect(rows[0].length).toBeCloseTo(14, 3);
    expect(rows[0].width).toBeCloseTo(12, 3);
  });

  it("shows the same room in the other system rather than reinterpreting digits", () => {
    saveDeviceRooms([row({ length: 4.2, width: 3.6 })], {
      unit: "meters",
      market: "NG",
    });
    const rows = deviceRoomsToRows(listDeviceRooms().rooms, "feet");
    expect(rows[0].length).toBeCloseTo(13.78, 2);
  });

  it("updates a room instead of duplicating it when the trade changes", () => {
    saveDeviceRooms([row()], { unit: "meters", market: "NG" });
    saveDeviceRooms([row({ doors: 2 })], { unit: "meters", market: "NG" });
    const { rooms } = listDeviceRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].doors).toBe(2);
  });

  it("keeps genuinely different rooms apart", () => {
    saveDeviceRooms([row(), row({ id: "r2", label: "Kitchen", length: 3.1 })], {
      unit: "meters",
      market: "NG",
    });
    expect(listDeviceRooms().rooms).toHaveLength(2);
  });

  it("skips a room with no dimension and says so", () => {
    const result = saveDeviceRooms([row(), row({ id: "bad", length: 0 })], {
      unit: "meters",
    });
    expect(result.saved).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.notice).toBe(
      "Saved 1. 1 room was skipped for a missing dimension.",
    );
  });

  it("names a room that arrived without a label", () => {
    saveDeviceRooms([row({ label: "" })], {
      unit: "meters",
      labelFallback: "Bathroom",
    });
    expect(listDeviceRooms().rooms[0].label).toBe("Bathroom");
  });

  it("drops the oldest room once the ceiling is reached", () => {
    const rows = Array.from({ length: MAX_DEVICE_ROOMS + 3 }, (_, i) =>
      row({ id: `r${i}`, label: `Room ${i}`, length: 2 + i / 100 }),
    );
    const result = saveDeviceRooms(rows, { unit: "meters" });
    const { rooms } = listDeviceRooms();
    expect(rooms).toHaveLength(MAX_DEVICE_ROOMS);
    expect(result.notice).toMatch(/oldest 3 rooms were removed/);
  });

  it("deletes a room by id", () => {
    saveDeviceRooms([row()], { unit: "meters" });
    const id = listDeviceRooms().rooms[0].id;
    expect(deleteDeviceRoom(id).rooms).toHaveLength(0);
  });

  it("ignores corrupt storage instead of throwing", () => {
    window.localStorage.setItem(DEVICE_ROOMS_KEY, "{not json");
    expect(listDeviceRooms()).toEqual({ rooms: [], available: true });
  });

  it("rejects entries that are not usable rooms", () => {
    window.localStorage.setItem(
      DEVICE_ROOMS_KEY,
      JSON.stringify([
        { id: "x", label: "Broken" },
        { id: "y", label: "Ok", lengthM: 3, widthM: 2 },
      ]),
    );
    const { rooms } = listDeviceRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].label).toBe("Ok");
  });

  it("says the device is not keeping data rather than losing the rooms silently", () => {
    const real = window.localStorage;
    const refusing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    Object.defineProperty(window, "localStorage", {
      value: refusing,
      configurable: true,
    });
    try {
      const result = saveDeviceRooms([row()], { unit: "meters" });
      expect(result.saved).toBe(0);
      expect(result.notice).toMatch(/not keeping data/);
    } finally {
      Object.defineProperty(window, "localStorage", {
        value: real,
        configurable: true,
      });
    }
  });

  it("identifies a room by label and dimensions to the centimetre", () => {
    expect(roomIdentity(row(), "meters")).toBe("master bedroom|420x360");
    expect(roomIdentity(row({ length: 4.204 }), "meters")).toBe(
      roomIdentity(row(), "meters"),
    );
  });
});
