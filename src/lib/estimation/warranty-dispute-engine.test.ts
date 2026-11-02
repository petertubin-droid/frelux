/**
 * Warranty & Dispute Engine tests (Future Engine 14)
 *
 * Hash values are pinned by computing the same canonical-JSON
 * FNV-1a by hand; every money value is hand-verified.
 */

import { describe, it, expect } from "vitest";
import {
  issueWarrantyCertificate,
  type WarrantyInput,
  type WarrantyItemInput,
} from "./warranty-dispute-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rule = (key: string, value: number): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "warranty",
    rule_value: { value },
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const item = (over: Partial<WarrantyItemInput> = {}): WarrantyItemInput => ({
  item_id: "i-1",
  item_name: "Emulsion paint",
  quantity: 10,
  unit: "litre",
  unit_price: 5000,
  stored_total: 50000,
  ...over,
});

const input = (over: Partial<WarrantyInput> = {}): WarrantyInput => ({
  estimate_ref: "EST-001",
  estimate_id: "est-1",
  calculator_type: "paint",
  currency: "NGN",
  quoted_at: "2026-01-01T00:00:00.000Z",
  total_material_cost: 50000,
  inputs: { area_sqm: 120, coats: 2 },
  calculated_quantities: { paint_litres: 10 },
  items: [item()],
  rules: [rule("warranty_months", 12), rule("rounding_decimals", 2)],
  now: "2026-10-04T00:00:00.000Z",
  ...over,
});

describe("issueWarrantyCertificate", () => {
  it("issues a certificate with a deterministic, pinned config hash", () => {
    const r = issueWarrantyCertificate(input());
    expect(r.ok).toBe(true);
    // Pinned: canonical JSON of the frozen snapshot → FNV-1a 32-bit.
    // Same stored configuration must ALWAYS produce this exact hash.
    expect(r.config_hash).toBe("fdac337e");
    expect(r.certificate_ref).toBe("FRELUX-WAR-EST-001-fdac337e");
    // Re-issue of the identical configuration → identical hash
    expect(issueWarrantyCertificate(input()).config_hash).toBe(r.config_hash);
  });

  it("produces the same hash regardless of key insertion order (canonical)", () => {
    const r = issueWarrantyCertificate(
      input({
        inputs: { coats: 2, area_sqm: 120 } as unknown as Record<
          string,
          unknown
        >,
        calculated_quantities: { paint_litres: 10 },
      }),
    );
    expect(r.config_hash).toBe("fdac337e");
  });

  it("changes the hash when any frozen value changes (tamper-evident)", () => {
    const r = issueWarrantyCertificate(
      input({ items: [item({ unit_price: 6000, stored_total: 60000 })] }),
    );
    expect(r.config_hash).not.toBe("fdac337e");
  });

  it("replays clean line math exactly and reports all-matching", () => {
    const r = issueWarrantyCertificate(input());
    expect(r.replay_checks).toHaveLength(1);
    expect(r.replay_checks[0].replayed_total).toBe(50000);
    expect(r.replay_checks[0].matches).toBe(true);
    expect(r.dispute_flags).toHaveLength(0);
    expect(r.status).toBe("active");
  });

  it("flags a stored-total mismatch as a dispute: never repairs it", () => {
    const r = issueWarrantyCertificate(
      input({ items: [item({ stored_total: 55000 })] }),
    );
    // replayed stays the honest math: 10 × 5,000 = 50,000
    expect(r.replay_checks[0].replayed_total).toBe(50000);
    expect(r.replay_checks[0].matches).toBe(false);
    expect(r.status).toBe("disputed");
    expect(r.dispute_flags.join(" ")).toMatch(
      /does not match the replayed math/,
    );
    expect(r.dispute_flags.join(" ")).toMatch(/never repairs stored data/);
  });

  it("flags invalid stored data instead of smoothing over it", () => {
    const r = issueWarrantyCertificate(
      input({ items: [item({ quantity: -5, stored_total: 50000 })] }),
    );
    expect(r.status).toBe("disputed");
    expect(r.dispute_flags.join(" ")).toMatch(/invalid stored data/);
  });

  it("computes the expiry from the configured months, clamping month overflow", () => {
    // quoted 2026-01-31 + 12 months = 2027-01-31 (normal)
    const r = issueWarrantyCertificate(input());
    expect(r.warranty_months).toBe(12);
    expect(r.expires_at).toBe("2027-01-01T00:00:00.000Z");
    expect(r.within_warranty).toBe(true);

    // quoted Jan 31 2026 + 1 month → clamped to Feb 28 2026 (not Mar 3)
    const r2 = issueWarrantyCertificate(
      input({
        quoted_at: "2026-01-31T00:00:00.000Z",
        rules: [rule("warranty_months", 1)],
      }),
    );
    expect(r2.expires_at).toBe("2026-02-28T00:00:00.000Z");
  });

  it("marks an expired certificate by comparing issue time to the expiry", () => {
    // quoted 2024-01-01, 12 months → expired 2025-01-01; issued 2026-10-04
    const r = issueWarrantyCertificate(
      input({ quoted_at: "2024-01-01T00:00:00.000Z" }),
    );
    expect(r.within_warranty).toBe(false);
    expect(r.status).toBe("expired");
  });

  it("issues WITHOUT an expiry when no warranty rule is configured: never invents one", () => {
    const r = issueWarrantyCertificate(input({ rules: [] }));
    expect(r.ok).toBe(true);
    expect(r.expires_at).toBeNull();
    expect(r.within_warranty).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/never invents a warranty period/);
  });

  it("refuses invalid inputs", () => {
    expect(issueWarrantyCertificate(input({ estimate_ref: " " })).ok).toBe(
      false,
    );
    expect(issueWarrantyCertificate(input({ estimate_id: "" })).ok).toBe(false);
    expect(issueWarrantyCertificate(input({ items: [] })).ok).toBe(false);
    expect(issueWarrantyCertificate(input({ now: "not-a-date" })).ok).toBe(
      false,
    );
    expect(
      issueWarrantyCertificate(input({ estimate_ref: " " })).warnings.join(" "),
    ).toMatch(/never certifies without one/);
  });
});
