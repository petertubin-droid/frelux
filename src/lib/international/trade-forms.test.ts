import { describe, expect, it } from "vitest";

import {
  NG_ONLY_TRADE_FORMS,
  isNgOnlyTradeForm,
  isTradeFormValidInMarket,
  tradeFormRefusal,
} from "./trade-forms";

describe("Nigerian trade forms", () => {
  it("names the tipper delivery units and nothing else", () => {
    expect(Object.keys(NG_ONLY_TRADE_FORMS).sort()).toEqual([
      "granite-per-trip",
      "sand-per-trip",
    ]);
  });

  it("recognises the tipper slugs", () => {
    expect(isNgOnlyTradeForm("sand-per-trip")).toBe(true);
    expect(isNgOnlyTradeForm("granite-per-trip")).toBe(true);
    expect(isNgOnlyTradeForm("sand-per-m3")).toBe(false);
    expect(isNgOnlyTradeForm("cement-per-bag")).toBe(false);
    expect(isNgOnlyTradeForm(null)).toBe(false);
    expect(isNgOnlyTradeForm("")).toBe(false);
  });

  it("keeps the tipper in Nigeria and refuses it in the three focus markets", () => {
    expect(isTradeFormValidInMarket("sand-per-trip", "NG")).toBe(true);
    expect(isTradeFormValidInMarket("sand-per-trip", "US")).toBe(false);
    expect(isTradeFormValidInMarket("sand-per-trip", "GB")).toBe(false);
    expect(isTradeFormValidInMarket("granite-per-trip", "IN")).toBe(false);
  });

  it("never filters a material that only looks local", () => {
    // Concrete, sand and blocks trade in every one of these markets.
    for (const market of ["NG", "US", "GB", "AU", "IN", "DE"]) {
      expect(isTradeFormValidInMarket("sand-per-m3", market)).toBe(true);
      expect(isTradeFormValidInMarket("cement-per-bag", market)).toBe(true);
      expect(isTradeFormValidInMarket("block-per-piece", market)).toBe(true);
    }
  });

  it("does not filter when no market is given, so admin reads stay complete", () => {
    expect(isTradeFormValidInMarket("sand-per-trip", undefined)).toBe(true);
    expect(isTradeFormValidInMarket("sand-per-trip", null)).toBe(true);
    expect(isTradeFormValidInMarket("sand-per-trip", "")).toBe(true);
  });

  it("tolerates case and padding on the market code", () => {
    expect(isTradeFormValidInMarket("sand-per-trip", "ng")).toBe(true);
    expect(isTradeFormValidInMarket("sand-per-trip", " us ")).toBe(false);
  });

  it("gives a reason that names the market", () => {
    const reason = tradeFormRefusal("sand-per-trip", "GB");
    expect(reason).toContain("GB");
    expect(reason).toContain("tipper");
    expect(tradeFormRefusal("sand-per-trip", "NG")).toBeNull();
    expect(tradeFormRefusal("sand-per-m3", "GB")).toBeNull();
  });
});
