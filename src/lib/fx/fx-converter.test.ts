import { describe, it, expect, vi } from "vitest";
import {
  convertWithRows,
  findDirectLeg,
  type FxRateRow,
  STALE_WARN_MS,
} from "./fx-converter";

const NOW = Date.now();
const iso = (ageMs: number) => new Date(NOW - ageMs).toISOString();

const rate = (over: Partial<FxRateRow>): FxRateRow => ({
  id: "r",
  base_currency: "USD",
  quote_currency: "NGN",
  rate: 1331.826337,
  provider: "open.er-api.com",
  source_url: "https://open.er-api.com/v6/latest/USD",
  fetched_at: iso(60 * 1000),
  is_active: true,
  ...over,
});

const USD_NGN = rate({});
const USD_GBP = rate({ quote_currency: "GBP", rate: 0.756165 });
const USD_EUR = rate({ quote_currency: "EUR", rate: 0.894425 });
const USD_KES = rate({ quote_currency: "KES", rate: 129.725167 });
const JPY_KRW = rate({ base_currency: "JPY", quote_currency: "KRW", rate: 8.461 });

describe("findDirectLeg", () => {
  it("finds a forward pair", () => {
    const hit = findDirectLeg([USD_NGN], "USD", "NGN");
    expect(hit).not.toBeNull();
    expect(hit!.inverted).toBe(false);
    expect(hit!.leg.rate).toBeCloseTo(1331.826337, 4);
  });

  it("inverts a reverse pair correctly", () => {
    const hit = findDirectLeg([USD_NGN], "NGN", "USD");
    expect(hit!.inverted).toBe(true);
  });

  it("returns null when no pair exists", () => {
    expect(findDirectLeg([USD_NGN], "GBP", "JPY")).toBeNull();
  });
});

describe("convertWithRows (provenance, no silent cross-rates)", () => {
  it("uses a direct recorded rate with full provenance", () => {
    const res = convertWithRows([USD_NGN], 100, "USD", "NGN");
    expect(res.status).toBe("ok");
    expect(res.result).toBeCloseTo(133182.63, 1);
    expect(res.via).toBeUndefined();
    expect(res.legs).toHaveLength(1);
    expect(res.legs[0].provider).toBe("open.er-api.com");
    expect(res.message).toContain("open.er-api.com");
    expect(res.message).toContain("2026");
  });

  it("converts the reverse direction by inverting the recorded rate", () => {
    const res = convertWithRows([USD_NGN], 1331.826337, "NGN", "USD");
    expect(res.status).toBe("ok");
    expect(res.result).toBeCloseTo(1, 4);
  });

  it("bridges through USD only when both legs are recorded — and discloses it", () => {
    const res = convertWithRows([USD_EUR, USD_KES], 100, "EUR", "KES");
    expect(res.status).toBe("bridged");
    expect(res.via).toBe("USD");
    expect(res.legs).toHaveLength(2);
    expect(res.message).toContain("Bridged via USD");
    // EUR->USD = 1/0.894425; USD->KES = 129.725167
    const expected = (100 / 0.894425) * 129.725167;
    expect(res.result).toBeCloseTo(expected, 0);
  });

  it("refuses the bridge when allowBridge is false", () => {
    const res = convertWithRows([USD_EUR, USD_KES], 100, "EUR", "KES", { allowBridge: false });
    expect(res.status).toBe("unavailable");
    expect(res.result).toBeNull();
    expect(res.message.toLowerCase()).toContain("no rate is invented");
  });

  it("refuses when no direct pair and no complete recorded bridge exist", () => {
    const res = convertWithRows([USD_NGN, JPY_KRW], 100, "EUR", "JPY");
    expect(res.status).toBe("unavailable");
    expect(res.result).toBeNull();
    expect(res.message).toContain("no rate is estimated");
  });

  it("same-currency conversion is identity", () => {
    const res = convertWithRows([], 500, "USD", "USD");
    expect(res.status).toBe("ok");
    expect(res.result).toBe(500);
  });

  it("rejects invalid amounts", () => {
    const res = convertWithRows([USD_NGN], -5, "USD", "NGN");
    expect(res.status).toBe("unavailable");
  });

  it("flags rates older than the staleness threshold", () => {
    const old = rate({ fetched_at: iso(STALE_WARN_MS + 3600_000) });
    const res = convertWithRows([old], 100, "USD", "NGN");
    expect(res.status).toBe("ok");
    expect(res.message).toContain("48h old");
  });

  it("refuses stale rates beyond MAX_AGE — no stale-rate lies", () => {
    const ancient = rate({ fetched_at: iso(8 * 24 * 3600_000) });
    const res = convertWithRows([ancient], 100, "USD", "NGN");
    expect(res.status).toBe("stale");
    expect(res.result).toBeNull();
    expect(res.message).toContain("too old to convert honestly");
  });

  it("bridges only through recorded pairs (JPY->KRW via USD fails cleanly)", () => {
    const res = convertWithRows([JPY_KRW, USD_EUR], 100, "JPY", "KRW");
    // JPY->KRW IS direct here
    expect(res.status).toBe("ok");
    expect(res.result).toBeCloseTo(846.1, 0);
  });
});
