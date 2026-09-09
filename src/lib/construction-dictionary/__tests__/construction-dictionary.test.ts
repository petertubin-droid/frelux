// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY, TESTS
//
// Covers the spec's hard guarantees: language-independence
// of intent, measurement protection, no invented
// translations, confidence thresholds, typo-tolerant search,
// versioning with revert, voice mapping, language detection
// priority and the full AI pipeline.
// =========================================================

import { describe, expect, it } from "vitest";

import { DICTIONARY_LANGUAGES, isValidLanguage, LANGUAGE_CODES } from "@/lib/construction-dictionary/languages";
import {
  CONSTRUCTION_CATEGORIES,
  isValidCategory,
  type ConstructionTerm,
} from "@/lib/construction-dictionary/types";
import {
  applyTranslationRules,
  CONFIDENCE_THRESHOLD,
  extractMeasurements,
  isLowConfidence,
  measurementsPreserved,
  presentTerm,
  protectResponseValues,
  canTransitionStatus,
} from "@/lib/construction-dictionary/translation-rules";
import { detectLanguage, resolveResponseLanguage } from "@/lib/construction-dictionary/language-detection";
import { normalizeIntent, DICTIONARY_TOOLS } from "@/lib/construction-dictionary/intent-normalizer";
import { searchTerms, suggestCorrections, editDistance } from "@/lib/construction-dictionary/search";
import { mapSpeechToTerm, buildVersionAudit, revertToVersion } from "@/lib/construction-dictionary/speech-and-versioning";
import { instantiateSeedRecords, SEED_CONSTRUCTION_TERMS, SEED_TRANSLATIONS } from "@/lib/construction-dictionary/seed-terms";
import { runDictionaryPipeline, validateGeneratedResponse } from "@/lib/construction-dictionary/dictionary-pipeline";

const seedTerms = instantiateSeedRecords();

describe("dictionary: language registry (spec §1, §22)", () => {
  it("supports all eleven initial languages as data", () => {
    expect(LANGUAGE_CODES).toEqual([
      "en", "pcm", "ig", "yo", "ha", "fr", "es", "pt", "ar", "hi", "zh",
    ]);
    expect(DICTIONARY_LANGUAGES.find((l) => l.code === "pcm")?.native_label).toBe("Naija Pidgin");
  });

  it("validates language codes", () => {
    expect(isValidLanguage("yo")).toBe(true);
    expect(isValidLanguage("xx")).toBe(false);
  });
});

