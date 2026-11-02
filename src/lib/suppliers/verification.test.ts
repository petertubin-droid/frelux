import { describe, expect, it } from "vitest";
import {
  isAtLeast,
  levelRank,
  nextLevel,
  publicBadge,
  requestableLevels,
  verificationDefinition,
  verificationRequirements,
  VERIFICATION_LEVELS,
} from "@/lib/suppliers/verification";

describe("supplier verification ladder", () => {
  it("orders the five levels and offers them one step at a time", () => {
    expect(VERIFICATION_LEVELS.map((entry) => entry.level)).toEqual([
      "unverified",
      "identity_checked",
      "documents_reviewed",
      "address_checked",
      "platform_verified",
    ]);
    expect(nextLevel("unverified")).toBe("identity_checked");
    expect(nextLevel("identity_checked")).toBe("documents_reviewed");
    expect(nextLevel("platform_verified")).toBeNull();
  });

  it("never lets a supplier jump a level", () => {
    expect(requestableLevels("documents_reviewed")).toEqual([
      "address_checked",
      "platform_verified",
    ]);
    expect(isAtLeast("address_checked", "documents_reviewed")).toBe(true);
    expect(isAtLeast("identity_checked", "address_checked")).toBe(false);
    expect(levelRank(null)).toBe(0);
  });

  it("labels an unchecked supplier as unverified rather than trusted", () => {
    const badge = publicBadge("unverified");
    expect(badge.label.toLowerCase()).toContain("unverified");
    expect(badge.tone).toBe("neutral");
    expect(verificationDefinition("unverified").meaning).toMatch(
      /nothing has been checked/i,
    );
    expect(verificationDefinition("platform_verified").doesNotMean).toMatch(
      /warrant/i,
    );
  });

  it("states the gap for the next level instead of a vague status", () => {
    const identity = verificationRequirements("identity_checked", {
      hasPhone: true,
    });
    expect(identity).toEqual([
      { requirement: "Contact phone number on the profile", met: true },
      { requirement: "Business email on the profile", met: false },
      { requirement: "A named representative (contact name)", met: false },
    ]);

    const documents = verificationRequirements("documents_reviewed", {
      hasBusinessRegNo: true,
      hasCategories: true,
    });
    expect(documents.every((entry) => entry.requirement.length > 0)).toBe(true);
    expect(
      documents.find((entry) => entry.requirement.includes("Tax"))?.met,
    ).toBe(false);

    const platform = verificationRequirements("platform_verified", {
      priorLevel: "address_checked",
      hasListings: true,
      latestPriceDaysOld: 45,
    });
    expect(platform.map((entry) => entry.met)).toEqual([true, true, false]);
  });

  it("does not treat a missing price history as a current catalogue", () => {
    const platform = verificationRequirements("platform_verified", {
      priorLevel: "address_checked",
      hasListings: true,
      latestPriceDaysOld: null,
    });
    expect(platform[platform.length - 1].met).toBe(false);
  });
});
