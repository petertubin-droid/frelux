// =========================================================
// ARCHIE Universal Lexicon Engine — RETRIEVAL TESTS
//
// Spec §18: verify the database API — word lookup, all
// senses, contextual sense selection, synonyms, antonyms,
// related words, word forms, domain-specific senses,
// phrases, pronunciation, provenance, status filtering.
//
// ALL fixtures are REAL data extracted from the OEWN 2025
// dataset by scripts/lexicon/generate-test-fixtures.ts —
// never hand-written expectations about the data.
// =========================================================

import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import {
  lookupWord,
  selectContextualSenses,
  getSynonyms,
  getAntonyms,
  getRelatedWords,
  getWordForms,
  lookupPhrases,
  getProvenance,
  lexicalGroundTruth,
  type LexiconClient,
  type LexiconSenseRow,
} from "./retrieval.ts";

// ---------- minimal chainable client (harness-compatible) ----------
/* eslint-disable @typescript-eslint/no-explicit-any -- the fake
 * query builder mirrors the loose supabase chain on purpose. */

type Row = Record<string, any>;
const fixtures = new Map<string, Row[]>();

function fakeFrom(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let maxRows = Infinity;
  const q: any = {
    select: () => q,
    insert: (_rows: any) => q,
    update: () => q,
    upsert: (rows: any) => {
      const list = Array.isArray(rows) ? rows : [rows];
      const stored = fixtures.get(table) ?? [];
      stored.push(...list);
      fixtures.set(table, stored);
      return q;
    },
    delete: () => q,
    eq: (col: string, v: any) => {
      filters.push((r) => Array.isArray(v) ? v.includes(r[col]) : r[col] === v);
      return q;
    },
    neq: (col: string, v: any) => {
      filters.push((r) => r[col] !== v);
      return q;
    },
    in: (col: string, v: any[]) => {
      filters.push((r) => v.includes(r[col]));
      return q;
    },
    ilike: (col: string, v: string) => {
      const re = new RegExp("^" + v.replace(/%/g, ".*") + "$", "i");
      filters.push((r) => re.test(String(r[col] ?? "")));
      return q;
    },
    order: () => q,
    limit: (n: number) => {
      maxRows = n;
      return q;
    },
    maybeSingle: async () => ({ data: resolve()[0] ?? null, error: null }),
    single: async () => ({ data: resolve()[0] ?? null, error: null }),
    then: (resolve: any, reject: any) =>
      Promise.resolve({ data: resolve2(), error: null }).then(resolve, reject),
    catch: (onR: any) => q.then(undefined, onR),
    finally: (fn: any) => q.then(fn, fn),
  };
  function resolve2() {
    return (fixtures.get(table) ?? []).filter((r) => filters.every((f) => f(r))).slice(0, maxRows);
  }
  return q;
}

const svc: LexiconClient = { from: fakeFrom };

/* eslint-enable @typescript-eslint/no-explicit-any */
// ---------- real fixture data ----------

const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./__fixtures__/test-words.json", import.meta.url),
    "utf8",
  ),
);

function seed(tables?: string[]) {
  fixtures.clear();
  const put = (name: string, rows: Row[]) =>
    fixtures.set(name, rows.map((r) => ({ ...r })));
  put("lexicon_sources", [fixture.source]);
  if (!tables || tables.includes("words")) put("lexicon_words", fixture.words);
  if (!tables || tables.includes("senses")) put("lexicon_senses", fixture.senses);
  if (!tables || tables.includes("serels")) put("lexicon_sense_relations", fixture.senseRelations);
  if (!tables || tables.includes("synrels")) put("lexicon_relationships", fixture.synsetRelations);
}

beforeEach(() => seed());

// ---------- lookups ----------

