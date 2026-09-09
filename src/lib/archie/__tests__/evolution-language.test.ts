// =========================================================
// ARCHIE EVOLUTION — LANGUAGE MEMORY TESTS (§8–§13)
//
// Detection → discovery → learning → evidence → validation →
// confidence → permanent memory, including contradictions,
// dialect coexistence, preserved verified knowledge, version
// history and Unicode.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  assessEvidenceConfidence,
  computeLanguageConfidence,
  computeOverallConfidence,
  createLanguageProfile,
  meetsLearnedBar,
  mayTransitionValidation,
  promoteRegistryStatus,
  upsertLanguageKnowledge,
  validateEntry,
} from "../evolution/language";
import type { LanguageEntry, LanguageEvidence } from "../evolution/types";

const NOW = "2026-09-09T11:00:00Z";

function evidence(
  overrides: Partial<
    Omit<LanguageEvidence, "id" | "entryId" | "createdAt">
  > = {},
): Omit<LanguageEvidence, "id" | "entryId" | "createdAt"> {
  return {
    source: "FRELUX construction dictionary",
    sourceType: "frelux_dictionary",
    reliability: 0.9,
    content: { note: "recorded" },
    ...overrides,
  };
}

function evidenceRow(
  i: number,
  e: Omit<LanguageEvidence, "id" | "entryId" | "createdAt">,
): LanguageEvidence {
  return { ...e, id: `ev-${i}`, entryId: "entry-1", createdAt: NOW };
}

function profile() {
  const r = createLanguageProfile(
    { name: "Tiv", nativeName: "Zwa Tiv", regions: ["NG"], now: NOW },
    "profile-1",
  );
  if (!r.ok) throw new Error(r.error);
  return r.profile;
}

describe("language profiles (§10, §13)", () => {
  it("creates a DISCOVERED profile — unknown is not permanent", () => {
    const r = createLanguageProfile(
      { name: "Tiv", nativeName: "Zwa Tiv", now: NOW },
      "p1",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.registryStatus).toBe("discovered");
      expect(r.profile.verificationStatus).toBe("DISCOVERED");
      expect(r.profile.confidence).toBeNull();
    }
  });

  it("FRELUX REGISTERED languages stay registered and confirmed", () => {
    const r = createLanguageProfile(
      {
        name: "Yoruba",
        nativeName: "Yorùbá",
        isFreluxRegistered: true,
        now: NOW,
      },
      "p2",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.registryStatus).toBe("frelux_registered");
      expect(r.profile.verificationStatus).toBe("CONFIRMED");
      // Registry promotion never touches registered languages.
      expect(promoteRegistryStatus(r.profile, NOW).registryStatus).toBe(
        "frelux_registered",
      );
    }
  });

  it("refuses nameless profiles", () => {
    expect(
      createLanguageProfile({ name: "", nativeName: "x", now: NOW }, "p").ok,
    ).toBe(false);
  });

  it("promotes discovered → currently_learning once learning begins", () => {
    const p = profile();
    const promoted = promoteRegistryStatus(
      { ...p, verificationStatus: "LEARNING" },
      NOW,
    );
    expect(promoted.registryStatus).toBe("currently_learning");
  });

  it("ARCHIE LEARNED requires vocabulary and translation above the bar", () => {
    expect(meetsLearnedBar({ vocabulary: 0.9, translation: 0.88 }, 0.85)).toBe(
      true,
    );
    expect(meetsLearnedBar({ vocabulary: 0.9, dialect: 0.9 }, 0.85)).toBe(
      false,
    );
    expect(meetsLearnedBar({}, 0.85)).toBe(false);
  });
});

describe("confidence (§11)", () => {
  it("computes overall confidence from available categories only", () => {
    const overall = computeOverallConfidence({
      vocabulary: 0.94,
      grammar: 0.89,
      translation: 0.91,
      pronunciation: 0.76,
      dialect: 0.52,
    });
    expect(overall).not.toBeNull();
    expect(overall!).toBeGreaterThan(0.7);
    expect(overall!).toBeLessThan(0.95);
    // Unknown ≠ zero: missing categories don't drag it down.
    expect(computeOverallConfidence({ vocabulary: 0.9 })).toBeCloseTo(0.9, 5);
    expect(computeOverallConfidence({})).toBeNull();
  });

  it("corroborated evidence scores higher than a single weak source", () => {
    const weak = assessEvidenceConfidence([
      evidenceRow(0, evidence({ reliability: 0.4 })),
    ]);
    const corroborated = assessEvidenceConfidence([
      evidenceRow(0, evidence({ reliability: 0.9 })),
      evidenceRow(
        1,
        evidence({
          sourceType: "external_reference",
          source: "Ethnologue",
          reliability: 0.85,
        }),
      ),
    ]);
    expect(corroborated!).toBeGreaterThan(weak!);
    expect(assessEvidenceConfidence([])).toBeNull();
  });
});