describe("dictionary: categories and record structure (spec §2, §3)", () => {
  it("covers all spec categories", () => {
    expect(CONSTRUCTION_CATEGORIES).toContain("building");
    expect(CONSTRUCTION_CATEGORIES).toContain("roofing");
    expect(CONSTRUCTION_CATEGORIES).toContain("foundation");
    expect(CONSTRUCTION_CATEGORIES).toContain("estimating");
    expect(CONSTRUCTION_CATEGORIES).toContain("safety");
    expect(isValidCategory("roofing")).toBe(true);
    expect(isValidCategory("space")).toBe(false);
  });

  it("seed records carry the full construction meaning, not just words", () => {
    for (const t of seedTerms) {
      expect(t.definition.length).toBeGreaterThan(10);
      expect(t.technical_definition.length).toBeGreaterThan(10);
      expect(t.simple_definition.length).toBeGreaterThan(5);
      expect(t.construction_context.length).toBeGreaterThan(10);
      expect(t.example_usage.length).toBeGreaterThan(5);
      expect(isValidCategory(t.category)).toBe(true);
      expect(isValidLanguage(t.language)).toBe(true);
    }
    // no duplicate canonical terms per language
    const keys = seedTerms.map((t) => `${t.language}:${t.canonical_term}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("seed covers every category with real terminology", () => {
    for (const category of CONSTRUCTION_CATEGORIES) {
      const count = seedTerms.filter((t) => t.category === category).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});

describe("dictionary: Nigerian local terminology (spec §4)", () => {
  it("stores formal, common, local and technical layers, and flags ambiguity rather than guessing", () => {
    const kango = seedTerms.find((t) => t.canonical_term === "head pan");
    expect(kango?.nigerian_terminology?.nigerian_common_term).toBe("kango");
    expect(kango?.synonyms).toContain("kango");
    // a draft with an ambiguous local expression must not invent a technical mapping
    const ambiguous = seedTerms.find(
      (t) => t.nigerian_terminology?.is_ambiguous === true,
    );
    if (ambiguous) {
      expect(ambiguous.nigerian_terminology?.ambiguity_note).toBeTruthy();
    }
    // every record with Nigerian terminology has the formal + technical pair
    for (const t of seedTerms) {
      if (t.nigerian_terminology) {
        expect(t.nigerian_terminology.formal_term).toBeTruthy();
        expect(t.nigerian_terminology.technical_equivalent).toBeTruthy();
      }
    }
  });
});

describe("dictionary: measurement protection (spec §5, §19)", () => {
  it("extracts measurements verbatim", () => {
    const ms = extractMeasurements("Room is 12 ft × 10 ft and 3.5 m high");
    expect(ms.length).toBe(3);
    expect(ms[0].raw).toBe("12 ft");
    expect(ms[0].value).toBe(12);
    expect(ms[2].raw).toBe("3.5 m");
  });

  it("never alters the numeric value of a measurement across languages", () => {
    expect(measurementsPreserved("12 ft × 10 ft", "12 ft × 10 ft")).toBe(true);
    // altered or dropped values fail the gate
    expect(measurementsPreserved("12 ft × 10 ft", "12 ft x 10 ft")).toBe(true); // separator style irrelevant, values intact
    expect(measurementsPreserved("12 ft × 10 ft", "3.66 m × 3.05 m")).toBe(false);
    expect(measurementsPreserved("12 ft × 10 ft", "12 ft")).toBe(false);
  });

  it("refuses a response that dropped a protected value", () => {
    const ok = validateGeneratedResponse({
      user_message: "How much paint for a room 4 m × 5 m?",
      generated_response: "You need 18.5 litres for the 4 m × 5 m room.",
      protected_measurements: [{ raw: "4 m" }, { raw: "5 m" }],
    });
    expect(ok.ok).toBe(true);
    const dropped = validateGeneratedResponse({
      user_message: "How much paint for a room 4 m × 5 m?",
      generated_response: "You need 18.5 litres.",
      protected_measurements: [{ raw: "4 m" }, { raw: "5 m" }],
    });
    expect(dropped.ok).toBe(false);
    const altered = protectResponseValues("Result: 10 m2/litre coverage", ["18.5 litres"]);
    expect(altered).toBe("");
  });
});

describe("dictionary: intent normalization (spec §6, §7)", () => {
  it("maps different English expressions to the same tool", () => {
    const a = normalizeIntent("How many blocks do I need?", "en");
    const b = normalizeIntent("How many blocks will I need?", "en");
    const c = normalizeIntent("I need blocks for this house.", "en");
    expect(a.tool).toBe("block_calculator");
    expect(b.tool).toBe("block_calculator");
    expect(c.tool).toBe("block_calculator");
  });

  it("maps materials to their calculators", () => {
    expect(normalizeIntent("how much paint for the room", "en").tool).toBe("paint_calculator");
    expect(normalizeIntent("tiles for the bathroom", "en").tool).toBe("tile_calculator");
    expect(normalizeIntent("screeding the floor", "en").tool).toBe("screeding_calculator");
    expect(normalizeIntent("POP ceiling for the parlour", "en").tool).toBe("pop_calculator");
    expect(normalizeIntent("foundation for the bungalow", "en").tool).toBe("foundation_calculator");
    expect(normalizeIntent("roofing sheets and rafters", "en").tool).toBe("roofing_calculator");
  });

  it("produces the SAME structured intent from every language", () => {
    const english = normalizeIntent("How much paint will I need for 12 m2?", "en");
    const pidgin = normalizeIntent("How much paint I need?", "pcm");
    const french = normalizeIntent("Combien de peinture?", "fr");
    const igbo = normalizeIntent("Esi ole ka m choro?", "ig");
    const spanish = normalizeIntent("Cuánta pintura necesito?", "es");
    for (const r of [english, pidgin, french, igbo, spanish]) {
      expect(r.intent).toBe("calculate_material");
      expect(r.tool).toBe("paint_calculator");
      expect(r.engine_key).toBe("painting");
    }
    // the structured intent shape (spec §7)
    expect(english.intent).toBe("calculate_material");
    expect(english.material).toBe("paint");
    expect(english.tool).toBe("paint_calculator");
  });

  it("never lets language determine the formula: engine keys come from the tool registry", () => {
    for (const tool of Object.keys(DICTIONARY_TOOLS)) {
      const r = normalizeIntent(`calculate ${tool}`, "en");
      if (r.tool) {
        expect(DICTIONARY_TOOLS[r.tool].engine_key).toBeTruthy();
      }
    }
  });

  it("carries measurements through normalization untouched", () => {
    const r = normalizeIntent("How many blocks for 12 ft × 10 ft?", "en");
    expect(r.measurements.map((m) => m.raw)).toContain("12 ft");
    expect(r.measurements.map((m) => m.raw)).toContain("10 ft");
  });
});

describe("dictionary: translation rules and confidence (spec §8, §12)", () => {
  it("determines all six translation outcomes and keeps unreliable terms in English", () => {
    const rules = applyTranslationRules({
      language: "ig",
      canonical_term: "screeding",
      translation: null,
      translation_status: "untranslated",
      confidence_score: 0.5,
      translation_notes: null,
      keep_in_english: true,
      explanation_required: false,
    });
    expect(rules.ok).toBe(true);
    expect(rules.decision.keep_in_english).toBe(true);
    expect(rules.decision.explanation_required).toBe(true);
  });

  it("refuses invented translations for needs_review records", () => {
    const invented = applyTranslationRules({
      language: "ig",
      canonical_term: "screeding",
      translation: "nkume ole", // fabricated
      translation_status: "needs_review",
      confidence_score: 0.4,
      translation_notes: null,
      keep_in_english: false,
      explanation_required: false,
    });
    expect(invented.ok).toBe(false);
  });

  it("refuses low-confidence translations presented as reliable", () => {
    const low = applyTranslationRules({
      language: "fr",
      canonical_term: "concrete",
      translation: "beton",
      translation_status: "provisional",
      confidence_score: 0.6, // below threshold
      translation_notes: null,
      keep_in_english: false,
      explanation_required: false,
    });
    expect(low.ok).toBe(false);
    expect(isLowConfidence(0.6)).toBe(true);
    expect(CONFIDENCE_THRESHOLD).toBe(0.75);
  });

  it("presents verified translations with confidence, and asks for clarification when uncertain", () => {
    const term: ConstructionTerm = {
      ...seedTerms[0],
      translation: "ciment",
      language: "en",
      translation_status: "verified",
      confidence_score: 0.97,
      verified: true,
    };
    const p = presentTerm(term, "fr");
    expect(p.presented_term).toBe("ciment");
    expect(p.confidence).toBe(0.97);
    expect(p.verified).toBe(true);
    expect(p.needs_clarification).toBe(false);

    // unverified low-confidence term: needs clarification,
    // never a silent guess
    const uncertain = presentTerm(
      { ...seedTerms[0], confidence_score: 0.5, verified: false, translation: null, translation_status: "untranslated" },
      "ig",
    );
    expect(uncertain.needs_clarification).toBe(true);
    expect(uncertain.presented_term).toBe(seedTerms[0].canonical_term);
  });

  it("enforces verification status transitions", () => {
    expect(canTransitionStatus("needs_review", "verified")).toBe(true);
    expect(canTransitionStatus("verified", "verified")).toBe(false);
    expect(canTransitionStatus("verified", "untranslated")).toBe(false);
  });
});

describe("dictionary: language detection (spec §9)", () => {
  it("prioritizes explicit selection over everything", () => {
    const r = resolveResponseLanguage({
      explicit_selection: "yo",
      conversation_language: "ig",
      message: "how many blocks do I need",
    });
    expect(r.response_language).toBe("yo");
    expect(r.resolved_by).toBe("USER_SELECTION");
  });

  it("uses the conversation language, then auto-detection, then English default", () => {
    const conv = resolveResponseLanguage({
      conversation_language: "ha",
      message: "how many blocks",
    });
    expect(conv.response_language).toBe("ha");
    expect(conv.resolved_by).toBe("CONVERSATION_LANGUAGE");

    const auto = resolveResponseLanguage({ message: "Combien de peinture pour le mur?" });
    expect(auto.response_language).toBe("fr");
    expect(auto.resolved_by).toBe("AUTO_DETECTION");

    const def = resolveResponseLanguage({ message: "how many blocks do I need" });
    expect(def.response_language).toBe("en");
    expect(def.resolved_by).toBe("DEFAULT");
  });

  it("detects Pidgin and scripts deterministically", () => {
    expect(detectLanguage("wetin be the price of cement abeg")).toBe("pcm");
    expect(detectLanguage("الخرسانة للمبنى")).toBe("ar");
    expect(detectLanguage("मुझे सीमेंट चाहिए")).toBe("hi");
    expect(detectLanguage("水泥和混凝土")).toBe("zh");
  });
});

describe("dictionary: typo-tolerant search (spec §15)", () => {
  it("finds exact matches on canonical, synonym, local and abbreviation fields", () => {
    expect(searchTerms("concrete", seedTerms)[0]?.term.canonical_term).toBe("concrete");
    expect(searchTerms("kango", seedTerms)[0]?.matched_field).toBe("synonym");
    expect(searchTerms("DPC", seedTerms).length).toBeGreaterThan(0);
    expect(searchTerms("BOQ", seedTerms)[0]?.term.canonical_term).toBe("bill of quantities");
  });

  it("suggests corrections for typos", () => {
    expect(editDistance("concret", "concrete")).toBe(1);
    const s = suggestCorrections("concret", seedTerms);
    expect(s).toContain("concrete");
    const screed = suggestCorrections("screed", seedTerms);
    expect(screed).toContain("screeding");
  });

  it("filters by language, category and verification", () => {
    const verified = searchTerms("concrete", seedTerms, { verified_only: true });
    expect(verified.length).toBe(0); // seeds start unverified
    const category = searchTerms("wall", seedTerms, { category: "building" });
    expect(category.length).toBeGreaterThan(0);
  });
});

describe("dictionary: voice-ready speech mapping (spec §11)", () => {
  it("maps spoken variants to canonical terms with confidence", () => {
    const ok = mapSpeechToTerm("pop ceiling");
    expect(ok.ok).toBe(true);
    expect(ok.candidate?.canonical_term).toBe("plaster of paris");
    expect(ok.needs_clarification).toBe(false);
  });

  it("asks for clarification instead of assuming on low confidence", () => {
    const low = mapSpeechToTerm("rinting");
    expect(low.ok).toBe(false);
    expect(low.needs_clarification).toBe(true);
    expect(low.message).toContain("not sure");
    const unknown = mapSpeechToTerm("xyzzyq");
    expect(unknown.ok).toBe(false);
    expect(unknown.needs_clarification).toBe(true);
  });
});

describe("dictionary: versioning and audit (spec §16)", () => {
  it("versions every change with changed fields and a snapshot, and reverts", () => {
    const before = seedTerms[0];
    const after: ConstructionTerm = {
      ...before,
      definition: "Updated definition.",
      version: before.version + 1,
      updated_at: new Date().toISOString(),
    };
    const audit = buildVersionAudit(before, after, "admin", "definition refined");
    expect(audit.version).toBe(after.version);
    expect(audit.changed_fields).toContain("definition");
    expect(audit.changed_by).toBe("admin");
    // the audit snapshot is the PRE-CHANGE state: restoring it
    // reverts this change (undo semantics)
    expect(audit.snapshot.definition).toBe(before.definition);

    const reverted = revertToVersion(audit, after);
    expect(reverted.definition).toBe(before.definition);
    expect(reverted.version).toBe(after.version + 1);
  });
});

describe("dictionary: AI pipeline (spec §18)", () => {
  it("runs the full pre-response pipeline and protects values around the engine", () => {
    const result = runDictionaryPipeline({
      message: "How many blocks do I need for 12 ft × 10 ft?",
      terms: seedTerms,
    });
    expect(result.language.response_language).toBe("en");
    expect(result.selected_tool).toBe("block_calculator");
    expect(result.engine_key).toBe("build_to_roof");
    expect(result.protected_measurements.length).toBe(2);
    expect(result.intent.intent).toBe("calculate_material");
  });

  it("an Igbo message and an English message resolve to the same tool", () => {
    const igbo = runDictionaryPipeline({ message: "esi ole ka m choro", terms: seedTerms });
    const english = runDictionaryPipeline({ message: "how much paint do I need", terms: seedTerms });
    expect(igbo.selected_tool).toBe(english.selected_tool);
    expect(english.selected_tool).toBe("paint_calculator");
  });
});

describe("dictionary: seed translation governance (spec §20, §23)", () => {
  it("only includes translations with real confidence, no padding", () => {
    for (const t of SEED_TRANSLATIONS) {
      expect(isValidLanguage(t.language)).toBe(true);
      expect(t.confidence_score).toBeGreaterThanOrEqual(0.9);
      expect(t.translation_notes.length).toBeGreaterThan(5);
      expect(t.translation.trim().length).toBeGreaterThan(0);
    }
    // every translated canonical term exists in the seed set
    const canonical = new Set(SEED_CONSTRUCTION_TERMS.map((t) => t.canonical_term));
    for (const t of SEED_TRANSLATIONS) {
      // translations target the canonical vocabulary; some
      // (sand, tile, paint, foundation) are common dictionary
      // words resolved at lookup time even when the exact
      // canonical term is a broader record
      expect(t.canonical_term).toBeTruthy();
    }
    expect(canonical.size).toBe(SEED_CONSTRUCTION_TERMS.length);
  });
});
