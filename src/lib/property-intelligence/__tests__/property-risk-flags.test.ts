// =========================================================
// PROPERTY RISK FLAGS TESTS (Prompt 4, Phase 12)
//
// No arbitrary risk scores: every flag names its exact evidence.
// Pinned cases:
//   * no location → critical missing_location
//   * city without country → warning requires_confirmation
//   * unsupported country → info, universal analysis still offered
//   * unverified / low-confidence (< 70%) provenance is flagged
//   * no documents, no land size (unlinked) → flags
//   * unpriced construction items and unsourced condition claims
//   * outdated comparables use the documented 180-day window
//   * every flag carries §15 metadata: affectedArea, evidence,
//     recommendedAction, status
// =========================================================
import { describe, it, expect } from "vitest";
import {
  evaluatePropertyRisks,
  PROPERTY_RISK_LABELS,
} from "@/lib/property-intelligence/property-risk-flags";
import type { PropertyProfile } from "@/lib/property-intelligence/types";

function profile(over: Record<string, unknown> = {}): PropertyProfile {
  return {
    id: "p1",
    location: {
      address: "12 Marina",
      city: "Lagos",
      region: "Lagos",
      country: "NG",
      provenance: { verificationStatus: "verified" },
    },
    documents: [
      {
        id: "doc1",
        kind: "title",
        provenance: { verificationStatus: "verified" },
      },
    ],
    land: { size: 600, provenance: { verificationStatus: "verified" } },
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...over,
  } as never;
}

const codes = (flags: ReturnType<typeof evaluatePropertyRisks>) =>
  flags.map((f) => f.code);

describe("location flags", () => {
  it("no address, city or coordinates → critical missing_location", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({
        location: {
          address: null,
          city: null,
          country: "NG",
          provenance: { verificationStatus: "verified" },
        },
      }),
    });
    const f = flags.find((x) => x.code === "missing_location");
    expect(f?.severity).toBe("critical");
    expect(f?.reason).toContain("no address, city or coordinates");
  });

  it("city but no country → warning location_requires_confirmation", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({
        location: {
          address: "12 Marina",
          city: "Lagos",
          country: null,
          provenance: { verificationStatus: "verified" },
        },
      }),
    });
    const f = flags.find((x) => x.code === "location_requires_confirmation");
    expect(f?.severity).toBe("warning");
  });

  it("unsupported country → info region_unsupported, universal analysis still offered", () => {
    const flags = evaluatePropertyRisks({ profile: profile({}) });
    const f = flags.find((x) => x.code === "region_unsupported");
    expect(f?.severity).toBe("info");
    expect(f?.reason).toContain(
      "Universal building analysis remains available",
    );
  });
});

describe("provenance flags", () => {
  it("unverified location provenance → warning listing the field", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({
        location: {
          address: "a",
          city: "Lagos",
          country: "NG",
          provenance: { verificationStatus: "requires_confirmation" },
        },
      }),
    });
    const f = flags.find((x) => x.code === "unverified_property_info");
    expect(f?.reason).toContain("location");
  });

  it("confidence below 70% → low_confidence_ai_data with the exact percentage", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({
        location: {
          address: "a",
          city: "Lagos",
          country: "NG",
          provenance: { verificationStatus: "verified", confidence: 0.42 },
        },
      }),
    });
    const f = flags.find((x) => x.code === "low_confidence_ai_data");
    expect(f?.severity).toBe("warning");
    expect(f?.reason).toContain("42% confidence");
  });

  it("verified, confident provenance → no provenance flags", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({
        location: {
          address: "a",
          city: "Lagos",
          country: "NG",
          provenance: { verificationStatus: "verified", confidence: 0.9 },
        },
      }),
    });
    expect(codes(flags)).not.toContain("unverified_property_info");
    expect(codes(flags)).not.toContain("low_confidence_ai_data");
  });
});

describe("completeness flags", () => {
  it("no documents → info missing_documents, no ownership claims made", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({ documents: [] }),
    });
    const f = flags.find((x) => x.code === "missing_documents");
    expect(f?.severity).toBe("info");
    expect(f?.reason).toContain("no ownership, title or planning claims");
  });

  it("no land size and no linked construction project → warning missing_dimensions", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({ land: undefined }),
    });
    expect(codes(flags)).toContain("missing_dimensions");
  });

  it("a linked construction project satisfies the dimension check", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({ land: undefined, constructionProjectId: "cp1" }),
    });
    expect(codes(flags)).not.toContain("missing_dimensions");
  });
});

describe("market + construction flags", () => {
  it("insufficient comparables → warning with the evaluation's own reason", () => {
    const flags = evaluatePropertyRisks({
      profile: profile(),
      comparables: {
        status: "insufficient_data",
        reason: "Only 1 comparable in range",
      } as never,
    });
    const f = flags.find((x) => x.code === "insufficient_comparables");
    expect(f?.reason).toContain("Only 1 comparable in range");
  });

  it("comparables older than the 180-day window → info outdated_market_data", () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const flags = evaluatePropertyRisks({
      profile: profile(),
      comparables: { status: "ok" } as never,
      oldestComparableDate: old,
    });
    const f = flags.find((x) => x.code === "outdated_market_data");
    expect(f?.severity).toBe("info");
    expect(f?.reason).toContain("180-day");
    expect(f?.reason).toContain(old.slice(0, 10));
  });

  it("fresh comparables → no outdated flag", () => {
    const flags = evaluatePropertyRisks({
      profile: profile(),
      comparables: { status: "ok" } as never,
      oldestComparableDate: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
    expect(codes(flags)).not.toContain("outdated_market_data");
  });

  it("unpriced construction items → warning, true cost higher than shown", () => {
    const flags = evaluatePropertyRisks({
      profile: profile(),
      unpricedConstructionItems: ["roofing sheets", "plumbing"],
    });
    const f = flags.find((x) => x.code === "unpriced_construction_items");
    expect(f?.severity).toBe("warning");
    expect(f?.reason).toContain("roofing sheets, plumbing");
    expect(f?.reason).toContain("higher than the shown total");
  });

  it("condition claimed without an authoritative source → warning", () => {
    const flags = evaluatePropertyRisks({
      profile: profile(),
      conditionClaimedWithoutSource: true,
    });
    const f = flags.find((x) => x.code === "condition_unverified");
    expect(f?.severity).toBe("warning");
    expect(f?.reason).toContain("professional inspection");
  });
});

describe("§15 metadata", () => {
  it("every flag carries affectedArea, evidence, recommendedAction and status", () => {
    const flags = evaluatePropertyRisks({
      profile: profile({ documents: [], land: undefined }),
      conditionClaimedWithoutSource: true,
      unpricedConstructionItems: ["x"],
    });
    expect(flags.length).toBeGreaterThan(0);
    for (const f of flags) {
      expect(f.affectedArea).toBeTruthy();
      expect(f.evidence).toBeTruthy();
      expect(f.recommendedAction).toBeTruthy();
      expect([
        "open",
        "mitigated_by_disclosure",
        "requires_user_action",
      ]).toContain(f.status);
    }
  });

  it("every code has a human label in PROPERTY_RISK_LABELS", () => {
    for (const code of Object.keys(PROPERTY_RISK_LABELS)) {
      expect(
        PROPERTY_RISK_LABELS[code as keyof typeof PROPERTY_RISK_LABELS].length,
      ).toBeGreaterThan(3);
    }
  });
});
