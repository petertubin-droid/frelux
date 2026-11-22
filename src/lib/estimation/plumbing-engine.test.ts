/**
 * Plumbing engine conformance (services audit 1, ledger #23).
 *
 * Expectations come from the standards the engine names: WSFU fixture ratings
 * from IPC Table E103.3(2), a 1.8 m/s velocity ceiling from BS EN 806-3, and
 * the honesty contract in the file header.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLUMBING_RULES,
  calculatePlumbing,
  calculatePlumbingEngineeringMetrics,
  type PlumbingInput,
} from "./plumbing-engine";

const metrics = (over: Partial<PlumbingInput> = {}) =>
  calculatePlumbingEngineeringMetrics({
    taps: 0,
    wcs: 0,
    showers: 0,
    sinks: 0,
    floor_drains: 0,
    ...over,
  } as never);

const input = (over: Partial<PlumbingInput> = {}): PlumbingInput => ({
  taps: 0,
  wcs: 0,
  showers: 0,
  sinks: 0,
  floor_drains: 0,
  water_storage_tanks: 0,
  pumps: 0,
  cold_run_m: null,
  hot_run_m: null,
  waste_run_m: null,
  drainage_run_m: null,
  labour: { mode: "none" },
  ...over,
});

describe("WSFU ratings (IPC Table E103.3(2))", () => {
  it("rates each fixture at its published value", () => {
    expect(metrics({ taps: 1 }).total_wsfu).toBe(1);
    expect(metrics({ sinks: 1 }).total_wsfu).toBe(1.5);
    expect(metrics({ showers: 1 }).total_wsfu).toBe(2);
    expect(metrics({ wcs: 1 }).total_wsfu).toBe(2.5);
    // A floor drain is a drainage fixture and carries no supply demand.
    expect(metrics({ floor_drains: 5 }).total_wsfu).toBe(0);
  });

  it("sums fixtures additively", () => {
    // 2 taps (2) + 1 sink (1.5) + 1 shower (2) + 1 WC (2.5) = 8.0
    expect(metrics({ taps: 2, sinks: 1, showers: 1, wcs: 1 }).total_wsfu).toBe(
      8,
    );
  });
});

describe("peak demand and header sizing", () => {
  it("never returns a flow for zero fixtures", () => {
    const m = metrics();
    expect(m.total_wsfu).toBe(0);
    expect(m.peak_flow_lps).toBe(0);
    expect(m.peak_flow_lpm).toBe(0);
  });

  it("increases monotonically with fixture count", () => {
    const small = metrics({ wcs: 2 }).peak_flow_lps;
    const big = metrics({ wcs: 40 }).peak_flow_lps;
    expect(big).toBeGreaterThan(small);
  });

  it("keeps the chosen pipe at or under the 1.8 m/s velocity ceiling", () => {
    for (const wcs of [1, 3, 10, 40, 200]) {
      const m = metrics({ wcs });
      const area = Math.PI * Math.pow(m.recommended_header_bore_mm / 2000, 2);
      const velocity = m.peak_flow_lps / 1000 / area;
      if (m.header_adequate) {
        expect(velocity).toBeLessThanOrEqual(1.81);
      } else {
        // Flagged short: the largest bore is named and the caller is told.
        expect(m.recommended_header_bore_mm).toBe(73.2);
      }
    }
  });

  it("reports the header as short when demand exceeds the largest bore", () => {
    const m = metrics({ wcs: 4000, taps: 4000, showers: 4000 });
    expect(m.header_adequate).toBe(false);
    // The largest listed size is still named rather than a made-up pipe.
    expect(m.recommended_header_bore_mm).toBe(73.2);
  });

  it("sizes a single WC at the smallest listed pipe", () => {
    const m = metrics({ wcs: 1 });
    // 2.5 WSFU is 0.50 L/s, which needs an 18.8 mm bore at 1.8 m/s, so the
    // 13.2 mm pipe is too small and 21.2 mm is the first size that holds it.
    expect(m.recommended_header_bore_mm).toBe(21.2);
    expect(m.header_adequate).toBe(true);
  });

  it("provides 24h storage for at least two people", () => {
    // 150 L per person per day, and an empty house still stores for two.
    expect(metrics().water_storage_litres_24h).toBe(300);
    const busy = metrics({ wcs: 2, showers: 2 });
    // (2+2) x 2.5 = 10 people x 150 L
    expect(busy.water_storage_litres_24h).toBe(1500);
  });
});

describe("material quantities", () => {
  it("sizes a cold run with no waste exactly", () => {
    const r = calculatePlumbing(
      input({ taps: 2, cold_run_m: 40 }),
      DEFAULT_PLUMBING_RULES,
      {},
    );
    const cold = r.lines.find((l) => l.key === "pipe_cold");
    expect(cold?.quantity).toBe(40);
    expect(cold?.quantity_source).toBe("user_derived");
  });

  it("applies pipe waste to every sized run", () => {
    const r = calculatePlumbing(
      input({ taps: 1, cold_run_m: 40 }),
      { ...DEFAULT_PLUMBING_RULES, pipe_waste_pct: 10 },
      {},
    );
    const cold = r.lines.find((l) => l.key === "pipe_cold");
    // 40 x 1.10 = 44 m, and the count is whole metres.
    expect(cold?.quantity).toBe(44);
    expect(Number.isInteger(cold?.quantity ?? 0)).toBe(true);
  });

  it("leaves a blank run unsized and names it, rather than assuming a length", () => {
    const r = calculatePlumbing(
      input({ taps: 2, cold_run_m: null, waste_run_m: 20 }),
      DEFAULT_PLUMBING_RULES,
      {},
    );
    const cold = r.lines.find((l) => l.key === "pipe_cold");
    expect(cold?.quantity ?? null).toBeNull();
    expect(cold?.quantity_source).toBe("missing");
    expect(r.missing.join(" ")).toMatch(/cold/i);
    expect(r.incomplete).toBe(true);
  });

  it("omits hot water when no hot run is given, without blocking the totals", () => {
    // Defect found in this audit: hot water was pushed as a 'missing'
    // measurement, so every cold-only building was permanently incomplete and
    // withheld its grand total, contradicting the engine's own contract.
    const r = calculatePlumbing(
      input({ taps: 1, cold_run_m: 30, hot_run_m: null }),
      DEFAULT_PLUMBING_RULES,
      {},
    );
    expect(r.lines.find((l) => l.key === "pipe_hot")).toBeUndefined();
    expect(r.missing.join(" ")).not.toMatch(/hot/i);
    expect(r.warnings.join(" ")).toMatch(/Hot water pipe is not included/);
  });

  it("never invents a price", () => {
    const r = calculatePlumbing(
      input({ taps: 1, cold_run_m: 30 }),
      DEFAULT_PLUMBING_RULES,
      {},
    );
    const priced = r.lines.filter((l) => l.quantity !== null);
    expect(priced.every((l) => l.line_total === null)).toBe(true);
    expect(r.grand_total ?? null).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/PRICE NOT CONFIGURED/i);
  });
});
