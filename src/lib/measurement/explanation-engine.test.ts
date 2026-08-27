import { describe, it, expect } from "vitest";
import {
  explainSpaceCalculation,
  explainFenceCalculation,
  explainMaterialCalculation,
  explainProjectCalculation,
  explainFromSteps,
  explanationToText,
} from "./explanation-engine";
import type { SpaceResult } from "./space-engine";
import type { FenceResult } from "./fence-engine";
import type { MaterialCalculationResult } from "./material-engine";
import type { ConstructionProjectResult } from "./project-engine";

describe("explanation-engine", () => {
  describe("explainSpaceCalculation", () => {
    it("generates space calculation explanation from SpaceResult", () => {
      const mockResult: SpaceResult = {
        spaceId: "s1",
        name: "Bedroom",
        type: "bedroom",
        finishType: "paint",
        areaM2: 7.43,
        totalAreaM2: 16.34,
        normalizedLengthM: 3.048,
        normalizedWidthM: 2.4384,
        quantity: 2,
        steps: [
          {
            label: "Convert length to meters",
            formula: "10 ft * 0.3048",
            value: "3.048 m",
          },
          {
            label: "Calculate room area",
            formula: "3.048 * 2.4384",
            value: "7.43 m²",
          },
          {
            label: "Apply Waste 10%",
            formula: "7.43 * 1.10",
            value: "8.17 m²",
          },
          {
            label: "Multiply by quantity",
            formula: "8.17 * 2",
            value: "16.34 m²",
          },
        ],
      };

      const explanation = explainSpaceCalculation(mockResult);
      expect(explanation.subject).toContain("Bedroom");
      expect(explanation.resultSummary).toContain("16.34 m²");
      expect(explanation.sections.length).toBeGreaterThan(0);
    });
  });

  describe("explainFenceCalculation", () => {
    it("generates fence calculation explanation", () => {
      const mockFenceResult: FenceResult = {
        fenceId: "f1",
        name: "Front Perimeter",
        dimensionResults: [
          {
            label: "Front Wall",
            partitionLengthM: 3,
            heightM: 2,
            partitionCount: 5,
            partitionAreaM2: 6,
            totalAreaM2: 30,
            steps: [
              {
                label: "Front Wall Area",
                formula: "3 * 2 * 5",
                value: "30 m²",
              },
            ],
          },
        ],
        totalAreaM2: 30,
        steps: [{ label: "Total Fence Area", formula: "30", value: "30 m²" }],
      } as unknown as never;

      const explanation = explainFenceCalculation(mockFenceResult);
      expect(explanation.subject).toContain("Front Perimeter");
      expect(explanation.resultSummary).toContain("30 m²");
      expect(
        explanation.sections.some((s) => s.title.includes("Front Wall")),
      ).toBe(true);
    });
  });

  describe("explainMaterialCalculation", () => {
    it("generates material calculation explanation", () => {
      const mockMaterialResult: MaterialCalculationResult = {
        materialId: "mat-1",
        materialName: "Emulsion Paint",
        areaM2: 50,
        coats: 2,
        netQuantity: 10,
        purchaseQuantity: 10,
        quantityUnit: "litres",
        cartonsOrPacks: 1,
        wastePercent: 10,
        wasteQuantity: 1,
        steps: [
          { label: "Coverage per litre", formula: "10 m²/L", value: "10" },
          { label: "Base Quantity", formula: "50 * 2 / 10", value: "10 L" },
          { label: "Waste 10%", formula: "10 * 1.1", value: "11 L" },
          { label: "Purchase Quantity", formula: "ceil(11)", value: "11 L" },
        ],
      } as unknown as never;

      const explanation = explainMaterialCalculation(
        mockMaterialResult,
        "Emulsion Paint",
      );
      expect(explanation.subject).toBe("Material: Emulsion Paint");
      expect(explanation.resultSummary).toBe("Purchase quantity: 10 litres");
      expect(explanation.sections.length).toBeGreaterThan(0);
    });
  });

  describe("explainProjectCalculation", () => {
    it("generates construction project calculation explanation", () => {
      const mockProjectResult: ConstructionProjectResult = {
        projectId: "proj-1",
        name: "Villa A",
        totalAreaM2: 120,
        elementResults: [
          {
            name: "Blockwork",
            steps: [
              { label: "Element area", formula: "10 * 12", value: "120 m²" },
            ],
          },
        ],
        areaByFinishType: {
          painting: 120,
        },
        steps: [
          { label: "Total Project Area", formula: "120", value: "120 m²" },
        ],
      } as unknown as never;

      const explanation = explainProjectCalculation(mockProjectResult);
      expect(explanation.subject).toBe("Project: Villa A");
      expect(explanation.resultSummary).toContain("120 m²");
      expect(explanation.sections.length).toBeGreaterThan(0);
    });
  });

  describe("explainFromSteps & explanationToText", () => {
    it("explainFromSteps wraps arbitrary steps into an explanation", () => {
      const steps = [
        { label: "Step 1", formula: "1 + 1", value: "2" },
        { label: "Step 2", formula: "2 * 3", value: "6" },
      ];
      const explanation = explainFromSteps(
        "Custom Calculation",
        "Final: 6",
        steps,
      );
      expect(explanation.subject).toBe("Custom Calculation");
      expect(explanation.sections[0].steps).toHaveLength(2);
    });

    it("explanationToText formats calculation explanation into human-readable text", () => {
      const explanation = explainFromSteps("Test Subject", "Result: 100", [
        { label: "Add values", formula: "50 + 50", value: "100" },
      ]);
      explanation.notes = ["Check measurements on-site"];

      const text = explanationToText(explanation);
      expect(text).toContain("HOW FRELUX CALCULATED THIS");
      expect(text).toContain("Subject: Test Subject");
      expect(text).toContain("Result: Result: 100");
      expect(text).toContain("Add values (50 + 50): 100");
      expect(text).toContain("Check measurements on-site");
    });
  });
});
