import { describe, it, expect } from "vitest";
import {
  executeSharedPipeline,
  createBuildingToRoofInput,
  createAiImageInput,
  canSharePipeline,
  PIPELINE_SOURCE_LABELS,
  PIPELINE_STAGE_LABELS,
  type PipelineStage,
} from "../shared-engine-pipeline";
import type { Space } from "../space-engine";

function makeSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: "sp_1",
    name: "Bedroom 1",
    type: "bedroom",
    length: 12,
    width: 12,
    height: 3,
    unit: "feet",
    quantity: 1,
    includeCeiling: false,
    finishType: "paint",
    surfaceType: "wall",
    openings: [],
    properties: {},
    wasteMarginPercent: 0,
    ...overrides,
  };
}

describe("Feature 22: Shared Engine Integration", () => {
  describe("Pipeline Sources", () => {
    it("has both source labels", () => {
      expect(PIPELINE_SOURCE_LABELS.building_to_roof).toBe(
        "Building-to-Roof Estimator",
      );
      expect(PIPELINE_SOURCE_LABELS.ai_image_estimator).toBe(
        "AI Image Estimator",
      );
    });

    it("allows both sources to share the pipeline", () => {
      expect(canSharePipeline("building_to_roof")).toBe(true);
      expect(canSharePipeline("ai_image_estimator")).toBe(true);
    });
  });

  describe("Pipeline Stages", () => {
    it("has all 8 pipeline stages", () => {
      const stages: PipelineStage[] = [
        "measurement",
        "space_element",
        "calculation",
        "material",
        "market_intelligence",
        "validation",
        "estimate",
        "report",
      ];
      for (const stage of stages) {
        expect(PIPELINE_STAGE_LABELS[stage]).toBeTruthy();
      }
      expect(Object.keys(PIPELINE_STAGE_LABELS)).toHaveLength(8);
    });
  });

  describe("Building-to-Roof Pipeline", () => {
    it("creates input from manual measurements", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test House",
        buildingName: "Main House",
        unit: "feet",
        spaces: [makeSpace()],
        roofType: "Hip",
        roofSections: [
          { name: "Main", grossArea: 200, netArea: 185, pitch: "30°" },
        ],
      });
      expect(input.source).toBe("building_to_roof");
      expect(input.measurementVerification).toBe("manual_input");
      expect(input.spaces).toHaveLength(1);
      expect(input.roofType).toBe("Hip");
    });

    it("executes all 8 stages successfully", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test House",
        unit: "meters",
        spaces: [
          makeSpace({
            id: "sp_1",
            name: "Living Room",
            length: 5,
            width: 4,
            unit: "meters",
          }),
          makeSpace({
            id: "sp_2",
            name: "Kitchen",
            length: 3,
            width: 3,
            unit: "meters",
          }),
        ],
        roofSections: [
          { name: "Main", grossArea: 35, netArea: 30, pitch: "30°" },
        ],
      });
      const result = executeSharedPipeline(input);
      expect(result.success).toBe(true);
      expect(result.source).toBe("building_to_roof");
      expect(result.trace).toHaveLength(8);
      expect(result.stages.measurement.success).toBe(true);
      expect(result.stages.spaceElement.success).toBe(true);
      expect(result.stages.calculation.success).toBe(true);
      expect(result.stages.material.success).toBe(true);
      expect(result.stages.marketIntelligence.success).toBe(true);
      expect(result.stages.validation.success).toBe(true);
      expect(result.stages.estimate.success).toBe(true);
      expect(result.stages.report.success).toBe(true);
    });

    it("aggregates total area across spaces", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test",
        unit: "meters",
        spaces: [
          makeSpace({
            id: "sp_1",
            name: "A",
            length: 5,
            width: 4,
            unit: "meters",
          }),
          makeSpace({
            id: "sp_2",
            name: "B",
            length: 3,
            width: 3,
            unit: "meters",
          }),
        ],
      });
      const result = executeSharedPipeline(input);
      expect(result.stages.measurement.totalAreaM2).toBe(29);
      expect(result.stages.spaceElement.totalAreaM2).toBe(29);
    });

    it("includes roof calculations when roof sections provided", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
        roofSections: [
          { name: "Main", grossArea: 100, netArea: 90, pitch: "30°" },
          { name: "Garage", grossArea: 30, netArea: 28, pitch: "15°" },
        ],
      });
      const result = executeSharedPipeline(input);
      const roofCalc = result.stages.calculation.results.find(
        (r) => r.calculator === "Roof Area",
      );
      expect(roofCalc).toBeTruthy();
      expect(roofCalc!.result).toContain("130");
    });

    it("marks manual input as verified", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
      });
      const result = executeSharedPipeline(input);
      expect(result.stages.measurement.verificationState).toBe("manual_input");
      expect(
        result.stages.validation.verificationSummary.verified,
      ).toBeGreaterThan(0);
    });
  });

  describe("AI Image Estimator Pipeline", () => {
    it("creates input from AI-detected measurements", () => {
      const input = createAiImageInput({
        projectName: "AI House",
        unit: "feet",
        spaces: [makeSpace()],
        userVerified: false,
        userCorrections: ["width: 10→12"],
        scaleStatus: "verified",
        aiConfidence: "high",
      });
      expect(input.source).toBe("ai_image_estimator");
      expect(input.measurementVerification).toBe("ai_detected");
      expect(input.userCorrections).toContain("width: 10→12");
      expect(input.aiConfidence).toBe("high");
    });

    it("marks AI data as user_verified when user confirms", () => {
      const input = createAiImageInput({
        projectName: "AI House",
        unit: "feet",
        spaces: [makeSpace()],
        userVerified: true,
        scaleStatus: "user_confirmed",
      });
      expect(input.measurementVerification).toBe("user_verified");
    });

    it("executes all 8 stages for AI source", () => {
      const input = createAiImageInput({
        projectName: "AI House",
        unit: "meters",
        spaces: [
          makeSpace({
            id: "sp_1",
            name: "Detected Room 1",
            length: 4,
            width: 4,
            unit: "meters",
          }),
          makeSpace({
            id: "sp_2",
            name: "Detected Room 2",
            length: 3,
            width: 3,
            unit: "meters",
          }),
        ],
        userVerified: true,
        scaleStatus: "verified",
        aiConfidence: "high",
      });
      const result = executeSharedPipeline(input);
      expect(result.success).toBe(true);
      expect(result.source).toBe("ai_image_estimator");
      expect(result.trace).toHaveLength(8);
    });

    it("flags scale issues in validation", () => {
      const input = createAiImageInput({
        projectName: "AI House",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
        userVerified: false,
        scaleStatus: "not_available",
      });
      const result = executeSharedPipeline(input);
      expect(result.stages.validation.issues).toContain(
        "Scale not verified — AI dimensions may be inaccurate.",
      );
    });

    it("flags review-required in validation", () => {
      const input = createAiImageInput({
        projectName: "AI House",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
        userVerified: false,
        scaleStatus: "estimated",
      });
      // AI not verified → ai_detected (not review_required)
      // But if we force it:
      const reviewInput = {
        ...input,
        measurementVerification: "ai_detected_review_required" as const,
      };
      const result = executeSharedPipeline(reviewInput);
      expect(result.stages.validation.issues).toContain(
        "Measurement data requires user review before final use.",
      );
    });
  });

  describe("Pipeline Output", () => {
    it("generates share text from report stage", () => {
      const input = createBuildingToRoofInput({
        projectName: "Villa",
        buildingName: "Main House",
        location: "Lagos",
        unit: "meters",
        spaces: [makeSpace({ name: "Living", unit: "meters" })],
        roofSections: [
          { name: "Main", grossArea: 40, netArea: 36, pitch: "30°" },
        ],
      });
      const result = executeSharedPipeline(input);
      expect(result.stages.report.shareText).toContain("Villa");
      expect(result.stages.report.shareText).toContain("Main House");
      expect(result.stages.report.shareText).toContain("Lagos");
      expect(result.stages.report.shareText).toContain("FRELUX");
    });

    it("produces a full pipeline trace", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
      });
      const result = executeSharedPipeline(input);
      expect(result.trace).toHaveLength(8);
      for (const t of result.trace) {
        expect(t.stage).toBeTruthy();
        expect(t.success).toBe(true);
        expect(t.duration).toMatch(/\d+ms/);
      }
    });

    it("generates summary with source info", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
      });
      const result = executeSharedPipeline(input);
      expect(result.summary).toContain("Building-to-Roof");
      expect(result.summary).toContain("144.00 m²");
    });

    it("reports no verified prices when market intelligence has none", () => {
      const input = createBuildingToRoofInput({
        projectName: "Test",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
      });
      const result = executeSharedPipeline(input);
      expect(result.stages.marketIntelligence.hasVerifiedPrices).toBe(false);
      expect(result.stages.estimate.notes).toContain(
        "No verified prices — estimate shown without pricing",
      );
    });
  });

  describe("No Duplicate Systems", () => {
    it("uses the same pipeline for both sources", () => {
      const btrInput = createBuildingToRoofInput({
        projectName: "BTR",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
      });
      const aiInput = createAiImageInput({
        projectName: "AI",
        unit: "meters",
        spaces: [makeSpace({ unit: "meters" })],
        userVerified: true,
      });
      const btrResult = executeSharedPipeline(btrInput);
      const aiResult = executeSharedPipeline(aiInput);
      // Same stages, same structure
      expect(Object.keys(btrResult.stages)).toEqual(
        Object.keys(aiResult.stages),
      );
      expect(btrResult.trace).toHaveLength(aiResult.trace.length);
      // Different source
      expect(btrResult.source).not.toBe(aiResult.source);
    });
  });
});
