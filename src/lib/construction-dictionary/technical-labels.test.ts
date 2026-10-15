import { describe, expect, it } from "vitest";
import {
  isSafetyCriticalText,
  translateTechnicalLabel,
} from "./technical-labels";
import type { ConstructionTerm } from "./types";

const term = (
  canonical_term: string,
  language: string,
  translation: string,
  over: Partial<ConstructionTerm> = {},
): ConstructionTerm =>
  ({
    id: `${canonical_term}-${language}`,
    canonical_term,
    category: "materials",
    definition: "d",
    technical_definition: "d",
    simple_definition: "d",
    language,
    translation,
    alternative_terms: [],
    local_terms: [],
    synonyms: [],
    abbreviations: [],
    unit: null,
    measurement_type: null,
    construction_context: "c",
    example_usage: "e",
    related_terms: [],
    common_mistakes: [],
    translation_notes: "Standard term.",
    country: "JP",
    region: "East Asia",
    source: "FRELUX Engineering",
    source_url: null,
    source_date: "2026-10-15",
    confidence_score: 0.95,
    verified: false,
    verified_by: null,
    translation_status: "provisional",
    keep_in_english: false,
    explanation_required: false,
    nigerian_terminology: null,
    source_details: null,
    version: 1,
    created_at: "2026-10-15T00:00:00Z",
    updated_at: "2026-10-15T00:00:00Z",
    ...over,
  }) as unknown as ConstructionTerm;

const jaDictionary = [
  term("cement", "ja", "セメント"),
  term("concrete", "ja", "コンクリート"),
  term("rebar", "ja", "鉄筋"),
  term("strip foundation", "ja", "布基礎", {
    verified: true,
    translation_status: "verified",
  }),
];

function assertOk(
  r: ReturnType<typeof translateTechnicalLabel>,
): asserts r is Exclude<typeof r, { refused: true }> {
  if ("refused" in r) throw new Error(`unexpected refusal: ${r.reason}`);
}

describe("technical label translation (engine #6 M2)", () => {
  it("translates known terms and preserves measurements verbatim", () => {
    const result = translateTechnicalLabel(
      "225 mm concrete strip foundation with 12 mm rebar",
      "ja",
      jaDictionary,
    );
    assertOk(result);
    expect(result.translated).toContain("コンクリート");
    expect(result.translated).toContain("布基礎");
    expect(result.translated).toContain("鉄筋");
    // measurements survive character-for-character
    expect(result.translated).toContain("225 mm");
    expect(result.translated).toContain("12 mm");
  });

  it("prefers the longest dictionary term (strip foundation, not foundation)", () => {
    const dict = [...jaDictionary, term("foundation", "ja", "基礎")];
    const result = translateTechnicalLabel(
      "strip foundation",
      "ja",
      dict,
    );
    assertOk(result);
    expect(result.translated).toContain("布基礎");
    // the standalone short term must not have replaced it
    expect(result.translated.trim()).toBe("布基礎");
  });

  it("keeps unknown tokens in English and reports them", () => {
    const result = translateTechnicalLabel(
      "cement grout injection nozzle",
      "ja",
      jaDictionary,
    );
    assertOk(result);
    expect(result.translated).toContain("セメント");
    expect(result.translated).toContain("grout");
    expect(result.untranslated_tokens).toContain("grout");
    expect(result.untranslated_tokens).toContain("injection");
    expect(result.disclosure).toContain("pending human review");
  });

  it("reports coverage and verification honestly", () => {
    const result = translateTechnicalLabel(
      "concrete strip foundation",
      "ja",
      jaDictionary,
    );
    assertOk(result);
    expect(result.fully_verified).toBe(false);
    expect(result.translated_terms).toHaveLength(2);
    const verifiedOnly = translateTechnicalLabel(
      "strip foundation",
      "ja",
      jaDictionary,
    );
    assertOk(verifiedOnly);
    expect(verifiedOnly.fully_verified).toBe(true);
  });

  it("refuses safety and regulatory instructions outright", () => {
    const refused = translateTechnicalLabel(
      "Warning: safety helmet must be worn inside the site",
      "ja",
      jaDictionary,
    );
    expect("refused" in refused && refused.refused).toBe(true);
    expect(isSafetyCriticalText("Danger: do not enter")).toBe(true);
    expect(isSafetyCriticalText("concrete blockwork")).toBe(false);
  });

  it("returns honest empty disclosure when nothing is recognised", () => {
    const result = translateTechnicalLabel(
      "proprietaty foaming agent",
      "ja",
      jaDictionary,
    );
    assertOk(result);
    expect(result.translated_terms).toHaveLength(0);
    expect(result.disclosure).toContain("kept in English");
  });

  it("locale QA matrix: every registered dictionary language resolves without crashing", async () => {
    const { DICTIONARY_LANGUAGES } = await import("./languages");
    for (const lang of DICTIONARY_LANGUAGES) {
      const result = translateTechnicalLabel(
        "225 mm concrete blockwork",
        lang.code,
        jaDictionary, // ja-only pool: other languages honestly miss
      );
      assertOk(result);
      if (lang.code !== "ja") {
        expect(result.translated_terms).toHaveLength(0);
        expect(result.translated).toBe("225 mm concrete blockwork");
      }
      expect(result.coverage).toBeGreaterThanOrEqual(0);
      expect(result.coverage).toBeLessThanOrEqual(1);
    }
  });
});
