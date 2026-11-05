import { describe, expect, it } from "vitest";
import {
  applyMarketRates,
  blankSurveyRates,
  convertSurveyToPriced,
  markAsPriced,
  markAsSurvey,
  surveyProgress,
  surveySchedule,
} from "./survey";
import { createEmptyDocument, type BoqStudioDocument } from "./types";

function doc(over: Partial<BoqStudioDocument> = {}): BoqStudioDocument {
  const base = createEmptyDocument({
    currency: "NGN",
    marketCode: "NG",
    standard: "Commercial",
    templateSlug: "ng-commercial",
    preparedBy: "QS",
  });
  return {
    ...base,
    title: "Market survey",
    reference: "MS-001",
    sections: [
      {
        id: "s1",
        code: "05",
        title: "Concrete",
        notes: "",
        items: [
          {
            id: "a",
            item_number: "05.01",
            description: "Grade 20 concrete",
            specification: "",
            unit: "m³",
            quantity: 10,
            material_rate: 0,
            labour_rate: 0,
            plant_rate: 0,
            notes: "",
            rates_include_waste: false,
          },
          {
            id: "b",
            item_number: "05.02",
            description: "Formwork to sides",
            specification: "",
            unit: "m²",
            quantity: 40,
            material_rate: 2500,
            labour_rate: 0,
            plant_rate: 0,
            notes: "",
            rates_include_waste: false,
          },
        ],
      },
    ],
    ...over,
  };
}

describe("market survey", () => {
  it("lists every measured item with its section and price state", () => {
    const lines = surveySchedule(doc());
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      item_id: "a",
      section_code: "05",
      quantity: 10,
      priced: false,
    });
    expect(lines[1]).toMatchObject({ priced: true, amount: 100000 });
  });

  it("reports progress and a total that only counts captured rates", () => {
    const progress = surveyProgress(doc());
    expect(progress.lines).toBe(2);
    expect(progress.priced).toBe(1);
    expect(progress.missing).toBe(1);
    expect(progress.priced_pct).toBe(50);
    expect(progress.total).toBe(100000);
    expect(progress.complete).toBe(false);
  });

  it("treats a fully rated survey as complete", () => {
    const filled = applyMarketRates(doc(), { a: 95000 });
    const progress = surveyProgress(filled);
    expect(progress.missing).toBe(0);
    expect(progress.complete).toBe(true);
    expect(progress.total).toBe(950000 + 100000);
  });

  it("applies collected rates through the material rate and ignores noise", () => {
    const filled = applyMarketRates(doc(), {
      a: 95000,
      unknown: 500,
      b: -20,
    });
    expect(filled.sections[0].items[0].material_rate).toBe(95000);
    expect(filled.sections[0].items[1].material_rate).toBe(2500);
    expect(filled.sections[0].items[0].quantity).toBe(10);
  });

  it("blanks the price layer without touching quantities or descriptions", () => {
    const blanked = blankSurveyRates(doc());
    expect(blanked.sections[0].items[1].material_rate).toBe(0);
    expect(blanked.sections[0].items[1].labour_rate).toBe(0);
    expect(blanked.sections[0].items[1].quantity).toBe(40);
    expect(blanked.sections[0].items[1].description).toBe("Formwork to sides");
  });

  it("converts a completed survey to a priced quote keeping the rates", () => {
    const survey = markAsSurvey(doc());
    const filled = applyMarketRates(survey, { a: 95000 });
    const priced = convertSurveyToPriced(filled, { tax_pct: 7.5 });
    expect(priced.mode).toBe("priced");
    expect(priced.sections[0].items[0].material_rate).toBe(95000);
    expect(priced.commercials.tax_pct).toBe(7.5);
    expect(priced.survey.notes).toContain("market survey");
  });

  it("keeps an existing survey note when converting", () => {
    const survey = {
      ...markAsSurvey(doc()),
      survey: {
        market_city: "Lagos",
        survey_date: "2026-11-05",
        surveyed_by: "P. T.",
        notes: "Rates from three suppliers.",
      },
    };
    const priced = convertSurveyToPriced(survey);
    expect(priced.survey.notes).toBe("Rates from three suppliers.");
    expect(priced.survey.market_city).toBe("Lagos");
  });

  it("switches modes without changing the quantities", () => {
    const survey = markAsSurvey(doc());
    const priced = markAsPriced(survey);
    expect(survey.mode).toBe("market_survey");
    expect(priced.mode).toBe("priced");
    expect(priced.sections[0].items[0].quantity).toBe(10);
  });

  it("defaults a new document to a priced quote", () => {
    const fresh = createEmptyDocument({
      currency: "NGN",
      marketCode: "NG",
      standard: "Commercial",
      templateSlug: "ng-commercial",
    });
    expect(fresh.mode).toBe("priced");
    expect(fresh.survey.market_city).toBe("");
  });
});
