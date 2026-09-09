// =========================================================
// PROPERTY INTELLIGENCE REPORT + COPILOT ANSWERS TESTS (§16, §18, §20)
// Includes the full end-to-end controlled reference (§23).
// =========================================================

import { describe, it, expect } from "vitest";
import {
  buildPropertyIntelligenceReport,
  REGION_UNAVAILABLE_MESSAGE,
} from "./intelligence";
import type { PropertyProfile } from "./types";
import {
  classifyPropertyQuestion,
  answerPropertyQuestion,
  comparePropertyReports,
} from "@/lib/ai-foundation/property-answers";

const NOW = "2026-09-07T12:00:00Z";

function makeProfile(
  overrides: Partial<PropertyProfile> = {},
): PropertyProfile {
  return {
    id: "prop-1",
    name: "Ikeja duplex",
    location: {
      address: "12 Example Road",
      country: "NG",
      region: "Lagos",
      city: "Ikeja",
    },
    propertyType: "duplex",
    numberOfFloors: 2,
    numberOfRooms: 5,
    land: { size: 645.9, unit: "m²" },
    constructionStatus: "completed",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildPropertyIntelligenceReport (§2–§20)", () => {
  it("builds the full report with data classes, trust chain and disclaimer", () => {
    const report = buildPropertyIntelligenceReport({
      profile: makeProfile(),
      conditionObservations: [
        {
          category: "visible_cracks",
          observation: "hairline crack in living room",
          source: "user_reported",
        },
      ],
      investment: {
        currency: "NGN",
        acquisitionCost: { amount: 50_000_000, currency: "NGN" },
        constructionCost: {
          amount: 20_000_000,
          currency: "NGN",
          source: "Build-to-Roof engine",
        },
        estimatedSaleValue: {
          amount: 90_000_000,
          currency: "NGN",
          source: "indicative estimate",
          sourceKind: "indicative_estimate",
        },
      },
      nowIso: NOW,
    });

    expect(report.disclaimer).toContain("not professional property valuation");
    expect(report.profile.valid).toBe(true);
    expect(
      report.profile.dataAvailability.some(
        (d) => d.field === "Rooms" && d.dataClass === "user_provided",
      ),
    ).toBe(true);
    expect(
      report.profile.dataAvailability.some(
        (d) => d.dataClass === "unavailable",
      ),
    ).toBe(true); // existing condition etc.
    expect(report.condition.findings[0].finding).toContain(
      "Potential issue detected",
    );
    // deterministic trust chain: evidence → analysis → conclusion
    expect(report.trustChain.length).toBeGreaterThan(0);
    for (const link of report.trustChain) {
      expect(link.evidence.length).toBeGreaterThan(0);
      expect(link.analysis.length).toBeGreaterThan(0);
      expect(link.conclusion.length).toBeGreaterThan(0);
    }
    // §13 flows into §9 cost view
    expect(report.costView?.cost.totalKnownCost).toBe(70_000_000);
    expect(report.investment?.saleScenario?.netProceeds).toBe(20_000_000);
    // §15 risks carry evidence + recommended action + status
    for (const r of report.risks) {
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.recommendedAction.length).toBeGreaterThan(0);
      expect([
        "open",
        "mitigated_by_disclosure",
        "requires_user_action",
      ]).toContain(r.status);
    }
  });

  it("§18: unsupported region → explicit unavailable message, no substituted data", () => {
    const report = buildPropertyIntelligenceReport({
      profile: makeProfile({
        location: { address: "Somewhere", country: "ZZ" },
      }),
      nowIso: NOW,
      regionalStatus: "unavailable",
    });
    expect(report.location.status).toBe("unavailable");
    expect(report.location.message).toBe(REGION_UNAVAILABLE_MESSAGE);
    // no market value was fabricated for the unsupported region
    expect(report.value).toBeUndefined();
  });

  it("profile without location identity is flagged invalid, analysis still honest", () => {
    const report = buildPropertyIntelligenceReport({
      profile: makeProfile({ location: {} }),
      nowIso: NOW,
    });
    expect(report.profile.valid).toBe(false);
    expect(report.risks.some((r) => r.code === "missing_location")).toBe(true);
  });

  it("development scenarios flow through with per-scenario required information (§7)", () => {
    const report = buildPropertyIntelligenceReport({
      profile: makeProfile(),
      developmentScenarios: [
        { kind: "as_is", scope: "Keep as is", assumptions: [], knownRisks: [] },
        {
          kind: "extension",
          scope: "Add a room",
          assumptions: [],
          knownRisks: [],
        },
      ],
      nowIso: NOW,
    });
    const requiredExt = report.development.requiredInformation["extension"];
    expect(requiredExt.some((r) => r.includes("construction estimate"))).toBe(
      true,
    );
    expect(report.development.scenarios?.scenarios[1].cost.status).toBe(
      "unavailable",
    );
  });
});