describe("knowledge pipeline (§9, §12)", () => {
  it("creates entries with evidence — no evidence, no memory", () => {
    const p = profile();
    const no = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "Kẹ́rẹ́",
        payload: { translation: "Chicken" },
        region: null,
        evidence: [],
        now: NOW,
      },
      [],
      "e1",
    );
    expect(no.ok).toBe(false);

    const r = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "  Ilé ",
        payload: { translation: "House", partOfSpeech: "noun" },
        region: null,
        evidence: [evidence()],
        now: NOW,
      },
      [],
      "e1",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.outcome).toBe("created");
      expect(r.entry.key).toBe("ilé"); // normalized
      expect(r.entry.validationState).toBe("LEARNING");
      expect(r.entry.confidence).not.toBeNull();
    }
  });

  it("identical knowledge is an idempotent no-op", () => {
    const p = profile();
    const first = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "Ilé",
        payload: { translation: "House" },
        region: null,
        evidence: [evidence()],
        now: NOW,
      },
      [],
      "e1",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "ilé",
        payload: { translation: "House" },
        region: null,
        evidence: [evidence()],
        now: NOW,
      },
      [first.entry],
      "e2",
    );
    expect(again.ok).toBe(true);
    if (again.ok) {
      expect(again.outcome).toBe("updated");
      expect(again.note).toContain("no change");
    }
  });

  it("dialect/regional variants coexist — they are never conflicts (§12)", () => {
    const p = profile();
    const std = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "water",
        payload: { translation: "omí" },
        region: "standard",
        evidence: [evidence()],
        now: NOW,
      },
      [],
      "e1",
    );
    expect(std.ok).toBe(true);
    if (!std.ok) return;
    const variant = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "water",
        payload: { translation: "emi" },
        region: "dialect-east",
        evidence: [evidence()],
        now: NOW,
      },
      [std.entry],
      "e2",
    );
    expect(variant.ok).toBe(true);
    if (variant.ok) expect(variant.outcome).toBe("created"); // a NEW entry, not an overwrite
  });

  it("preserves CONFIRMED knowledge against weaker contradiction — the claim goes to review", () => {
    const p = profile();
    const confirmedEntry: LanguageEntry = {
      id: "e1",
      profileId: p.id,
      kind: "vocabulary",
      key: "house",
      payload: { translation: "ilé" },
      region: null,
      confidence: 0.95,
      validationState: "CONFIRMED",
      history: [],
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "house",
        payload: { translation: "àgbàlá" },
        region: null,
        evidence: [
          evidence({
            reliability: 0.3,
            source: "random blog",
            sourceType: "external_reference",
          }),
        ],
        now: NOW,
      },
      [confirmedEntry],
      "e2",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.outcome).toBe("needs_review");
      expect(r.note).toContain("CONFIRMED knowledge was preserved");
      // The original stays intact.
      expect(confirmedEntry.payload.translation).toBe("ilé");
      expect(r.entry.validationState).toBe("NEEDS_REVIEW");
    }
  });

  it("justified updates bump the version and keep payload history", () => {
    const p = profile();
    const old: LanguageEntry = {
      id: "e1",
      profileId: p.id,
      kind: "vocabulary",
      key: "house",
      payload: { translation: "ilé" },
      region: null,
      confidence: 0.4,
      validationState: "LEARNING",
      history: [],
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "vocabulary",
        key: "house",
        payload: { translation: "ilé nílé" },
        region: null,
        evidence: [
          evidence({ reliability: 0.95 }),
          evidence({
            sourceType: "owner_provided",
            source: "owner",
            reliability: 1.0,
          }),
        ],
        now: NOW,
      },
      [old],
      "e1",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.outcome).toBe("updated");
      expect(r.entry.version).toBe(2);
      expect(r.entry.history).toHaveLength(1);
      expect(r.entry.history[0].payload.translation).toBe("ilé");
    }
  });

  it("supports Unicode scripts and multiple writing systems", () => {
    const p = profile();
    const r = upsertLanguageKnowledge(
      {
        profile: p,
        kind: "phrase",
        key: "مرحبا",
        payload: {
          translation: "Hello",
          script: "Arabic",
          transliteration: "marḥaban",
        },
        region: null,
        evidence: [evidence()],
        now: NOW,
      },
      [],
      "e1",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entry.key).toBe("مرحبا");
  });
});

