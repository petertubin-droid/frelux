import { describe, it, expect } from "vitest";
import {
  editDistance,
  searchTerms,
  suggestCorrections,
} from "@/lib/construction-dictionary/search";

const terms: any[] = [
  {
    id: "1",
    language: "en",
    category: "materials",
    country: "NG",
    canonical_term: "cement",
    translation: "ciment",
    synonyms: ["binder"],
    local_terms: ["cement o"],
    alternative_terms: ["portland cement"],
    abbreviations: ["PC"],
    verified: true,
    confidence_score: 0.9,
  },
  {
    id: "2",
    language: "en",
    category: "materials",
    country: "NG",
    canonical_term: "roofing sheet",
    translation: "toiture",
    synonyms: [],
    local_terms: [" roofing sheet "],
    alternative_terms: [],
    abbreviations: [],
    verified: false,
    confidence_score: 0.5,
  },
];

describe("editDistance", () => {
  it("is 0 for identical strings", () => {
    expect(editDistance("cement", "cement")).toBe(0);
  });
  it("counts single substitutions and deletions", () => {
    expect(editDistance("cement", "cemet")).toBe(1);
    expect(editDistance("cement", "cemnt")).toBe(1);
  });
  it("early-exits with 4 for very different lengths", () => {
    expect(editDistance("cement", "roofing sheet")).toBe(4);
  });
});

describe("searchTerms", () => {
  it("finds exact canonical matches first", () => {
    const hits = searchTerms("cement", terms);
    expect(hits[0].term.canonical_term).toBe("cement");
    expect(hits[0].exact).toBe(true);
    expect(hits[0].matched_field).toBe("canonical_term");
  });
  it("tolerates typos within distance 2", () => {
    const hits = searchTerms("cemnt", terms);
    expect(hits.some((h) => h.term.canonical_term === "cement")).toBe(true);
  });
  it("matches translations and local terms", () => {
    expect(searchTerms("ciment", terms)[0].matched_field).toBe("translation");
    expect(
      searchTerms("cement o", terms).some(
        (h) => h.matched_field === "local_term",
      ),
    ).toBe(true);
  });
  it("applies filters (verified, category, country, language)", () => {
    expect(searchTerms("cement", terms, { verified_only: true })).toHaveLength(
      1,
    );
    expect(searchTerms("cement", terms, { category: "tools" })).toHaveLength(0);
    expect(searchTerms("cement", terms, { min_confidence: 0.8 })).toHaveLength(
      1,
    );
    expect(searchTerms("cement", terms, { country: "KE" })).toHaveLength(0);
  });
  it("sorts by distance then term", () => {
    const hits = searchTerms("cement", terms);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i].distance).toBeGreaterThanOrEqual(hits[i - 1].distance);
    }
  });
});

describe("suggestCorrections", () => {
  it("returns unique canonical terms, max 5", () => {
    const s = suggestCorrections("cemnt", terms);
    expect(s).toContain("cement");
    expect(s.length).toBeLessThanOrEqual(5);
    expect(new Set(s).size).toBe(s.length);
  });
});
