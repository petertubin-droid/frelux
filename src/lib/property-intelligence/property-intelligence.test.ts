/**
 * Property Intelligence, architecture tests.
 * Location resolution, market data/comparables, risk flags, provenance.
 * Guarantees: no Nigerian fallback, no guessing, no fabricated comparables.
 */

import { describe, it, expect } from "vitest";
import {
  resolveRegionalContext,
  evaluateComparables,
  isVerifiedTransaction,
  askingPricePer,
  transactionPricePer,
  evaluatePropertyRisks,
  validatePropertyProfile,
  provenanceClass,
  type PropertyListing,
  type PropertyProfile,
} from "./index";

// =========================================================
// Fixtures
// =========================================================

function makeProfile(overrides: Partial<PropertyProfile> = {}): PropertyProfile {
  return {
    id: "prop-1",
    location: { country: "NG", city: "Lagos", address: "12 Example Road" },
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function makeListing(overrides: Partial<PropertyListing> = {}): PropertyListing {
  return {
    id: "l-1",
    propertyType: "detached",
    country: "NG",
    region: "Lagos",
    city: "Lagos",
    askingPrice: { amount: 50_000_000, currency: "NGN" },
    landSize: { value: 500, unit: "m²" },
    buildingSize: { value: 220, unit: "m²" },
    observedAt: new Date().toISOString(),
    currency: "NGN",
    source: "Test provider",
    confidence: 0.9,
    provenance: { sourceType: "provider", verificationStatus: "unverified" },
    ...overrides,
  };
}

// =========================================================
// Location (Phase 3 + 15)
// =========================================================

describe("resolveRegionalContext", () => {
  it("resolves a supported country via the profile lookup", () => {
    const result = resolveRegionalContext(
      { country: "NG", region: "Lagos", city: "Lagos" },
      (code) => (code === "NG" ? { country_code: "NG" } : null),
    );
    expect(result.status).toBe("resolved");
    expect(result.countryCode).toBe("NG");
  });

  it("reports an unsupported country WITHOUT falling back to another region", () => {
    const result = resolveRegionalContext(
      { country: "zz" }, // no such profile in the lookup
      () => null,
    );
    expect(result.status).toBe("unsupported");
    expect(result.reason).toContain("No other region's data was substituted");
  });

  it("requires confirmation when no country is given, never guesses", () => {
    const result = resolveRegionalContext({ city: "Lagos" });
    expect(result.status).toBe("requires_confirmation");
    expect(result.reason).toContain("does not guess");
  });

  it("does not reverse-geocode coordinates into a country", () => {
    const result = resolveRegionalContext({ coordinates: { lat: 6.5, lng: 3.4 } });
    expect(result.status).toBe("requires_confirmation");
    expect(result.reason).toContain("reverse geocoding");
  });
});

// =========================================================
// Market data & comparables (Phases 8–9)
// =========================================================

describe("listing records", () => {
  it("keeps asking and verified transaction prices separate", () => {
    const listing = makeListing({
      transactionPrice: { amount: 46_000_000, currency: "NGN", provenanceVerified: true },
      provenance: { sourceType: "provider", verificationStatus: "verified" },
    });
    expect(isVerifiedTransaction(listing)).toBe(true);
    expect(askingPricePer(listing, "land")).toBeCloseTo(100_000, 6);
    expect(transactionPricePer(listing, "land")).toBeCloseTo(92_000, 6);
  });

  it("does NOT treat an unverified transaction price as a transaction", () => {
    const listing = makeListing({
      transactionPrice: { amount: 46_000_000, currency: "NGN", provenanceVerified: false },
    });
    expect(isVerifiedTransaction(listing)).toBe(false);
    expect(transactionPricePer(listing, "land")).toBeUndefined();
  });

  it("returns undefined price-per-unit when size is missing", () => {
    const listing = makeListing({ landSize: undefined });
    expect(askingPricePer(listing, "land")).toBeUndefined();
  });
});

describe("evaluateComparables", () => {
  const criteria = {
    propertyType: "detached",
    country: "NG",
    region: "Lagos",
    currency: "NGN",
    subjectLandSize: { value: 500, unit: "m²" },
    subjectBuildingSize: { value: 220, unit: "m²" },
  };

  function freshListing(id: string, overrides: Partial<PropertyListing> = {}) {
    return makeListing({ id, ...overrides });
  }

  it("includes only listings that pass every check, with traceable reasons", () => {
    const result = evaluateComparables(criteria, [
      freshListing("a"),
      freshListing("b", { region: "Ogun" }),
      freshListing("c"),
      // wrong type, excluded
      freshListing("d", { propertyType: "apartment" }),
      // wrong currency, excluded, never mixed
      freshListing("e", { currency: "USD", askingPrice: { amount: 30_000, currency: "USD" } }),
    ]);
    expect(result.status).toBe("sufficient");
    expect(result.comparables).toHaveLength(3);
    expect(result.comparables[0].inclusionReason).toContain("same property type");
    // region difference is a noted reason, not an exclusion
    expect(result.comparables.some((c) => c.listing.region === "Ogun")).toBe(true);
    expect(result.excluded.find((e) => e.listingId === "d")?.exclusionReason).toContain("apartment");
    expect(result.excluded.find((e) => e.listingId === "e")?.exclusionReason).toContain("not mixed");
  });

  it("returns insufficient_data with honest counts rather than fabricating", () => {
    const result = evaluateComparables(criteria, [freshListing("a")]);
    expect(result.status).toBe("insufficient_data");
    expect(result.reason).toContain("Insufficient data for reliable comparison");
    expect(result.reason).toContain("No comparison was fabricated");
  });

  it("excludes listings older than the age window, with the age in the reason", () => {
    const old = freshListing("old", { observedAt: "2025-01-01T00:00:00Z" });
    const result = evaluateComparables(criteria, [old, freshListing("b"), freshListing("c"), freshListing("d2")]);
    const excluded = result.excluded.find((e) => e.listingId === "old");
    expect(excluded?.exclusionReason).toMatch(/days old/);
    expect(result.comparables).toHaveLength(3);
  });

  it("does not silently convert mismatched land units", () => {
    const imperial = freshListing("imp", { landSize: { value: 0.12, unit: "acres" } });
    const result = evaluateComparables(criteria, [imperial, freshListing("b"), freshListing("c"), freshListing("d")]);
    const excluded = result.excluded.find((e) => e.listingId === "imp");
    expect(excluded?.exclusionReason).toContain("not silently converted");
  });

  it("excludes listings outside the size tolerance with the deviation in the reason", () => {
    const tooBig = freshListing("big", { landSize: { value: 1200, unit: "m²" } });
    const result = evaluateComparables(criteria, [tooBig, freshListing("b"), freshListing("c"), freshListing("d")]);
    const excluded = result.excluded.find((e) => e.listingId === "big");
    expect(excluded?.exclusionReason).toContain("140%");
  });

  it("an empty candidate list is insufficient data, not an error", () => {
    const result = evaluateComparables(criteria, []);
    expect(result.status).toBe("insufficient_data");
    expect(result.reason).toContain("0 comparable listing(s)");
  });
});

// =========================================================
// Profile validation & data classes
// =========================================================

describe("property profile", () => {
  it("requires at least one location identifier", () => {
    const result = validatePropertyProfile({
      id: "p1",
      location: {},
      createdAt: "",
      updatedAt: "",
    });
    expect(result.valid).toBe(false);
  });

  it("classifies provenance into the data taxonomy", () => {
    expect(
      provenanceClass({
        source: "AI extraction",
        sourceType: "ai_extraction",
        verificationStatus: "verified",
      }),
    ).toBe("fact");
    expect(
      provenanceClass({
        source: "AI extraction",
        sourceType: "ai_extraction",
        verificationStatus: "requires_confirmation",
      }),
    ).toBe("ai_detected");
    expect(
      provenanceClass({
        source: "User",
        sourceType: "user",
        verificationStatus: "verified",
      }),
    ).toBe("user_provided");
  });
});

// =========================================================
// Property risk flags (Phase 12)
// =========================================================

describe("evaluatePropertyRisks", () => {
  it("flags a property with no location as critical", () => {
    const flags = evaluatePropertyRisks({
      profile: makeProfile({ location: {} }),
    });
    const flag = flags.find((f) => f.code === "missing_location");
    expect(flag?.severity).toBe("critical");
  });

  it("reports unsupported regions explicitly without falling back", () => {
    const flags = evaluatePropertyRisks({
      profile: makeProfile({ location: { country: "zz", city: "Somewhere" } }),
    });
    const flag = flags.find((f) => f.code === "region_unsupported");
    expect(flag?.title).toContain("unavailable for this region");
    expect(flag?.reason).toContain("No other region's data was substituted");
  });

  it("asks for confirmation when the country is unknown", () => {
    const flags = evaluatePropertyRisks({
      profile: makeProfile({ location: { city: "Lagos" } }),
    });
    expect(flags.find((f) => f.code === "location_requires_confirmation")).toBeDefined();
  });

  it("flags unverified and low-confidence provenance with the field named", () => {
    const flags = evaluatePropertyRisks({
      profile: makeProfile({
        land: { size: 500, unit: "m²", provenance: { source: "AI", sourceType: "ai_extraction", confidence: 0.4, verificationStatus: "requires_confirmation" } },
      }),
    });
    const low = flags.find((f) => f.code === "low_confidence_ai_data");
    expect(low?.reason).toContain("40% confidence");
    expect(flags.find((f) => f.code === "unverified_property_info")?.reason).toContain("land information");
  });

  it("flags missing documents without making ownership claims", () => {
    const flags = evaluatePropertyRisks({ profile: makeProfile() });
    const flag = flags.find((f) => f.code === "missing_documents");
    expect(flag?.reason).toContain("no ownership, title or planning claims");
  });

  it("flags missing dimensions unless a construction project is linked", () => {
    const unlinked = evaluatePropertyRisks({ profile: makeProfile() });
    expect(unlinked.find((f) => f.code === "missing_dimensions")).toBeDefined();

    const linked = evaluatePropertyRisks({
      profile: makeProfile({ constructionProjectId: "proj-1" }),
    });
    expect(linked.find((f) => f.code === "missing_dimensions")).toBeUndefined();
  });

  it("passes the comparable evaluation's honest verdict through", () => {
    const evaluation = evaluateComparables(
      { propertyType: "detached", country: "NG", currency: "NGN" },
      [makeListing({ id: "only" })],
    );
    const flags = evaluatePropertyRisks({
      profile: makeProfile(),
      comparables: evaluation,
    });
    const flag = flags.find((f) => f.code === "insufficient_comparables");
    expect(flag?.reason).toContain("Insufficient data for reliable comparison");
  });

  it("flags unpriced construction items", () => {
    const flags = evaluatePropertyRisks({
      profile: makeProfile(),
      unpricedConstructionItems: ["cement"],
    });
    const flag = flags.find((f) => f.code === "unpriced_construction_items");
    expect(flag?.reason).toContain("cement");
    expect(flag?.reason).toContain("true cost is higher");
  });

  it("never claims condition from photographs, flags it instead", () => {
    const flags = evaluatePropertyRisks({
      profile: makeProfile(),
      conditionClaimedWithoutSource: true,
    });
    const flag = flags.find((f) => f.code === "condition_unverified");
    expect(flag?.reason).toContain("professional inspection");
  });

  it("a complete, linked, verified profile produces no critical flags", () => {
    const flags = evaluatePropertyRisks({
      profile: makeProfile({
        constructionProjectId: "proj-1",
        land: { size: 500, unit: "m²", provenance: { source: "Survey document", sourceType: "document", verificationStatus: "verified" } },
        documents: [{ id: "doc-1", kind: "survey", provenance: { source: "User upload", sourceType: "user", verificationStatus: "verified" } }],
      }),
      comparables: {
        status: "sufficient",
        comparables: [],
        excluded: [],
        reason: "ok",
      },
    });
    expect(flags.filter((f) => f.severity === "critical")).toHaveLength(0);
    expect(flags.filter((f) => f.severity === "warning")).toHaveLength(0);
  });
});