describe("validation states (§9, §11)", () => {
  it("allows the pipeline transitions and blocks illegal ones", () => {
    expect(mayTransitionValidation("DISCOVERED", "LEARNING")).toBe(true);
    expect(mayTransitionValidation("LEARNING", "VALIDATING")).toBe(true);
    expect(mayTransitionValidation("VALIDATING", "CONFIRMED")).toBe(true);
    expect(mayTransitionValidation("CONFIRMED", "NEEDS_REVIEW")).toBe(true); // contradictory evidence re-opens
    expect(mayTransitionValidation("DISCOVERED", "CONFIRMED")).toBe(false); // never skip validation
    expect(mayTransitionValidation("REJECTED", "LEARNING")).toBe(false);
  });

  function entry(
    state: LanguageEntry["validationState"],
    confidence: number | null = null,
  ): LanguageEntry {
    return {
      id: "e1",
      profileId: "p1",
      kind: "vocabulary",
      key: "house",
      payload: { translation: "ilé" },
      region: null,
      confidence,
      validationState: state,
      history: [],
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  it("CONFIRMED requires threshold confidence AND 2 independent source types", () => {
    const singleSource = validateEntry({
      entry: entry("VALIDATING"),
      // One source type at perfect reliability reaches the
      // threshold — but corroboration still fails it.
      allEvidence: [evidenceRow(0, evidence({ reliability: 1.0 }))],
      minConfidenceThreshold: 0.85,
      now: NOW,
    });
    expect(singleSource.ok).toBe(true);
    if (singleSource.ok) {
      expect(singleSource.entry.validationState).toBe("NEEDS_REVIEW");
      expect(singleSource.reason).toContain("corroboration");
    }

    const corroborated = validateEntry({
      entry: entry("VALIDATING"),
      allEvidence: [
        evidenceRow(0, evidence()),
        evidenceRow(
          1,
          evidence({
            sourceType: "external_reference",
            source: "Ethnologue",
            reliability: 0.85,
          }),
        ),
      ],
      minConfidenceThreshold: 0.85,
      now: NOW,
    });
    expect(corroborated.ok).toBe(true);
    if (corroborated.ok)
      expect(corroborated.entry.validationState).toBe("CONFIRMED");
  });

  it("owner-provided evidence can confirm — the owner is an authority", () => {
    const r = validateEntry({
      entry: entry("VALIDATING"),
      allEvidence: [
        evidenceRow(
          0,
          evidence({
            sourceType: "owner_provided",
            source: "owner",
            reliability: 1.0,
          }),
        ),
      ],
      minConfidenceThreshold: 0.85,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entry.validationState).toBe("CONFIRMED");
  });

  it("low confidence stays provisional — information is uncertain, honestly stated", () => {
    const r = validateEntry({
      entry: entry("VALIDATING"),
      allEvidence: [evidenceRow(0, evidence({ reliability: 0.4 }))],
      minConfidenceThreshold: 0.85,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entry.validationState).toBe("NEEDS_REVIEW");
      expect(r.reason).toContain("below");
    }
  });

  it("no evidence at all → uncertain, never zero-confidence garbage", () => {
    const r = validateEntry({
      entry: entry("LEARNING"),
      allEvidence: [],
      minConfidenceThreshold: 0.85,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entry.validationState).toBe("NEEDS_REVIEW");
      expect(r.reason).toContain("uncertain");
    }
  });

  it("language-level confidence is computed from CONFIRMED entries only", () => {
    const confirmed = entry("CONFIRMED", 0.9);
    const provisional = entry("LEARNING", 0.99);
    const kindOf = (e: LanguageEntry) =>
      e.kind === "vocabulary"
        ? "vocabulary"
        : e.kind === "grammar"
          ? "grammar"
          : "translation";
    const c = computeLanguageConfidence([confirmed, provisional], kindOf);
    expect(c).toBeCloseTo(0.9, 5); // provisional never inflates the score
  });
});