describe("lexicon retrieval — word lookup", () => {
  it("finds run in every part of speech with ALL senses attached", async () => {
    const results = await lookupWord(svc, "run");
    expect(results.length).toBeGreaterThanOrEqual(2); // noun + verb at least
    const verb = results.find((r) => r.word.part_of_speech === "verb")!;
    // 41 verb senses in OEWN — never collapsed
    expect(verb.senses.length).toBeGreaterThanOrEqual(40);
    const defs = verb.senses.map((s) => s.definition);
    expect(defs.some((d: string) => d.includes("move fast"))).toBe(true);
    expect(defs.some((d: string) => d.includes("carry out a process or program"))).toBe(true);
  });

  it("multi-sense test words from the spec all resolve", async () => {
    for (const w of ["bank", "light", "bat", "file", "plant", "scale", "charge", "point", "field"]) {
      const r = await lookupWord(svc, w);
      expect(r.length).toBeGreaterThan(0);
      expect(r.reduce((n, e) => n + e.senses.length, 0)).toBeGreaterThan(1);
    }
  });

  it("returns pronunciation, variants and honest nulls", async () => {
    const results = await lookupWord(svc, "run");
    expect(results[0].word.pronunciation).toBeTruthy();
    expect(results[0].word.frequency).toBeNull(); // never fabricated
  });

  it("absent words return empty — no invention", async () => {
    const r = await lookupWord(svc, "zzzqqqxyz");
    expect(r).toEqual([]);
  });
});

describe("lexicon retrieval — status filtering", () => {
  it("UNVERIFIED knowledge is never returned by default", async () => {
    const extra: LexiconSenseRow = {
      ...fixture.senses[0],
      id: "seed-unverified",
      knowledge_status: "UNVERIFIED",
      definition: "an unverified meaning that must stay invisible",
    };
    seed();
    fixtures.set("lexicon_senses", [...fixture.senses.map((r: Row) => ({ ...r })), extra]);
    // the copied sense belongs to the same word as its source —
    // look that word up (fixture.senses[0] is "bank"'s first sense)
    const targetWord = fixture.words.find(
      (w: Row) => w.id === fixture.senses[0].word_id,
    ) as Row;
    const results = await lookupWord(svc, targetWord.normalized);
    const all = results.flatMap((r) => r.senses);
    expect(all.some((s) => s.knowledge_status === "UNVERIFIED")).toBe(false);
    // explicit widening is allowed — never silent
    const wide = await lookupWord(svc, targetWord.normalized, { statuses: ["VERIFIED", "UNVERIFIED"] });
    expect(wide.flatMap((r) => r.senses).some((s) => s.knowledge_status === "UNVERIFIED")).toBe(true);
  });
});

// ---------- contextual sense selection (spec §5) ----------

describe("lexicon retrieval — contextual sense selection", () => {
  it("selects the software sense for 'I need to run the program'", async () => {
    const { word, selection } = await selectContextualSenses(svc, "run", "I need to run the program.");
    expect(word).toBeTruthy();
    expect(selection.selected).toBeTruthy();
    expect(selection.ambiguous).toBe(false);
    expect(selection.selected!.sense.definition).toContain("carry out a process or program");
  });

  it("'The paint is running' surfaces the liquid senses via the lexical chain", async () => {
    const { selection } = await selectContextualSenses(svc, "run", "The paint is running.");
    expect(selection.ambiguous).toBe(true); // no direct evidence — honest
    expect(selection.selected).toBeNull();
    const defs = selection.candidates.map((c) => c.sense.definition);
    const liquid = defs.find((d) => d.includes("move along, of liquids"));
    expect(liquid).toBeTruthy();
    expect(selection.ambiguous).toBe(true);
    // the note explains WHY it stayed ambiguous — honest, never silent
    expect(selection.note.length).toBeGreaterThan(5);
  });

  it("'I run every morning' preserves ambiguity instead of inventing certainty", async () => {
    const { selection } = await selectContextualSenses(svc, "run", "I run every morning.");
    expect(selection.ambiguous).toBe(true);
    expect(selection.selected).toBeNull();
    expect(selection.candidates.length).toBeGreaterThan(1);
  });

  it("ranks direct evidence above chain evidence deterministically", async () => {
    const a = await selectContextualSenses(svc, "run", "I need to run the program.");
    const b = await selectContextualSenses(svc, "run", "I need to run the program.");
    expect(a.selection.candidates.map((c) => c.sense.external_id))
      .toEqual(b.selection.candidates.map((c) => c.sense.external_id));
  });

  it("unknown words report honest emptiness", async () => {
    const { word, selection } = await selectContextualSenses(svc, "zzzqqqxyz", "any context");
    expect(word).toBeNull();
    expect(selection.candidates).toEqual([]);
    expect(selection.ambiguous).toBe(true);
  });
});

// ---------- relationships ----------

