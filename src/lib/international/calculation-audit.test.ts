import { describe, it, expect } from "vitest";
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
  } as any;

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
