import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BoqTranslationCard from "./BoqTranslationCard";
import type { BoqLineItem } from "@/lib/estimation/boq-engine";

vi.mock("@/lib/construction-dictionary/dictionary-client", () => ({
  listDictionaryTerms: vi.fn(),
}));

import { listDictionaryTerms } from "@/lib/construction-dictionary/dictionary-client";
const mockedList = vi.mocked(listDictionaryTerms);

const item = (description: string): BoqLineItem => ({
  description,
  quantity: 10,
  unit: "m2",
  unit_cost: 500,
  source_estimate_ref: "est-1",
});

// a small realistic ja pool mirroring the live dictionary
const jaPool = [
  {
    canonical_term: "concrete",
    translation: "コンクリート",
  },
  {
    canonical_term: "rebar",
    translation: "鉄筋",
  },
  {
    canonical_term: "strip foundation",
    translation: "布基礎",
    verified: true,
    translation_status: "verified",
  },
];

beforeEach(() => {
  mockedList.mockReset();
});

describe("BoqTranslationCard (engine #6 M3)", () => {
  it("renders nothing in English or with no items", () => {
    const { container } = render(
      <BoqTranslationCard language="en" items={[item("concrete works")]} />,
    );
    expect(container).toBeEmptyDOMElement();
    const { container: empty } = render(
      <BoqTranslationCard language="ja" items={[]} />,
    );
    expect(empty).toBeEmptyDOMElement();
  });

  it("translates line descriptions and preserves measurements", async () => {
    mockedList.mockResolvedValueOnce(
      jaPool.map((t, i) => ({
        ...(t as Record<string, unknown>),
        id: `ja-${i}`,
        language: "ja",
        category: "materials",
        definition: "d",
        technical_definition: "d",
        simple_definition: "d",
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
        translation_notes: "n",
        country: "JP",
        region: "East Asia",
        source: "test",
        source_url: null,
        source_date: "2026-10-15",
        confidence_score: 0.95,
        verified: "verified" in t ? t.verified : false,
        verified_by: null,
        translation_status:
          "translation_status" in t ? t.translation_status : "provisional",
        keep_in_english: false,
        explanation_required: false,
        nigerian_terminology: null,
        source_details: null,
        version: 1,
        created_at: "2026-10-15T00:00:00Z",
        updated_at: "2026-10-15T00:00:00Z",
      })) as never,
    );
    render(
      <BoqTranslationCard
        language="ja"
        items={[item("225 mm concrete with 12 mm rebar")]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/コンクリート/)).toBeTruthy();
    });
    // measurements survive verbatim in BOTH the source line and
    // the translated line (source stays visible for review)
    expect(screen.getAllByText(/225 mm/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/12 mm/).length).toBeGreaterThanOrEqual(2);
    // preview disclosure is always visible
    expect(screen.getByText(/review only/i)).toBeTruthy();
  });

  it("renders RTL direction for Arabic and keeps source descriptions LTR", async () => {
    mockedList.mockResolvedValueOnce([]);
    const { container } = render(
      <BoqTranslationCard language="ar" items={[item("concrete blockwork")]} />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Dictionary source/i)).toBeTruthy();
    });
    const rtlContainer = container.querySelector('[dir="rtl"]');
    expect(rtlContainer).toBeTruthy();
    // source description stays LTR inside the RTL card
    expect(container.querySelector('[dir="ltr"]')).toBeTruthy();
  });

  it("discloses the seed fallback when the database is unavailable", async () => {
    mockedList.mockRejectedValueOnce(new Error("db down"));
    render(
      <BoqTranslationCard
        language="fr"
        items={[item("mortar for blockwork")]}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByText(/curated offline seed terms/i),
      ).toBeTruthy();
    });
    // fr seed pool translates mortar (translated line + source kept)
    await waitFor(() => {
      expect(screen.getAllByText(/mortier/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("refuses safety instructions without translating them", async () => {
    mockedList.mockResolvedValueOnce([]);
    render(
      <BoqTranslationCard
        language="ja"
        items={[item("Warning: safety helmet must be worn on site")]}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByText(/Not machine-translated/i),
      ).toBeTruthy();
    });
  });
});
