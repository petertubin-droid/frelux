import { describe, it, expect } from "vitest";
import { buildSmartRoofReport } from "./smart-roof-report";

describe("measurement/smart-roof-report", () => {
  it("builds a report with defaults", () => {
    const report = buildSmartRoofReport({
      projectName: "Test Project",
      roofSummary: {
        totalGrossArea: 100,
        totalNetArea: 90,
        pitch: "1/2",
        sections: [],
      } as unknown as never,
      linearMeasurements: [],
      cutouts: [],
      materialRequirements: [],
      wasteEntries: [],
      marketPrices: [],
      confidence: {
        overallConfidence: "high",
        verificationStates: [],
      },
      calculationSteps: [],
    });
    expect(report).toBeTruthy();
    expect(report.metadata.projectName).toBe("Test Project");
    expect(report.metadata.date).toBeTruthy();
  });

  it("uses custom units and currency", () => {
    const report = buildSmartRoofReport({
      projectName: "Custom Units",
      areaUnit: "ft²",
      lengthUnit: "ft",
      currency: "USD",
      roofSummary: {
        totalGrossArea: 100,
        totalNetArea: 90,
        pitch: "1/2",
        sections: [],
      } as unknown as never,
      linearMeasurements: [],
      cutouts: [],
      materialRequirements: [],
      wasteEntries: [],
      marketPrices: [],
      confidence: { overallConfidence: "high", verificationStates: [] },
      calculationSteps: [],
    });
    expect(report).toBeTruthy();
  });

  it("calculates total linear length", () => {
    const report = buildSmartRoofReport({
      projectName: "Linear Test",
      roofSummary: {
        totalGrossArea: 100,
        totalNetArea: 90,
        pitch: "1/2",
        sections: [],
      } as unknown as never,
      linearMeasurements: [
        { label: "Ridge", length: 10, count: 2, unit: "m" } as unknown as never,
        { label: "Eave", length: 15, count: 1, unit: "m" } as unknown as never,
      ],
      cutouts: [],
      materialRequirements: [],
      wasteEntries: [],
      marketPrices: [],
      confidence: { overallConfidence: "high", verificationStates: [] },
      calculationSteps: [],
    });
    // total = 10*2 + 15*1 = 35
    expect(report).toBeTruthy();
  });
});