describe("classifyPropertyQuestion (§16)", () => {
  it("classifies the Copilot property intents", () => {
    expect(classifyPropertyQuestion("Analyse this property for me")).toBe(
      "analyse_property",
    );
    expect(classifyPropertyQuestion("Should I renovate or rebuild?")).toBe(
      "renovate_or_rebuild",
    );
    expect(classifyPropertyQuestion("What information is missing?")).toBe(
      "missing_information",
    );
    expect(classifyPropertyQuestion("How much would it cost to develop?")).toBe(
      "development_cost",
    );
    expect(classifyPropertyQuestion("Compare these two properties")).toBe(
      "compare_properties",
    );
    expect(classifyPropertyQuestion("What are the biggest risks?")).toBe(
      "biggest_risks",
    );
    expect(classifyPropertyQuestion("Show me the assumptions")).toBe(
      "show_assumptions",
    );
    expect(
      classifyPropertyQuestion(
        "How many bags of cement for a 3-bedroom bungalow?",
      ),
    ).toBeNull();
  });
});

describe("answerPropertyQuestion (§16 deterministic retrieval)", () => {
  const report = buildPropertyIntelligenceReport({
    profile: makeProfile(),
    conditionObservations: [
      {
        category: "visible_cracks",
        observation: "hairline crack",
        source: "user_reported",
      },
    ],
    investment: {
      currency: "NGN",
      acquisitionCost: { amount: 50_000_000, currency: "NGN" },
      constructionCost: {
        amount: 20_000_000,
        currency: "NGN",
        source: "Build-to-Roof engine",
      },
      estimatedSaleValue: {
        amount: 90_000_000,
        currency: "NGN",
        source: "indicative estimate",
        sourceKind: "indicative_estimate",
      },
    },
    nowIso: NOW,
  });

  it("answers missing-information from the actual report gaps", () => {
    const a = answerPropertyQuestion(report, "What information is missing?");
    expect(a).toContain("Missing information");
    expect(a).toContain("not recorded");
  });

  it("answers risks with severity, affected area, action and status (§15/§16)", () => {
    const a = answerPropertyQuestion(report, "What are the biggest risks?");
    expect(a).toContain("Affected:");
    expect(a).toContain("Recommended:");
    expect(a).toContain("status:");
  });

  it("answers assumptions including the indicative-value caveats", () => {
    const a = answerPropertyQuestion(report, "Show me the assumptions");
    expect(a).toContain("Investment analysis assumptions");
    expect(a).not.toContain("undefined");
  });

  it("returns null for non-property questions and honest text without a report", () => {
    expect(
      answerPropertyQuestion(report, "What is the capital of France?"),
    ).toBeNull();
    const noData = answerPropertyQuestion(null, "Analyse this property");
    expect(noData).toContain("No property data is available");
  });

  it("renovate-vs-rebuild is honest when scenarios are unpriced", () => {
    const a = answerPropertyQuestion(report, "Should I renovate or rebuild?");
    expect(a).toContain("both scenarios need construction estimates");
  });
});

describe("comparePropertyReports (§16)", () => {
  it("compares two reports from recorded data only", () => {
    const a = buildPropertyIntelligenceReport({
      profile: makeProfile(),
      nowIso: NOW,
    });
    const b = buildPropertyIntelligenceReport({
      profile: makeProfile({
        id: "prop-2",
        name: "Abuja land",
        propertyType: "land",
        location: { country: "NG", region: "FCT", city: "Abuja" },
      }),
      nowIso: NOW,
    });
    const cmp = comparePropertyReports(a, b);
    expect(cmp).toContain("recorded data only");
    expect(cmp).toContain("NG");
    expect(cmp).toContain("limitations stated");
  });
});
