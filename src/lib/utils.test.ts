import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatCurrency,
  classNames,
  feetToMeters,
  metersToFeet,
  DEFAULT_DOOR_WIDTH_M,
  DEFAULT_DOOR_HEIGHT_M,
  DEFAULT_WINDOW_WIDTH_M,
  DEFAULT_WINDOW_HEIGHT_M,
} from "@/lib/utils";

describe("formatNumber", () => {
  it("formats with default 2 fraction digits", () => {
    expect(formatNumber(1234.567)).toBe("1,234.57");
  });
  it("removes trailing zeros", () => {
    expect(formatNumber(100)).toBe("100");
  });
  it("accepts custom fraction digits", () => {
    expect(formatNumber(1234.5678, 4)).toBe("1,234.5678");
  });
  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
  it("handles negative numbers", () => {
    expect(formatNumber(-1234.5)).toBe("-1,234.5");
  });
});

describe("formatCurrency", () => {
  it("formats with default naira sign", () => {
    expect(formatCurrency(5000)).toBe("₦5,000");
  });
  it("formats with custom currency", () => {
    expect(formatCurrency(100, "$")).toBe("$100");
  });
  it("handles large numbers", () => {
    expect(formatCurrency(1500000)).toBe("₦1,500,000");
  });
  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("₦0");
  });
});

describe("classNames", () => {
  it("joins truthy classes", () => {
    expect(classNames("a", "b", "c")).toBe("a b c");
  });
  it("filters out false values", () => {
    expect(classNames("a", false, "b")).toBe("a b");
  });
  it("filters out null and undefined", () => {
    expect(classNames("a", null, "b", undefined)).toBe("a b");
  });
  it("returns empty string for no truthy args", () => {
    expect(classNames(false, null, undefined)).toBe("");
  });
});

describe("feetToMeters / metersToFeet", () => {
  it("converts feet to meters", () => {
    expect(feetToMeters(10)).toBeCloseTo(3.048, 4);
  });
  it("converts meters to feet", () => {
    expect(metersToFeet(3.048)).toBeCloseTo(10, 2);
  });
  it("round-trips correctly", () => {
    expect(metersToFeet(feetToMeters(25))).toBeCloseTo(25, 6);
  });
  it("handles zero", () => {
    expect(feetToMeters(0)).toBe(0);
    expect(metersToFeet(0)).toBe(0);
  });
});

describe("Default dimensions", () => {
  it("has correct door width", () => expect(DEFAULT_DOOR_WIDTH_M).toBe(0.8));
  it("has correct door height", () => expect(DEFAULT_DOOR_HEIGHT_M).toBe(2.4));
  it("has correct window width", () =>
    expect(DEFAULT_WINDOW_WIDTH_M).toBe(1.2));
  it("has correct window height", () =>
    expect(DEFAULT_WINDOW_HEIGHT_M).toBe(1.2));
});
