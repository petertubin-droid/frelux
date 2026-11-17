import { describe, expect, it } from "vitest";
import { calculatePlumbingEngineeringMetrics } from "./plumbing-engine";

/**
 * The header is sized on the bore that holds 1.8 m/s at the Hunter peak demand,
 * and the tool used to stop its pipe table at 63 mm. Any demand above that was
 * quietly given a 63 mm header and a sentence saying the next standard pipe had
 * been chosen, so a building whose peak needed 44 mm of bore was told a nominal
 * 2 inch main satisfied the velocity limit when it did not.
 *
 * The table now runs to 110 mm, and where even that is short the result says so
 * instead of describing the largest size as adequate.
 */
const demand = (taps: number, wcs = 0, showers = 0, sinks = 0) =>
  calculatePlumbingEngineeringMetrics({
    taps,
    wcs,
    showers,
    sinks,
    floor_drains: 0,
  } as never);

describe("plumbing header sizing", () => {
  it("keeps the small sizes where they were", () => {
    // 6 taps and 2 sinks is 9 WSFU: 0.25 x 9^0.75 = 1.37 L/s, needing 31.1 mm,
    // so the 50 mm PPR at 33.2 mm bore is the first that holds 1.8 m/s.
    const m = demand(6, 0, 0, 2);
    expect(m.total_wsfu).toBeCloseTo(9, 2);
    expect(m.required_bore_mm).toBeGreaterThan(26.6);
    expect(m.required_bore_mm).toBeLessThanOrEqual(33.2);
    expect(m.recommended_header_bore_mm).toBeCloseTo(33.2, 6);
    expect(m.header_adequate).toBe(true);
  });

  it("no longer caps at 63 mm for a demand that needs more", () => {
    // 33.5 WSFU peaks at 2.76 L/s, which needs 44.2 mm of bore at 1.8 m/s. The
    // old table ended at 42.0 mm and recommended it anyway.
    const m = demand(11, 4, 4, 3);
    expect(m.recommended_header_bore_mm).toBeGreaterThan(42.0);
    expect(m.recommended_header_bore_mm).toBeCloseTo(50.0, 6);
    expect(m.recommended_header_pipe_label).toMatch(/75 mm PPR/);
    expect(m.recommended_header_bore_mm).toBeGreaterThanOrEqual(
      m.required_bore_mm,
    );
    expect(m.header_adequate).toBe(true);
  });

  it("states that the largest size is short rather than calling it adequate", () => {
    const m = demand(300);
    expect(m.required_bore_mm).toBeGreaterThan(73.2);
    expect(m.recommended_header_bore_mm).toBeCloseTo(73.2, 6);
    expect(m.header_adequate).toBe(false);
  });

  it("holds the velocity limit whenever it calls the header adequate", () => {
    for (const taps of [1, 5, 10, 20, 40, 80, 150]) {
      const m = demand(taps);
      if (!m.header_adequate) continue;
      const areaM2 = (Math.PI * (m.recommended_header_bore_mm / 1000) ** 2) / 4;
      const velocity = m.peak_flow_lps / 1000 / areaM2;
      expect(velocity, `${taps} taps`).toBeLessThanOrEqual(1.8 + 1e-9);
    }
  });
});
