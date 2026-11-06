import { describe, expect, it } from "vitest";
import {
  AGING_AFTER_DAYS,
  STALE_AFTER_DAYS,
  ageInDays,
  describePriceProvenance,
} from "./provenance";

const NOW = new Date("2026-11-06T00:00:00.000Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe("price provenance", () => {
  it("treats a fresh verified price with a date as verified", () => {
    const p = describePriceProvenance(
      {
        verificationStatus: "verified",
        lastVerifiedAt: daysAgo(3),
        observationsCount: 4,
      },
      NOW,
    );
    expect(p.state).toBe("verified");
    expect(p.isVerified).toBe(true);
    expect(p.tone).toBe("positive");
    expect(p.ageDays).toBe(3);
    expect(p.detail).toContain("3 days ago");
  });

  it("keeps a verified price verified past the aging line but flags the tone", () => {
    const p = describePriceProvenance(
      {
        verificationStatus: "verified",
        lastVerifiedAt: daysAgo(AGING_AFTER_DAYS + 1),
      },
      NOW,
    );
    expect(p.state).toBe("verified");
    expect(p.isVerified).toBe(true);
    expect(p.tone).toBe("caution");
  });

  it("demotes a verified price older than the stale line", () => {
    const p = describePriceProvenance(
      {
        verificationStatus: "verified",
        lastVerifiedAt: daysAgo(STALE_AFTER_DAYS + 1),
      },
      NOW,
    );
    expect(p.state).toBe("stale");
    expect(p.isVerified).toBe(false);
    expect(p.label).toMatch(/last known/i);
  });

  it("refuses the verified claim when no date backs it", () => {
    const p = describePriceProvenance(
      { verificationStatus: "verified", lastVerifiedAt: null },
      NOW,
    );
    expect(p.isVerified).toBe(false);
    expect(p.state).toBe("unverified");
    expect(p.label).toMatch(/no source/i);
  });

  it("describes an unreviewed observation without calling it verified", () => {
    const p = describePriceProvenance(
      { verificationStatus: "unverified", observationsCount: 1 },
      NOW,
    );
    expect(p.state).toBe("observed");
    expect(p.isVerified).toBe(false);
    expect(p.detail).toContain("1 observation recorded");
  });

  it("distinguishes a sourced but unreviewed row from an unsourced one", () => {
    const sourced = describePriceProvenance(
      {
        verificationStatus: "unverified",
        supplierName: "Ikeja Building Supplies",
        lastScannedAt: daysAgo(2),
      },
      NOW,
    );
    const unsourced = describePriceProvenance(
      { verificationStatus: "unverified" },
      NOW,
    );
    expect(sourced.state).toBe("observed");
    expect(sourced.label).toMatch(/source recorded/i);
    expect(sourced.sourced).toBe(true);
    expect(unsourced.state).toBe("unverified");
    expect(unsourced.label).toMatch(/no source/i);
    expect(unsourced.sourced).toBe(false);
  });

  it("marks a row with no data as having no price rather than an estimate", () => {
    const p = describePriceProvenance({ verificationStatus: "no_data" }, NOW);
    expect(p.state).toBe("no_data");
    expect(p.detail).toMatch(/no price is shown/i);
  });

  it("ages an unverified stamp past the stale line", () => {
    const p = describePriceProvenance(
      {
        verificationStatus: "unverified",
        lastScannedAt: daysAgo(STALE_AFTER_DAYS + 30),
        sourceUrl: "https://supplier.example/cement",
      },
      NOW,
    );
    expect(p.state).toBe("stale");
    expect(p.tone).toBe("caution");
  });

  it("computes age from either stamp and survives junk input", () => {
    expect(ageInDays(daysAgo(10), NOW)).toBe(10);
    expect(ageInDays("not-a-date", NOW)).toBeNull();
    expect(ageInDays(null, NOW)).toBeNull();
    // A clock skew that puts the stamp in the future never reads as negative.
    expect(ageInDays("2026-12-01T00:00:00.000Z", NOW)).toBe(0);
  });

  it("prefers the verification stamp over the scan stamp", () => {
    const p = describePriceProvenance(
      {
        verificationStatus: "verified",
        lastVerifiedAt: daysAgo(5),
        lastScannedAt: daysAgo(200),
      },
      NOW,
    );
    expect(p.asOf).toBe(daysAgo(5));
    expect(p.ageDays).toBe(5);
    expect(p.isVerified).toBe(true);
  });
});
