import { createEstimateAuditFromStorage, withCalculationAudit } from '@/lib/international/calculation-audit';
import { afterEach, describe, it, expect } from 'vitest';
import {
  createCalculationAudit,
  createLegacyAudit,
  auditToRecord,
} from "./calculation-audit";
import type { ResolvedMarketContext } from "@/types/international";

describe("calculation-audit", () => {
  const mockMarket: ResolvedMarketContext = {
    marketCode: "KE",
    currencyCode: "KES",
    profileVersion: "1.2.3",
  } as unknown as never;

  it("createCalculationAudit produces correct audit object with defaults", () => {
    const audit = createCalculationAudit(mockMarket, {
      inputUnit: "feet",
    });

    expect(audit.market_code).toBe("KE");
    expect(audit.input_unit).toBe("feet");
    expect(audit.normalized_unit).toBe("meters");
    expect(audit.market_profile_version).toBe("1.2.3");
    expect(audit.material_rule_version).toBeNull();
    expect(audit.calculator_version).toBeNull();
    expect(audit.currency_code).toBe("KES");
    expect(typeof audit.timestamp).toBe("string");
    expect(new Date(audit.timestamp).getTime()).not.toBeNaN();
  });

  it("createCalculationAudit accepts optional parameters", () => {
    const audit = createCalculationAudit(mockMarket, {
      inputUnit: "feet",
      normalizedUnit: "meters",
      materialRuleVersion: "v1",
      calculatorVersion: "v2",
    });

    expect(audit.normalized_unit).toBe("meters");
    expect(audit.material_rule_version).toBe("v1");
    expect(audit.calculator_version).toBe("v2");
  });

  it("createLegacyAudit creates NG default audit", () => {
    const legacy = createLegacyAudit();

    expect(legacy).toEqual({
      market_code: "NG",
      input_unit: "meters",
      normalized_unit: "meters",
      market_profile_version: "1.0.0",
      material_rule_version: null,
      calculator_version: null,
      currency_code: "NGN",
      timestamp: expect.any(String),
    });
  });

  it("auditToRecord converts audit to database record fields", () => {
    const audit = createCalculationAudit(mockMarket, {
      inputUnit: "inches",
      materialRuleVersion: "rule-123",
    });

    const record = auditToRecord(audit);

    expect(record).toEqual({
      market_code: "KE",
      input_unit: "inches",
      normalized_unit: "meters",
      market_profile_version: "1.2.3",
      material_rule_version: "rule-123",
    });
  });
});


// ────────────────────────────────────────────────────────────
// P1.9 storage-backed audit for the persistence layer
// ────────────────────────────────────────────────────────────

describe("createEstimateAuditFromStorage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("reads the saved market + unit from localStorage", () => {
    window.localStorage.setItem("frelux_market", "DE");
    window.localStorage.setItem("frelux_length_unit", "meters");
    const audit = createEstimateAuditFromStorage("foundation");
    expect(audit.market_code).toBe("DE");
    expect(audit.currency_code).toBe("EUR");
    expect(audit.input_unit).toBe("meters");
    expect(audit.calculator_version).toBe("estimation-foundation");
    expect(audit.timestamp).toBeTruthy();
  });

  it("falls back to NG legacy defaults when nothing is saved", () => {
    const audit = createEstimateAuditFromStorage("plumbing");
    expect(audit.market_code).toBe("NG");
    expect(audit.currency_code).toBe("NGN");
    expect(audit.normalized_unit).toBe("meters");
  });

  it("keeps the profile default unit when only the market is saved", () => {
    window.localStorage.setItem("frelux_market", "US");
    const audit = createEstimateAuditFromStorage("electrical");
    expect(audit.market_code).toBe("US");
    expect(audit.currency_code).toBe("USD");
  });
});

describe("withCalculationAudit", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("attaches audit metadata additively to estimate inputs", () => {
    const payload = withCalculationAudit(
      { inputs: { rooms: 2, area: 40 } },
      "painting",
    );
    expect(payload.inputs).toMatchObject({ rooms: 2, area: 40 });
    expect((payload.inputs as Record<string, unknown>).calculation_audit).toMatchObject({
      market_code: "NG",
      calculator_version: "estimation-painting",
    });
  });

  it("never overwrites an existing audit", () => {
    const existing = { market_code: "DE", hand_written: true };
    const payload = withCalculationAudit(
      { inputs: { calculation_audit: existing } },
      "painting",
    );
    expect((payload.inputs as Record<string, unknown>).calculation_audit).toBe(existing);
  });

  it("leaves payloads without inputs untouched", () => {
    const data: { calculator_type?: string; inputs?: Record<string, unknown> } = {
      calculator_type: "tile",
    };
    expect(withCalculationAudit(data, "tile")).toBe(data);
  });
});
