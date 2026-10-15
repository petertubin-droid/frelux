// ============================================================
// P4.18–20: FIVE-MARKET REGRESSION MATRIX (CN ID MX KR IT)
//
// The deep profiles for the five 20-mandate markets were built
// additively; this matrix pins them so none can silently
// regress to a generic fallback:
//
//   * native WALL-FINISHING profile with resolvable assemblies
//   * native ELECTRICAL + PLUMBING market profiles — the
//     resolvers fall back to a generic IEC profile for
//     unknown markets, so the matrix checks the underlying
//     RECORDS: a fallback is never acceptable coverage
//   * native CONSTRUCTION TYPOLOGY record (not the
//     multi-market shared lookup)
//   * currency registration in the international country table
//   * capability-registry honesty: whatever the registry says
//     for these markets is PINNED as-is — the test never
//     invents capability the registry does not carry
// ============================================================

import { describe, expect, it } from "vitest";
import { WALLFIN_COUNTRY_PROFILES } from "@/lib/wallfinishing/countries";
import { getAssembly } from "@/lib/wallfinishing/assemblies";
import {
  ELECTRICAL_PROFILES,
  getElectricalProfile,
} from "@/lib/estimation/electrical-profiles";
import {
  PLUMBING_PROFILES,
  getPlumbingProfile,
} from "@/lib/estimation/plumbing-profiles";
import {
  CONSTRUCTION_TYPOLOGIES,
  getConstructionTypology,
} from "@/lib/estimation/construction-typologies";
import { COUNTRY_CURRENCY } from "@/lib/international/countries";
import {
  ENGINE_CAPABILITIES,
  ALL_MARKET_CODES,
  resolveCapability,
  defaultSeedAvailability,
} from "@/lib/international/capability-registry";

const FIVE = ["CN", "ID", "MX", "KR", "IT"] as const;

const EXPECTED_CURRENCY: Record<(typeof FIVE)[number], string> = {
  CN: "CNY",
  ID: "IDR",
  MX: "MXN",
  KR: "KRW",
  IT: "EUR",
};

// A canonical deterministic finishing engine, used to pin the
// registry's honest state for these markets.
const FINISHING_ENGINE =
  ENGINE_CAPABILITIES.find(
    (e) => e.category === "finishing" && e.deterministic,
  ) ?? ENGINE_CAPABILITIES[0];

describe("P4.18 five-market regression matrix (CN ID MX KR IT)", () => {
  for (const market of FIVE) {
    describe(`${market}`, () => {
      it("has a native wall-finishing profile with resolvable assemblies", () => {
        const profile = WALLFIN_COUNTRY_PROFILES.find((p) => p.code === market);
        expect(profile).toBeDefined();
        expect(profile!.assemblyIds.length).toBeGreaterThan(0);
        expect(profile!.wallSystemIds.length).toBeGreaterThan(0);
        for (const id of profile!.assemblyIds) {
          expect(getAssembly(id)).not.toBeNull();
        }
      });

      it("has a NATIVE electrical profile record — not the IEC fallback", () => {
        expect(ELECTRICAL_PROFILES[market]).toBeDefined();
        const resolved = getElectricalProfile(market);
        expect(resolved.name).not.toContain("Local Electrical Practice");
      });

      it("has a NATIVE plumbing profile record — not the generic fallback", () => {
        expect(PLUMBING_PROFILES[market]).toBeDefined();
        const resolved = getPlumbingProfile(market);
        expect(resolved.name).not.toContain("Local Plumbing Practice");
      });

      it("has a NATIVE construction typology record", () => {
        expect(CONSTRUCTION_TYPOLOGIES[market]).toBeDefined();
        const resolved = getConstructionTypology(market);
        expect(resolved.marketCodes).toContain(market);
      });

      it("registers the correct currency internationally", () => {
        expect(COUNTRY_CURRENCY[market]).toBe(EXPECTED_CURRENCY[market]);
      });

      it("is in the 20-market mandate set", () => {
        expect(ALL_MARKET_CODES).toContain(market);
      });

      it("capability registry state is pinned honestly (no invented capability)", () => {
        // Whatever the registry says must stay consistent with
        // resolveCapability + the seed default. If the registry
        // is later extended to verify this market, the seed
        // default must flip with it.
        const verified = FINISHING_ENGINE.verifiedMarkets.includes(market);
        expect(defaultSeedAvailability(FINISHING_ENGINE.id, market)).toBe(
          verified,
        );
        const resolution = resolveCapability(FINISHING_ENGINE.id, market, null);
        if (verified) {
          expect(resolution!.state).toBe("enabled");
        } else {
          expect(resolution!.state).not.toBe("enabled");
        }
      });
    });
  }

  it("all five markets are covered by the wall-finishing e2e net", () => {
    // The all-markets e2e iterates WALLFIN_COUNTRY_PROFILES; the
    // five markets must be inside that profile list so the e2e
    // net covers them too.
    const codes = WALLFIN_COUNTRY_PROFILES.map((p) => p.code);
    for (const market of FIVE) {
      expect(codes).toContain(market);
    }
  });
});
