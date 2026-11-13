import { describe, it, expect } from "vitest";
import {
  marketHreflang,
  RENDERED_LANGUAGES,
} from "../../../scripts/lib/market-hreflang.mjs";

describe("market hreflang", () => {
  it("declares the language the page is actually written in", () => {
    // Translated markets keep their own language.
    expect(marketHreflang("DE")).toBe("de-DE");
    expect(marketHreflang("BR")).toBe("pt-BR");
    // Markets with no interface translation are served in English, and the
    // hreflang has to match the page, not the country's wish.
    expect(marketHreflang("TH")).toBe("en-TH");
    expect(marketHreflang("IT")).toBe("en-IT");
    expect(marketHreflang("KR")).toBe("en-KR");
  });

  it("never emits a bare country code", () => {
    for (const code of ["US", "GB", "NG", "JP", "SA"]) {
      expect(marketHreflang(code)).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });

  it("only declares languages the interface renders", () => {
    for (const code of [
      "DE",
      "BR",
      "IT",
      "KR",
      "TH",
      "TR",
      "SE",
      "PL",
      "DK",
      "FI",
      "NO",
    ]) {
      const lang = marketHreflang(code).split("-")[0];
      expect(RENDERED_LANGUAGES.has(lang)).toBe(true);
    }
  });
});
