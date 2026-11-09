/**
 * Room context geometry for the console elevation.
 *
 * These pin the rules stated at the top of media-context.ts: a 16:9 screen
 * from its diagonal, a band that starts at the console top, member pitch for
 * flutes and slats, and the floor detail each mounting implies. Every number
 * here is checkable arithmetic, not a rendering preference.
 */
import { describe, expect, it } from "vitest";
import {
  buildMediaContext,
  screenFromDiagonal,
  SCREEN_CLEARANCE_MM,
} from "@/lib/tv-console/media-context";

describe("screenFromDiagonal", () => {
  it("sizes a 16:9 screen from its diagonal in millimetres", () => {
    const screen = screenFromDiagonal(65)!;
    // 65 in = 1651 mm diagonal; 16:9 gives 1439 x 809 mm.
    expect(screen.widthMm).toBeCloseTo(1439.1, 0);
    expect(screen.heightMm).toBeCloseTo(809.6, 0);
    // The diagonal still checks out.
    expect(Math.hypot(screen.widthMm, screen.heightMm) / 25.4).toBeCloseTo(
      65,
      1,
    );
  });

  it("returns null for no screen rather than a zero-size one", () => {
    expect(screenFromDiagonal(0)).toBeNull();
    expect(screenFromDiagonal(-10)).toBeNull();
    expect(screenFromDiagonal(Number.NaN)).toBeNull();
  });
});

describe("buildMediaContext", () => {
  const base = { widthMm: 2400, heightMm: 400 };

  it("centres the screen and lifts it clear of the console top", () => {
    const room = buildMediaContext({ ...base, tvInches: 65 });
    expect(room.screen).not.toBeNull();
    expect(room.screen!.xMm + room.screen!.widthMm / 2).toBeCloseTo(1200, 1);
    expect(room.screen!.yMm + room.screen!.heightMm).toBeCloseTo(
      -SCREEN_CLEARANCE_MM,
      1,
    );
  });

  it("starts the panelled band at the console top and rises the entered height", () => {
    const room = buildMediaContext({
      ...base,
      wallTreatment: "fluted",
      wallPanelHeightMm: 1600,
    });
    expect(room.wall).not.toBeNull();
    expect(room.wall!.yMm).toBeCloseTo(-1600, 1);
    expect(room.wall!.heightMm).toBeCloseTo(1600, 1);
    expect(room.wall!.widthMm).toBeCloseTo(2400, 1);
  });

  it("draws no band when the treatment is none even if a height is given", () => {
    const room = buildMediaContext({
      ...base,
      wallTreatment: "none",
      wallPanelHeightMm: 1600,
    });
    expect(room.wall).toBeNull();
    expect(room.members).toEqual([]);
  });

  it("pitches flutes tighter than slats", () => {
    const fluted = buildMediaContext({
      ...base,
      wallTreatment: "fluted",
      wallPanelHeightMm: 1200,
    });
    const slatted = buildMediaContext({
      ...base,
      wallTreatment: "slatted",
      wallPanelHeightMm: 1200,
    });
    expect(fluted.members.length).toBeGreaterThan(slatted.members.length);
    // 2400 mm at a 90 mm pitch is 26 flutes; at 150 mm it is 16.
    expect(fluted.members).toHaveLength(26);
    expect(slatted.members).toHaveLength(16);
  });

  it("gives stone and marble a vein pair instead of members", () => {
    const room = buildMediaContext({
      ...base,
      wallTreatment: "stone",
      wallPanelHeightMm: 1200,
    });
    expect(room.members).toEqual([]);
    expect(room.veins).toHaveLength(2);
    // Book-matched: both veins meet at the centre of the face.
    expect(room.veins[0][2]).toBeCloseTo(1200, 1);
    expect(room.veins[1][2]).toBeCloseTo(1200, 1);
  });

  it("shows a shadow gap for floating, a plinth for plinth, legs for legs", () => {
    const floating = buildMediaContext({ ...base, mounting: "floating" });
    expect(floating.shadowGapMm).toBeGreaterThan(0);
    expect(floating.plinthHeightMm).toBe(0);
    expect(floating.legs).toEqual([]);

    const plinth = buildMediaContext({ ...base, mounting: "plinth" });
    expect(plinth.plinthHeightMm).toBeGreaterThan(0);
    expect(plinth.shadowGapMm).toBe(0);

    // A short unit stands on two legs; past 1800 mm a centre leg is added so
    // the span cannot sag. 2400 mm therefore gets three.
    const legs = buildMediaContext({
      widthMm: 1600,
      heightMm: 400,
      mounting: "legs",
    });
    expect(legs.legs).toHaveLength(2);
    const long = buildMediaContext({ ...base, mounting: "legs" });
    expect(long.legs).toHaveLength(3);
    expect(legs.shadowGapMm).toBe(0);
    // A third leg appears once the unit is long enough to sag.
    const wide = buildMediaContext({
      widthMm: 2600,
      heightMm: 400,
      mounting: "legs",
    });
    expect(wide.legs).toHaveLength(3);
  });

  it("places the LED line along the underside of the band", () => {
    const room = buildMediaContext({
      ...base,
      wallTreatment: "marble",
      wallPanelHeightMm: 1600,
      ledProfileMetres: 2.6,
    });
    expect(room.led).not.toBeNull();
    expect(room.led!.yMm).toBeCloseTo(0, 1);
    expect(room.led!.widthMm).toBeCloseTo(2400, 1);
    const withoutLed = buildMediaContext({
      ...base,
      wallTreatment: "marble",
      wallPanelHeightMm: 1600,
    });
    expect(withoutLed.led).toBeNull();
  });

  it("grows the drawn extent to hold the tallest thing on the wall", () => {
    const room = buildMediaContext({
      widthMm: 2400,
      heightMm: 400,
      tvInches: 85,
      wallTreatment: "fluted",
      wallPanelHeightMm: 2100,
    });
    // Band top (-2100) is the highest point; floor detail is lowest.
    expect(room.totalHeightMm).toBeGreaterThan(2500);
    expect(room.totalWidthMm).toBeGreaterThanOrEqual(2400);
  });
});
