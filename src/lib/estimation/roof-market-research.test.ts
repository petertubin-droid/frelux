import { describe, expect, it } from "vitest";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import {
  getRoofMarketEvidence,
  ROOF_DESIGN_MARKET_CODES,
  ROOF_MARKET_EVIDENCE,
} from "./roof-market-research";

describe("roof design market research inventory", () => {
  it("covers exactly the 20 markets configured in FRELUX", () => {
    const configuredCodes = BUILTIN_MARKET_PROFILES.map(
      ({ country_code }) => country_code,
    ).sort();
    expect(ROOF_DESIGN_MARKET_CODES.slice().sort()).toEqual(configuredCodes);
    expect(new Set(ROOF_DESIGN_MARKET_CODES).size).toBe(20);
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
