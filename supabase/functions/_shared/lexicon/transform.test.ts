// =========================================================
// ARCHIE Universal Lexicon Engine — TRANSFORM TESTS
//
// Tests the OEWN → lexicon transform with real dataset
// snippets: determinism, multi-sense preservation, homograph
// merging, relationship mapping, malformed-record rejection,
// provenance. Spec §18: database/ingestion layer.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  transformOewn,
  validateLemma,
  classifyUnitType,
  uuidV5,
  OEWN_SOURCE,
  type OewnEntriesFile,
  type OewnSynsetFile,
} from "./transform.ts";

// Real OEWN 2025 structure (space-separated multi-word lemmas,
// synset keys, sense ids — shaped exactly like the dataset).
const SYNSETS: OewnSynsetFile = {
  "00190414-n": {
    definition: ["a score in baseball made by a runner touching all bases safely"],
    example: ["the team scored two runs in the ninth"],
    members: ["run"],
    partOfSpeech: "n",
  },
  "01930264-v": {
    definition: ["move fast by using one's feet, with one foot off the ground at any given time"],
    example: ["Don't run — you'll be out of breath"],
    members: ["run"],
    partOfSpeech: "v",
    hypernym: ["02059573-v"],
  },
  "02691775-v": {
    definition: ["stretch out over a distance, space, time, or scope"],
    partOfSpeech: "v",
  },
};
const SYNSET_FILES: Record<string, OewnSynsetFile> = {
  "noun.act": { "00190414-n": SYNSETS["00190414-n"] },
  "verb.motion": { "01930264-v": SYNSETS["01930264-v"] },
  "verb.stative": { "02691775-v": SYNSETS["02691775-v"] },
};

const ENTRIES: OewnEntriesFile = {
  run: {
    n: {
      pronunciation: [{ value: "ɹʌn" }],
      sense: [{ id: "run%1:04:00::", synset: "00190414-n" }],
    },
    v: {
      form: ["ran", "running"],
      pronunciation: [{ value: "ɹʌn" }],
      sense: [
        { id: "run%2:38:00::", synset: "01930264-v" },
        { id: "run%2:42:00::", synset: "02691775-v" },
      ],
    },
  },
};

