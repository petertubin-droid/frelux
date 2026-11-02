import { describe, expect, it } from "vitest";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import {
  getRoofMarketEvidence,
  ROOF_DESIGN_MARKET_CODES,
  ROOF_MARKET_EVIDENCE,
} from "./roof-market-research";

describe("roof design market research inventory", () => {
  it("covers exactly the 20 mandate markets it researched (the 12 template-globalization markets joined the registry on 2026-10-16 without roof research; no evidence invented for them)", () => {
    // Roof research ran for the original 20 mandate markets only. The
    // 2026-10-16 globalization wave widened ALL_MARKET_CODES to 32 for
    // wall-finishing/ceiling/floor coverage; roof evidence deliberately
    // was NOT extended. The researched set must therefore be an exact,
    // deduplicated SUBSET of the registry, never the registry itself.
    const researched = ROOF_DESIGN_MARKET_CODES.slice().sort();
    expect(new Set(researched).size).toBe(20);
    expect(researched).toEqual([
      "AE",
      "AU",
      "BR",
      "CA",
      "CN",
      "DE",
      "FR",
      "GB",
      "GH",
      "ID",
      "IN",
      "IT",
      "JP",
      "KE",
      "KR",
      "MX",
      "NG",
      "SA",
      "US",
      "ZA",
    ]);
    for (const code of researched) {
      expect(ALL_MARKET_CODES).toContain(code);
    }
    // none of the 12 later template-globalization markets has roof evidence
    for (const code of ["ET", "EG", "TZ", "CI", "ES", "NL", "PL", "SE", "CH", "SG", "TR", "NZ"]) {
      expect(getRoofMarketEvidence(code)).toBeUndefined();
    }
  });

  it("does not imply any market is enabled for code-based design", () => {
    expect(ROOF_MARKET_EVIDENCE).toHaveLength(20);
    for (const entry of ROOF_MARKET_EVIDENCE) {
      expect(entry.designEnabled).toBe(false);
      expect(entry.finding.length).toBeGreaterThan(40);
    }
  });

  it("provides traceable references when a source was actually located", () => {
    expect(getRoofMarketEvidence("US")?.sourceUrl).toContain("asce.org");
    expect(getRoofMarketEvidence("NG")?.sourceUrl).toContain("fmhud.gov.ng");
    expect(getRoofMarketEvidence("GH")?.sourceUrl).toBeNull();
    expect(getRoofMarketEvidence("unknown")).toBeUndefined();
  });
});
