import { describe, it, expect } from "vitest";
import {
  LIEN_WAIVER_JURISDICTIONS,
  REGULATED_PROVIDER_CATALOG,
  buildLienWaiverDraft,
} from "./lien-waivers";

const VALID = {
  jurisdiction: "US-FL",
  waiver_type: "conditional_progress" as const,
  claimant_name: "Acme Drywall LLC",
  owner_name: "Harbor Holdings",
  project_description: "Office fit-out, 100 Main St, Tampa FL",
  amount: 25000,
  currency: "USD",
  through_date: "2026-11-19",
  payment_received: true,
};

describe("buildLienWaiverDraft", () => {
  it("builds a draft with the exact statutory citation and disclosures", () => {
    const r = buildLienWaiverDraft(VALID);
    expect(r.ok).toBe(true);
    expect(r.draft!.title).toBe("Conditional Waiver and Release on Progress Payment");
    expect(r.draft!.jurisdiction.statute).toContain("713.20");
    expect(r.draft!.disclosures.join(" ")).toContain("not legal advice");
    expect(r.draft!.disclosures.join(" ")).toContain("does not reproduce statutory text");
    expect(r.draft!.required_elements.length).toBeGreaterThan(4);
  });

  it("refuses an unregistered jurisdiction instead of approximating", () => {
    const r = buildLienWaiverDraft({ ...VALID, jurisdiction: "US-NY" });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain("No verified lien-waiver statute");
    expect(r.draft).toBeUndefined();
  });

  it("refuses an unregistered waiver type", () => {
    const r = buildLienWaiverDraft({
      ...VALID,
      // @ts-expect-error testing an invalid type at runtime
      waiver_type: "notarized_release",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("not a form");
  });

  it("requires the core fields", () => {
    const r = buildLienWaiverDraft({ ...VALID, claimant_name: "  ", amount: 0 });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("claimant_name is required.");
    expect(r.errors).toContain("amount must be a positive number.");
  });

  it("rejects a currency that does not match the jurisdiction", () => {
    const r = buildLienWaiverDraft({ ...VALID, currency: "NGN" });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("does not match");
  });

  it("requires payment_received for conditional waivers", () => {
    const r = buildLienWaiverDraft({ ...VALID, payment_received: undefined });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("payment_received is required for conditional waivers.");
  });

  it("warns that an unconditional waiver releases rights without payment", () => {
    const r = buildLienWaiverDraft({
      ...VALID,
      waiver_type: "unconditional_final",
      payment_received: false,
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toContain("whether or not payment has been received");
    expect(r.draft!.fields.payment_received).toContain("not applicable");
  });

  it("validates the through-date as an ISO date", () => {
    const r = buildLienWaiverDraft({ ...VALID, through_date: "19/11/2026" });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("ISO date");
  });

  it("carries the Texas substantial-compliance note", () => {
    const r = buildLienWaiverDraft({ ...VALID, jurisdiction: "US-TX" });
    expect(r.ok).toBe(true);
    expect(r.draft!.disclosures.join(" ")).toContain("substantially complies");
    expect(r.draft!.jurisdiction.statute).toContain("53.284");
  });

  it("carries the California four-form citation", () => {
    const r = buildLienWaiverDraft({
      ...VALID,
      jurisdiction: "US-CA",
      waiver_type: "conditional_final",
    });
    expect(r.ok).toBe(true);
    expect(r.draft!.jurisdiction.statute).toContain("8136");
  });

  it("registry rows are complete and verified", () => {
    for (const rule of Object.values(LIEN_WAIVER_JURISDICTIONS)) {
      expect(rule.statute.length).toBeGreaterThan(5);
      expect(rule.verifiedDate).toBe("2026-11-19");
      expect(rule.source.startsWith("https://")).toBe(true);
      expect(rule.types.length).toBe(4);
      expect(rule.requiredElements.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("regulated providers are all explicitly not connected", () => {
    expect(REGULATED_PROVIDER_CATALOG.length).toBeGreaterThanOrEqual(2);
    for (const p of REGULATED_PROVIDER_CATALOG) {
      expect(p.status).toBe("not_connected");
      expect(p.license_requirement.length).toBeGreaterThan(10);
      expect(p.disclosure).toContain("No ");
    }
  });
});