describe("lexicon transform — determinism", () => {
  it("uuidV5 is stable across calls and distinct per key", () => {
    const a = uuidV5("word|en|run|verb");
    const b = uuidV5("word|en|run|verb");
    const c = uuidV5("word|en|run|noun");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("re-transforming the same data yields identical ids (idempotent imports)", () => {
    const r1 = transformOewn(ENTRIES, SYNSET_FILES);
    const r2 = transformOewn(ENTRIES, SYNSET_FILES);
    expect(r1.words.map((w) => w.id)).toEqual(r2.words.map((w) => w.id));
    expect(r1.senses.map((s) => s.id)).toEqual(r2.senses.map((s) => s.id));
  });
});

describe("lexicon transform — validation", () => {
  it("accepts real lemmas including diacritics, apostrophes and multi-word forms", () => {
    expect(validateLemma("run")).toBe(true);
    expect(validateLemma("give up")).toBe(true);
    expect(validateLemma("table d'hote")).toBe(true);
    expect(validateLemma("Arlêng")).toBe(true);
    expect(validateLemma("24/7")).toBe(true);
    expect(validateLemma("LGBTQIA+")).toBe(true);
  });

  it("rejects malformed lemmas", () => {
    expect(validateLemma("")).toBe(false);
    expect(validateLemma("a".repeat(81))).toBe(false);
  });

  it("classifies phrasal verbs as PHRASAL_VERB, not plain words", () => {
    expect(classifyUnitType("give up", "v")).toBe("PHRASAL_VERB");
    expect(classifyUnitType("give away", "v")).toBe("PHRASAL_VERB");
    expect(classifyUnitType("run", "v")).toBe("WORD");
    expect(classifyUnitType("give a damn", "v")).toBe("MULTI_WORD_EXPRESSION");
  });
});

describe("lexicon transform — multi-sense preservation", () => {
  const r = transformOewn(ENTRIES, SYNSET_FILES);

  it("never collapses meanings: run/verb keeps separate senses", () => {
    const runVerb = r.words.find(
      (w) => w.normalized === "run" && w.part_of_speech === "verb",
    );
    expect(runVerb).toBeTruthy();
    const runSenses = r.senses.filter((s) => s.word_id === runVerb!.id);
    expect(runSenses.length).toBe(2);
    expect(runSenses[0].definition).toContain("move fast");
    expect(runSenses[1].definition).toContain("stretch out over a distance");
  });

  it("keeps pronunciation, spelling variants and inflections", () => {
    const runVerb = r.words.find(
      (w) => w.normalized === "run" && w.part_of_speech === "verb",
    )!;
    expect(runVerb.pronunciation).toContain("ɹʌn");
    expect(runVerb.spelling_variants).toEqual(["ran", "running"]);
    expect(runVerb.inflection_metadata).toEqual({ forms: ["ran", "running"] });
    expect(runVerb.frequency).toBeNull(); // never fabricated
  });

  it("marks dataset senses VERIFIED with provenance-grade confidence and honest nulls", () => {
    for (const s of r.senses) {
      expect(s.knowledge_status).toBe("VERIFIED");
      expect(s.confidence).toBe(1.0); // directly sourced
      expect(s.register).toBeNull(); // not sourced → never guessed
      expect(s.region).toBeNull();
    }
  });

  it("domain metadata comes from the lexicographer file (real metadata)", () => {
    const runNoun = r.words.find(
      (w) => w.normalized === "run" && w.part_of_speech === "noun",
    )!;
    const nounSense = r.senses.find((s) => s.word_id === runNoun.id)!;
    expect(nounSense.domain).toBe("noun.act");
  });

  it("preserves usage examples verbatim", () => {
    const verbSense = r.senses.find((s) => s.external_id === "run%2:38:00::")!;
    expect(verbSense.usage_examples[0]).toContain("out of breath");
  });
});

describe("lexicon transform — relationships", () => {
  it("materializes hypernym and its deterministic hyponym inverse", () => {
    const r = transformOewn(ENTRIES, SYNSET_FILES);
    const hyp = r.synsetRelations.filter((x) => x.relation_type === "HYPERNYM");
    const hypon = r.synsetRelations.filter((x) => x.relation_type === "HYPONYM");
    expect(hyp).toEqual([
      { relation_type: "HYPERNYM", from_synset_key: "01930264-v", to_synset_key: "02059573-v" },
    ]);
    expect(hypon).toEqual([
      { relation_type: "HYPONYM", from_synset_key: "02059573-v", to_synset_key: "01930264-v" },
    ]);
  });

  it("parses the composite sense-relation format (from:antonym:to)", () => {
    const entries: OewnEntriesFile = {
      hot: {
        a: {
          sense: [{
            id: "hot%3:00:00::",
            synset: "00112345-a",
            antonym: ["hot%3:00:00:::antonym:cold%3:00:00::"],
          }],
        },
      },
    };
    const synsets: Record<string, OewnSynsetFile> = {
      "adj.all": {
        "00112345-a": { definition: ["used of physical heat"], partOfSpeech: "a" },
      },
    };
    const r = transformOewn(entries, synsets);
    expect(r.senseRelations).toEqual([{
      relation_type: "ANTONYM",
      from_sense_external_id: "hot%3:00:00::",
      to_sense_external_id: "cold%3:00:00::",
    }]);
  });

  it("rejects senses pointing at synsets missing from the dataset", () => {
    const entries: OewnEntriesFile = {
      orphan: { n: { sense: [{ id: "orphan%1:04:00::", synset: "99999999-n" }] } },
    };
    const r = transformOewn(entries, SYNSET_FILES);
    expect(r.senses.length).toBe(0);
    expect(r.rejected.length).toBe(1);
    expect(r.rejected[0].reason).toContain("not present");
  });
});

describe("lexicon transform — provenance", () => {
  it("carries the real OEWN license and attribution (CC BY 4.0)", () => {
    expect(OEWN_SOURCE.license).toMatch(/Creative Commons Attribution 4\.0/);
    expect(OEWN_SOURCE.attribution).toMatch(/Open English WordNet Team/);
    expect(OEWN_SOURCE.attribution).toMatch(/Princeton/);
    expect(OEWN_SOURCE.url).toContain("2025-edition");
  });
});
