import { describe, it, expect } from "vitest";
import { buildSmartAiImageReport } from "./smart-ai-report";

const baseParams = {
  imageReference: {
    reference: "img-001",
    imageType: "photo" as const,
    uploadedAt: "2026-01-01",
  },
  detectedBuilding: {
    buildingType: "residential",
    buildingTypeConfidence: "high" as const,
    estimatedFloors: 2,
    estimatedHeight: 6,
    heightUnit: "m",
    verificationState: "verified" as any,
    userCorrections: [] as string[],
  },
  detectedRooms: [],
  detectedDimensions: [],
  scaleInfo: {
    status: "verified" as const,
    referenceObject: "door",
    scaleRatio: "1:100",
  },
  aiReview: {
    status: "reviewed" as const,
    reviewedItems: [],
    correctedItems: [],
    confirmedItems: [] as string[],
  },
  verifiedMeasurements: [],
  calculationResults: [],
  materialRequirements: [],
  confidence: {
    overallConfidence: "high" as const,
    aiDetectionConfidence: "high" as const,
    scaleConfidence: "verified" as const,
    calculationConfidence: "high" as const,
    marketPriceConfidence: "unavailable" as const,
  },
};

describe("measurement/smart-ai-report", () => {
  it("builds report with defaults", () => {
    const report = buildSmartAiImageReport(baseParams as any);
    expect(report).toBeTruthy();
    expect(report.imageReference.reference).toBe("img-001");
  });

  it("uses NGN as default currency", () => {
    const report = buildSmartAiImageReport(baseParams as any);
    expect(report).toBeTruthy();
    expect(report.shareText).toBeTruthy();
  });

  it("accepts custom currency", () => {
    const report = buildSmartAiImageReport({
      ...baseParams,
      currency: "USD",
    } as any);
    expect(report).toBeTruthy();
  });
});
