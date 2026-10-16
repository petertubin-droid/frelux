// Unit tests for the pack-aware token pricing guard.
// Pure functions only — no Deno runtime APIs involved.
import {
  configAsPack,
  pickPack,
  resolvePackPrice,
  resolveTokenPrice,
  validatePackPayment,
  type TokenPackRow,
} from "./token-pricing.ts";
import { describe, expect, it } from "vitest";

const STARTER: TokenPackRow = {
  id: 1,
  key: "value",
  name: "Value Pack",
  token_amount: 100,
  price_kobo: 500000, // ₦5,000
  is_enabled: true,
};

const LEGACY_CONFIG = {
  token_amount: 100,
  price_kobo: 500000,
  is_enabled: true,
};

const PRICE_ROWS = [
  // Modern row scoped to pack 1
  { pack_id: 1, currency_code: "USD", price_minor: 950, is_active: true },
  // Legacy row without pack_id → implicitly pack 1
  { currency_code: "GBP", price_minor: 750, is_active: true },
  // Inactive row must never be used
  { pack_id: 1, currency_code: "EUR", price_minor: 900, is_active: false },
  // A different pack's row must not leak into pack 1
  { pack_id: 2, currency_code: "USD", price_minor: 1800, is_active: true },
];

describe("configAsPack", () => {
  it("maps the legacy config row onto pack 1", () => {
    const pack = configAsPack(LEGACY_CONFIG);
    expect(pack.id).toBe(1);
    expect(pack.token_amount).toBe(100);
    expect(pack.price_kobo).toBe(500000);
    expect(pack.is_enabled).toBe(true);
  });
});

describe("resolvePackPrice", () => {
  it("resolves NGN from the pack's own naira price", () => {
    expect(resolvePackPrice(STARTER, PRICE_ROWS, "NGN")).toEqual({
      currency: "NGN",
      priceMinor: 500000,
      tokens: 100,
    });
  });

  it("resolves a configured currency from that pack's active row", () => {
    expect(resolvePackPrice(STARTER, PRICE_ROWS, "usd")).toEqual({
      currency: "USD",
      priceMinor: 950,
      tokens: 100,
    });
  });

  it("treats legacy price rows without pack_id as pack 1", () => {
    expect(resolvePackPrice(STARTER, PRICE_ROWS, "GBP")).toEqual({
      currency: "GBP",
      priceMinor: 750,
      tokens: 100,
    });
  });

  it("never uses another pack's row", () => {
    const otherPack: TokenPackRow = {
      id: 3,
      token_amount: 200,
      price_kobo: 900000,
      is_enabled: true,
    };
    // Pack 3 has no GBP row; the pack-1 GBP row must not leak in.
    expect(resolvePackPrice(otherPack, PRICE_ROWS, "GBP")).toBeNull();
  });

  it("rejects inactive rows", () => {
    expect(resolvePackPrice(STARTER, PRICE_ROWS, "EUR")).toBeNull();
  });

  it("rejects disabled packs and missing currencies", () => {
    expect(
      resolvePackPrice({ ...STARTER, is_enabled: false }, PRICE_ROWS, "NGN"),
    ).toBeNull();
    expect(resolvePackPrice(STARTER, PRICE_ROWS, "JPY")).toBeNull();
    expect(resolvePackPrice(STARTER, PRICE_ROWS, "")).toBeNull();
  });
});

describe("resolveTokenPrice (legacy wrapper)", () => {
  it("behaves like pack-1 resolution", () => {
    expect(resolveTokenPrice(LEGACY_CONFIG, PRICE_ROWS, "NGN")).toEqual(
      resolvePackPrice(configAsPack(LEGACY_CONFIG), PRICE_ROWS, "NGN"),
    );
    expect(resolveTokenPrice(LEGACY_CONFIG, PRICE_ROWS, "USD")).toEqual(
      resolvePackPrice(configAsPack(LEGACY_CONFIG), PRICE_ROWS, "USD"),
    );
  });
});

describe("pickPack", () => {
  const packs = [
    STARTER,
    { id: 2, token_amount: 50, price_kobo: 150000, is_enabled: false },
  ];
  it("defaults to pack 1 when no id is given", () => {
    expect(pickPack(packs, undefined)?.id).toBe(1);
  });
  it("rejects unknown or disabled packs", () => {
    expect(pickPack(packs, 99)).toBeNull();
    expect(pickPack(packs, 2)).toBeNull();
  });
  it("accepts a valid enabled pack", () => {
    expect(pickPack(packs, "1" as unknown as number)?.id).toBe(1);
  });
});

describe("validatePackPayment", () => {
  it("accepts an amount that matches the canonical price", () => {
    const r = validatePackPayment({
      pack: STARTER,
      priceRows: PRICE_ROWS,
      currency: "USD",
      amountPaidMajor: 9.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resolution.priceMinor).toBe(950);
      expect(r.resolution.tokens).toBe(100);
    }
  });

  it("rejects a mismatched amount (never credit a wrong charge)", () => {
    const r = validatePackPayment({
      pack: STARTER,
      priceRows: PRICE_ROWS,
      currency: "USD",
      amountPaidMajor: 1.5,
    });
    expect(r).toEqual({ ok: false, reason: "AMOUNT_MISMATCH" });
  });

  it("rejects unconfigured currencies", () => {
    const r = validatePackPayment({
      pack: STARTER,
      priceRows: PRICE_ROWS,
      currency: "JPY",
      amountPaidMajor: 1000,
    });
    expect(r).toEqual({ ok: false, reason: "TOKENS_NOT_CONFIGURED" });
  });
});
