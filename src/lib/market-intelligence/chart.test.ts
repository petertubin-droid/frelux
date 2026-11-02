import { describe, expect, it } from "vitest";
import {
  buildCandleGeometry,
  buildLineGeometry,
  buildScale,
  formatCompactNumber,
  formatPercent,
  percentChange,
  toCsv,
} from "./chart";

describe("buildScale", () => {
  it("pads a real range so the line never touches the frame", () => {
    const scale = buildScale([10, 20]);
    expect(scale.min).toBeLessThan(10);
    expect(scale.max).toBeGreaterThan(20);
    expect(scale.normalise(10)).toBeGreaterThan(0);
    expect(scale.normalise(20)).toBeLessThan(1);
  });

  it("keeps a flat series visible instead of dividing by zero", () => {
    const scale = buildScale([100, 100, 100]);
    expect(scale.max).toBeGreaterThan(scale.min);
    expect(scale.normalise(100)).toBeCloseTo(0.5, 5);
  });

  it("survives an empty series", () => {
    const scale = buildScale([]);
    expect(scale.normalise(5)).toBe(0.5);
  });
});

describe("buildLineGeometry", () => {
  const series = [
    { ts: "2026-01-01", value: 100 },
    { ts: "2026-02-01", value: 120 },
    { ts: "2026-03-01", value: 90 },
  ];

  it("maps the first point left and the last point right", () => {
    const g = buildLineGeometry(series, 300, 120);
    expect(g.points[0].x).toBeCloseTo(8, 1);
    expect(g.points[2].x).toBeCloseTo(292, 1);
    expect(g.linePath.startsWith("M")).toBe(true);
    expect(g.linePath).toContain("L");
    expect(g.areaPath.endsWith("Z")).toBe(true);
  });

  it("puts a higher value higher on the canvas", () => {
    const g = buildLineGeometry(series, 300, 120);
    expect(g.points[1].y).toBeLessThan(g.points[0].y);
  });

  it("centres a single point", () => {
    const g = buildLineGeometry([{ ts: "2026-01-01", value: 5 }], 200, 100);
    expect(g.points[0].x).toBeCloseTo(100, 1);
  });

  it("emits nothing for an empty series", () => {
    const g = buildLineGeometry([], 200, 100);
    expect(g.points).toHaveLength(0);
    expect(g.areaPath).toBe("");
  });
});

describe("buildCandleGeometry", () => {
  const candles = [
    { ts: "2026-01-01", open: 100, high: 110, low: 95, close: 105 },
    { ts: "2026-01-02", open: 105, high: 108, low: 98, close: 99 },
  ];

  it("draws the wick beyond the body", () => {
    const [first] = buildCandleGeometry(candles, 200, 100);
    expect(first.wickTop).toBeLessThanOrEqual(first.bodyTop);
    expect(first.wickBottom).toBeGreaterThanOrEqual(first.bodyBottom);
  });

  it("marks direction from open against close", () => {
    const [up, down] = buildCandleGeometry(candles, 200, 100);
    expect(up.rising).toBe(true);
    expect(down.rising).toBe(false);
  });

  it("handles an empty series", () => {
    expect(buildCandleGeometry([], 200, 100)).toHaveLength(0);
  });
});

describe("number formatting", () => {
  it("computes percent change and refuses a zero base", () => {
    expect(percentChange(100, 110)).toBeCloseTo(10, 6);
    expect(percentChange(0, 110)).toBeNull();
    expect(percentChange(null, 110)).toBeNull();
  });

  it("formats percentages with sign and an em dash for missing data", () => {
    expect(formatPercent(1.234)).toBe("+1.23%");
    expect(formatPercent(-1.2)).toBe("-1.20%");
    expect(formatPercent(null)).toBe("—");
  });

  it("formats market caps compactly", () => {
    expect(formatCompactNumber(2_500_000_000_000)).toBe("2.50T");
    expect(formatCompactNumber(1_500_000)).toBe("1.50M");
    expect(formatCompactNumber(null)).toBe("—");
  });

  it("quotes csv cells that contain commas or quotes", () => {
    expect(toCsv(["a", "b"], [["x,y", 'he said "no"']])).toBe(
      'a,b\n"x,y","he said ""no"""',
    );
  });
});
