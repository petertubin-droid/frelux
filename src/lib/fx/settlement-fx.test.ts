import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================
// SETTLEMENT FX ENGINE — Phase 1 regression guards.
//
// Roadmap gate: settlement/checkout currency conversion only
// runs with a payment provider, fee model, reconciliation
// path, exchange-rate source and legal review configured.
// Every refusal is explicit; no rate is ever invented.
// ============================================================

let configRow: Record<string, unknown> | null = null;
let fxRateRows: Record<string, unknown>[] = [];

const res = (data: unknown, error: unknown = null) =>
  ({
    then: (resolve: (v: unknown) => void, _reject?: (v: unknown) => void) =>
      Promise.resolve({ data, error }).then(resolve),
    select: () => res(data, error),
    eq: () => res(data, error),
    order: () => res(data, error),
    maybeSingle: () => res(data, error),
  }) as unknown as Promise<{ data: unknown; error: unknown }>;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "settlement_fx_config") return res(configRow);
      if (table === "fx_rates") return res(fxRateRows);
      return res(null);
    },
  },
  isSupabaseConfigured: true,
}));

import { resolveSettlementFx } from "@/lib/fx/settlement-fx";

const now = Date.now();
const fresh = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // 2h old
const stale = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8d old

const config = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  market_code: "NG",
  payment_provider: "stripe",
  charge_currency: "USD",
  settlement_currency: "USD",
  fee_pct: 2.5,
  fee_fixed: 1,
  reconciliation_path: "stripe-payouts-ng",
  rate_source: "fx_rates",
  reviewer_name: "FRELUX Legal Review",
  legal_review_date: "2026-10-01",
  next_review_date: "2027-10-01",
  is_active: true,
  ...overrides,
});

const rate = (
  base: string,
  quote: string,
  value: number,
  fetchedAt = fresh,
) => ({
  id: base + quote,
  base_currency: base,
  quote_currency: quote,
  rate: value,
  provider: "open.er-api.com",
  source_url: "https://open.er-api.com/v6/latest/USD",
  fetched_at: fetchedAt,
  is_active: true,
});

beforeEach(() => {
  configRow = null;
  fxRateRows = [];
});

describe("resolveSettlementFx — roadmap five-requirement gate", () => {
  it("refuses (not_configured) when the market has no active config", async () => {
    const r = await resolveSettlementFx({
      quoteAmount: 100000,
      quoteCurrency: "NGN",
      marketCode: "NG",
    });
    expect(r.status).toBe("not_configured");
    expect(r.convertedAmount).toBeNull();
    expect(r.message).toContain("not enabled for this market");
  });

  it("refuses (unavailable) when no recorded rate exists — never invents one", async () => {
    configRow = config();
    const r = await resolveSettlementFx({
      quoteAmount: 100000,
      quoteCurrency: "NGN",
      marketCode: "NG",
    });
    expect(r.status).toBe("unavailable");
    expect(r.appliedRate).toBeNull();
    expect(r.message).toContain("keeps its own currency");
  });

  it("converts with a direct recorded rate and applies the fee model exactly", async () => {
    configRow = config({ fee_pct: 2.5, fee_fixed: 1 });
    fxRateRows = [rate("NGN", "USD", 0.0006)];
    const r = await resolveSettlementFx({
      quoteAmount: 1000000,
      quoteCurrency: "NGN",
      marketCode: "NG",
    });
    expect(r.status).toBe("converted");
    // 1,000,000 NGN x 0.0006 = 600 USD
    expect(r.convertedAmount).toBe(600);
    // fee = 2.5% of 600 + 1 = 16
    expect(r.providerFee).toBe(16);
    expect(r.totalPayable).toBe(616);
    expect(r.appliedRate).toBe(0.0006);
    expect(r.paymentProvider).toBe("stripe");
    expect(r.reviewedBy).toBe("FRELUX Legal Review");
    expect(r.legs[0].provider).toBe("open.er-api.com");
    expect(r.message).toContain("stripe");
  });

  it("discloses an explicit recorded bridge with both legs' provenance", async () => {
    configRow = config({ settlement_currency: "EUR" });
    fxRateRows = [rate("USD", "NGN", 1550), rate("USD", "EUR", 0.92)];
    const r = await resolveSettlementFx({
      quoteAmount: 310000,
      quoteCurrency: "NGN",
      marketCode: "NG",
    });
    // 310,000 NGN -> 200 USD (via USD->NGN 1550) -> 184 EUR
    expect(r.status).toBe("converted");
    expect(r.via).toBe("USD");
    expect(r.convertedAmount).toBe(184);
    expect(r.legs).toHaveLength(2);
    expect(r.message).toContain("Bridged via USD");
  });

  it("refuses (stale) when the recorded rate is older than the converter's max age", async () => {
    configRow = config();
    fxRateRows = [rate("NGN", "USD", 0.0006, stale)];
    const r = await resolveSettlementFx({
      quoteAmount: 100000,
      quoteCurrency: "NGN",
      marketCode: "NG",
    });
    expect(r.status).toBe("stale");
    expect(r.convertedAmount).toBeNull();
    expect(r.message).toContain("too old");
  });

  it("same-currency settlement skips conversion but still applies the fee model", async () => {
    configRow = config({
      settlement_currency: "NGN",
      fee_pct: 1,
      fee_fixed: 0,
    });
    const r = await resolveSettlementFx({
      quoteAmount: 100000,
      quoteCurrency: "NGN",
      marketCode: "NG",
    });
    expect(r.status).toBe("converted");
    expect(r.appliedRate).toBe(1);
    expect(r.convertedAmount).toBe(100000);
    expect(r.providerFee).toBe(1000);
    expect(r.totalPayable).toBe(101000);
    expect(r.message).toContain("no conversion needed");
  });
});
