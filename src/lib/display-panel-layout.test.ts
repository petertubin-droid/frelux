/**
 * Placement maths for the display-settings panel.
 *
 * The panel is portalled outside the zoomed #root and carries its own zoom, so
 * these assert the round trip: an element-space value multiplied by the zoom
 * lands on the visual position a user should see.
 */
import { describe, expect, it } from "vitest";
import { panelGeometry } from "@/lib/display-panel-layout";

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

describe("panelGeometry", () => {
  it("renders the panel at the width it asks for, after zoom", () => {
    const g = panelGeometry({
      trigger: { left: 100, bottom: 60 },
      viewport: desktop,
      scalePercent: 50,
    });
    // 320 visual pixels wide, expressed in the panel's own half-scale space.
    expect(g.zoom).toBe(0.5);
    expect(g.width * g.zoom).toBeCloseTo(320, 5);
  });

  it("lands the panel under its trigger at any scale", () => {
    for (const scalePercent of [50, 75, 100, 125]) {
      const g = panelGeometry({
        trigger: { left: 240, bottom: 64 },
        viewport: desktop,
        scalePercent,
      });
      expect(g.zoom).toBeCloseTo(scalePercent / 100, 5);
      expect(g.left * g.zoom).toBeCloseTo(240, 5);
      expect(g.top * g.zoom).toBeCloseTo(72, 5); // bottom + 8 gap
    }
  });

  it("keeps the panel inside the viewport on a phone", () => {
    const g = panelGeometry({
      trigger: { left: 350, bottom: 700 },
      viewport: phone,
      scalePercent: 50,
    });
    // Never wider than the viewport allows, never off the right edge.
    expect(g.width * g.zoom).toBeLessThanOrEqual(phone.width - 16);
    expect((g.left + g.width) * g.zoom).toBeLessThanOrEqual(phone.width);
    expect((g.top + g.maxHeight) * g.zoom).toBeLessThanOrEqual(phone.height);
    expect(g.top * g.zoom).toBeGreaterThanOrEqual(0);
  });

  it("does not exceed the space above the bottom edge for a long panel", () => {
    const g = panelGeometry({
      trigger: { left: 20, bottom: 820 },
      viewport: phone,
      scalePercent: 50,
    });
    expect(g.top * g.zoom + g.maxHeight * g.zoom).toBeLessThanOrEqual(
      phone.height - 8,
    );
  });

  it("falls back to a neutral zoom for an unusable scale", () => {
    for (const scalePercent of [0, -50, Number.NaN, 400]) {
      const g = panelGeometry({
        trigger: { left: 10, bottom: 10 },
        viewport: desktop,
        scalePercent,
      });
      expect(g.zoom).toBe(1);
      expect(Number.isFinite(g.left)).toBe(true);
      expect(Number.isFinite(g.width)).toBe(true);
    }
  });

  it("positions sensibly before a trigger has been measured", () => {
    const g = panelGeometry({
      trigger: null,
      viewport: desktop,
      scalePercent: 50,
    });
    expect(g.left * g.zoom).toBeGreaterThanOrEqual(0);
    expect(g.top * g.zoom).toBeGreaterThanOrEqual(0);
  });
});
