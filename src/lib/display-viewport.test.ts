/**
 * The site-wide display scale is a viewport-meta computation. These pin the
 * arithmetic against the phone in the owner's reference recording (a 412 CSS px
 * wide Android Chrome), where 50% page zoom gives a ~824 px layout.
 */
import { describe, expect, it } from "vitest";
import {
  PHONE_MAX_SHORT_EDGE,
  deviceCssShortEdge,
  deviceCssWidth,
  NEUTRAL_VIEWPORT,
  applyViewport,
  viewportContent,
} from "@/lib/display-viewport";

describe("viewportContent", () => {
  it("lays a 412px phone out at 824px for a 50% scale, as Chrome zoom does", () => {
    const v = viewportContent({ deviceWidth: 412, scalePercent: 50 });
    expect(v.scaled).toBe(true);
    expect(v.layoutWidth).toBe(824);
    expect(v.initialScale).toBe(0.5);
    expect(v.content).toContain("width=824");
    expect(v.content).toContain("initial-scale=0.5");
  });

  it("makes the layout width times the initial scale equal the device width", () => {
    for (const device of [360, 375, 390, 412, 430]) {
      for (const scalePercent of [50, 60, 70, 75, 80, 90]) {
        const v = viewportContent({ deviceWidth: device, scalePercent });
        // Edge to edge: no gutter and no horizontal overflow.
        expect(v.layoutWidth * v.initialScale).toBeCloseTo(device, 0);
      }
    }
  });

  it("widens the layout as the scale shrinks", () => {
    const widths = [90, 75, 60, 50].map(
      (scalePercent) =>
        viewportContent({ deviceWidth: 390, scalePercent }).layoutWidth,
    );
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
  });

  it("reaches the desktop breakpoint territory at 50%", () => {
    // 390 / 0.5 = 780: past md (768), which is what flips the tablet layout.
    expect(
      viewportContent({ deviceWidth: 390, scalePercent: 50 }).layoutWidth,
    ).toBeGreaterThanOrEqual(768);
  });

  it("does not scale at 100% or on a desktop-width device", () => {
    expect(
      viewportContent({ deviceWidth: 412, scalePercent: 100 }).scaled,
    ).toBe(false);
    // A tablet or desktop: short edge past the phone limit, so no scaling.
    expect(
      viewportContent({
        deviceWidth: PHONE_MAX_SHORT_EDGE + 40,
        scalePercent: 50,
      }).content,
    ).toBe(NEUTRAL_VIEWPORT);
    expect(
      viewportContent({ deviceWidth: 1440, scalePercent: 50 }).scaled,
    ).toBe(false);
  });

  it("clamps an extreme scale and still fills the screen", () => {
    const tiny = viewportContent({ deviceWidth: 412, scalePercent: 10 });
    expect(tiny.layoutWidth).toBeLessThanOrEqual(1280);
    expect(tiny.layoutWidth * tiny.initialScale).toBeCloseTo(412, 0);

    const big = viewportContent({ deviceWidth: 412, scalePercent: 125 });
    expect(big.layoutWidth).toBeGreaterThanOrEqual(320);
    expect(big.layoutWidth * big.initialScale).toBeCloseTo(412, 0);
  });

  it("falls back to the neutral viewport for unusable input", () => {
    for (const input of [
      { deviceWidth: 0, scalePercent: 50 },
      { deviceWidth: Number.NaN, scalePercent: 50 },
      { deviceWidth: 412, scalePercent: 0 },
      { deviceWidth: 412, scalePercent: -5 },
      { deviceWidth: 412, scalePercent: Number.NaN },
      { deviceWidth: 412, scalePercent: 900 },
    ]) {
      const v = viewportContent(input);
      expect(v.content, JSON.stringify(input)).toBe(NEUTRAL_VIEWPORT);
      expect(v.scaled).toBe(false);
    }
  });

  it("keeps viewport-fit=cover and never disables user zoom", () => {
    const v = viewportContent({ deviceWidth: 412, scalePercent: 50 });
    expect(v.content).toContain("viewport-fit=cover");
    expect(v.content).not.toContain("user-scalable=no");
    expect(v.content).not.toContain("maximum-scale");
  });
});

describe("deviceCssWidth", () => {
  const withScreen = (width: number, height: number, type: string): Window => {
    const win = {
      screen: { width, height, orientation: { type } },
      innerWidth: width,
    };
    return win as unknown as Window;
  };

  it("uses the phone's short edge when held upright", () => {
    expect(deviceCssWidth(withScreen(412, 915, "portrait-primary"))).toBe(412);
  });

  it("swaps to the long edge when rotated, so the layout is recomputed", () => {
    // Rotating changes the width, which is what makes the resize/orientation
    // handlers recompute the viewport instead of keeping the portrait width.
    const portrait = viewportContent({
      deviceWidth: deviceCssWidth(withScreen(412, 915, "portrait-primary")),
      scalePercent: 50,
    });
    const landscape = viewportContent({
      deviceWidth: deviceCssWidth(withScreen(412, 915, "landscape-primary")),
      deviceShortEdge: deviceCssShortEdge(
        withScreen(412, 915, "landscape-primary"),
      ),
      scalePercent: 50,
    });
    expect(portrait.layoutWidth).toBe(824);
    expect(landscape.layoutWidth).toBe(1280); // clamped, not 1830
    expect(landscape.layoutWidth).not.toBe(portrait.layoutWidth);
    // Still edge to edge after the clamp, at the wider screen width.
    expect(landscape.layoutWidth * landscape.initialScale).toBeCloseTo(915, 0);
  });
});

describe("applyViewport", () => {
  it("rewrites the existing meta tag instead of adding a second", () => {
    document.head.innerHTML = `<meta name="viewport" content="${NEUTRAL_VIEWPORT}">`;
    applyViewport("width=824, initial-scale=0.5");
    const tags = document.head.querySelectorAll('meta[name="viewport"]');
    expect(tags).toHaveLength(1);
    expect((tags[0] as HTMLMetaElement).content).toBe(
      "width=824, initial-scale=0.5",
    );
  });

  it("creates the tag when the document has none", () => {
    document.head.innerHTML = "";
    applyViewport("width=824, initial-scale=0.5");
    expect(document.head.querySelector('meta[name="viewport"]')).not.toBeNull();
  });
});
