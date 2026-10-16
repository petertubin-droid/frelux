import { describe, it, expect } from "vitest";
import {
  resolveMarketRoomUnit,
  resolveMarketAreaUnit,
  ROOM_DIM_DEFAULTS,
  DOOR_DIM_DEFAULTS,
  WINDOW_DIM_DEFAULTS,
} from "../room-unit-defaults";

const mk = (marketCode: string, system: string, unit: string) =>
  ({
    marketCode,
    measurementSystem: system,
    defaultLengthUnit: unit,
  }) as never;

describe("resolveMarketRoomUnit", () => {
  it("preserves each page's legacy default for NG", () => {
    const ng = mk("NG", "mixed", "meters");
    expect(resolveMarketRoomUnit(ng, "feet")).toBe("feet");
    expect(resolveMarketRoomUnit(ng, "meters")).toBe("meters");
  });

  it("gives imperial markets feet (US/CA)", () => {
    expect(resolveMarketRoomUnit(mk("US", "imperial", "feet"), "meters")).toBe(
      "feet",
    );
    expect(resolveMarketRoomUnit(mk("CA", "imperial", "feet"), "meters")).toBe(
      "feet",
    );
  });

  it("gives metric markets meters (DE/FR/JP/KE/...)", () => {
    for (const code of ["DE", "FR", "JP", "KE", "ZA", "GB", "AU", "IN"]) {
      expect(resolveMarketRoomUnit(mk(code, "metric", "meters"), "feet")).toBe(
        "meters",
      );
    }
  });

  it("maps an inches-preferring market to feet for the room selector", () => {
    expect(resolveMarketRoomUnit(mk("XX", "mixed", "inches"), "meters")).toBe(
      "feet",
    );
  });
});

describe("resolveMarketAreaUnit", () => {
  const mkArea = (marketCode: string, system: string, unit: string) =>
    ({
      marketCode,
      measurementSystem: system,
      defaultAreaUnit: unit,
    }) as never;

  it("preserves each page's legacy default for NG", () => {
    expect(resolveMarketAreaUnit(mkArea("NG", "mixed", "sqm"), "m2")).toBe(
      "m2",
    );
  });

  it("gives imperial and sqft-preferring markets square feet", () => {
    expect(resolveMarketAreaUnit(mkArea("US", "imperial", "sqft"), "m2")).toBe(
      "ft2",
    );
    expect(resolveMarketAreaUnit(mkArea("XX", "metric", "sqft"), "m2")).toBe(
      "ft2",
    );
  });

  it("gives metric markets square metres (DE/FR/JP/KE/...)", () => {
    for (const code of ["DE", "FR", "JP", "KE", "ZA", "GB", "AU", "IN"]) {
      expect(resolveMarketAreaUnit(mkArea(code, "metric", "sqm"), "m2")).toBe(
        "m2",
      );
    }
  });

  it("falls back to the legacy default on a missing market", () => {
    expect(resolveMarketAreaUnit(null, "m2")).toBe("m2");
    expect(resolveMarketAreaUnit({} as never, "m2")).toBe("m2");
  });
});

describe("scale-matched dimension defaults", () => {
  it("feet defaults are feet-scale and meter defaults are meter-scale", () => {
    const f = ROOM_DIM_DEFAULTS.feet;
    const m = ROOM_DIM_DEFAULTS.meters;
    expect(f.length).toBeGreaterThanOrEqual(8);
    expect(f.length).toBeLessThan(15);
    expect(m.length).toBeLessThan(f.length);
    expect(m.height).toBeLessThan(3);
    expect(DOOR_DIM_DEFAULTS.meters.width).toBeLessThan(
      DOOR_DIM_DEFAULTS.feet.width,
    );
    expect(WINDOW_DIM_DEFAULTS.meters.width).toBeLessThan(
      WINDOW_DIM_DEFAULTS.feet.width,
    );
  });
});