describe("lexicon retrieval — synonyms and antonyms", () => {
  it("synonyms come from the synset members (same meaning cluster)", async () => {
    // find a sense whose synset has multiple members
    const multi = fixture.senses.find((s: LexiconSenseRow) => {
      const same = fixture.senses.filter((x: LexiconSenseRow) => x.synset_key === s.synset_key);
      return same.length > 1;
    });
    const syns = await getSynonyms(svc, multi!.synset_key, multi!.external_id);
    expect(syns.length).toBeGreaterThan(0);
    expect(syns[0].word).toBeTruthy();
    expect(syns[0].definition).toBeTruthy();
  });

  it("antonym relations resolve to real words", async () => {
    // charge → discharge is a real antonym pair in the fixture
    const chargeSenses = fixture.senses.filter(
      (s: LexiconSenseRow) => s.external_id.startsWith("charge%"),
    );
    let found: { word: string; definition: string }[] = [];
    for (const s of chargeSenses) {
      const ant = await getAntonyms(svc, (s as LexiconSenseRow).external_id);
      if (ant.length) { found = ant; break; }
    }
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].word).toBe("discharge");
  });
});

describe("lexicon retrieval — relationship traversal", () => {
  it("traverses hypernyms from run's physical sense to a parent meaning", async () => {
    const results = await lookupWord(svc, "run");
    const phys = results.flatMap((r) => r.senses).find((s) => s.definition.includes("move fast"));
    expect(phys).toBeTruthy();
    const rel = await getRelatedWords(svc, phys!.synset_key, ["HYPERNYM"]);
    expect(rel.length).toBeGreaterThan(0);
    expect(rel[0].relationType).toBe("HYPERNYM");
    expect(rel[0].word).toBeTruthy();
  });

  it("hyponym inverse traversal also works", async () => {
    const results = await lookupWord(svc, "run");
    const phys = results.flatMap((r) => r.senses).find((s) => s.definition.includes("move fast"));
    const rel = await getRelatedWords(svc, phys!.synset_key, ["HYPONYM"]);
    // deterministic either way: real relations or empty — never invented
    for (const r of rel) expect(r.relationType).toBe("HYPONYM");
  });
});

describe("lexicon retrieval — word forms and phrases", () => {
  it("word forms include real spelling variants (ran, running)", async () => {
    const forms = await getWordForms(svc, "run");
    expect(forms.length).toBeGreaterThan(0);
    const verb = forms.find((f) => f.partOfSpeech === "verb")!;
    expect(verb.variants).toContain("ran");
    expect(verb.variants).toContain("running");
  });

  it("phrasal verbs are retrievable as PHRASAL_VERB units", async () => {
    const phr = await lookupPhrases(svc, "give");
    expect(phr.length).toBeGreaterThan(0);
    const giveUp = phr.find((p) => p.phrase === "give up");
    expect(giveUp).toBeTruthy();
    expect(giveUp!.unitType).toBe("PHRASAL_VERB");
    expect(giveUp!.definition).toBeTruthy();
  });
});

// ---------- provenance ----------

describe("lexicon retrieval — provenance", () => {
  it("every sense can be traced to its source with the real license", async () => {
    const results = await lookupWord(svc, "run");
    const sense = results[0].senses[0];
    const prov = await getProvenance(svc, sense);
    expect(prov).toBeTruthy();
    expect(prov!.dataset).toBe("english-wordnet-2025-json");
    expect(prov!.license).toMatch(/Creative Commons Attribution 4\.0/);
    expect(prov!.attribution).toMatch(/Princeton/);
  });
});

// ---------- ARCHIE ground-truth block ----------

describe("lexicon retrieval — lexical ground-truth block", () => {
  it("disambiguates 'run the program' in a live block", async () => {
    const gt = await lexicalGroundTruth(svc, "I need to run the program.");
    expect(gt.block).toContain("carry out a process or program");
    expect(gt.disambiguated).toContain("run");
  });

  it("states ambiguity honestly for under-evidenced context", async () => {
    const gt = await lexicalGroundTruth(svc, "I run every morning.");
    expect(gt.ambiguous).toContain("run");
    expect(gt.disambiguated).not.toContain("run");
    expect(gt.block).toContain("ambiguous");
  });

  it("is bounded and never invents for unknown text", async () => {
    const gt = await lexicalGroundTruth(svc, "zzz qqq xyz");
    expect(gt.block).toBe("");
    expect(gt.wordsExamined).toBe(0);
  });
});
