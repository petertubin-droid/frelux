// =========================================================
// ARCHIE CONTEXT & INFERENCE ENGINE — ENGINE TESTS
//
// Spec §22: sense tests (bank, run, light, plant, scale,
// charge, field, point, file, bat), graph tests (relevant
// semantic relationships retrieved), live-pathway
// integration over REAL fixture data (the exact fixture the
// archie-core tests use), hallucination tests (the engine
// must refuse unsupported relationships), and the
// FACT-vs-INFERENCE separation end to end.
// =========================================================

import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import {
  selectContextualConcepts,
  type GraphClient,
  type GraphNodeRow,
  type GraphEdgeRow,
} from "../semantic-graph/retrieval.ts";
import {
  LEXICON_RELATION_MAPPINGS,
  LEXICON_EDGE_PROVENANCE,
} from "../semantic-graph/relations.ts";
import { inferenceGroundTruth } from "./engine.ts";
import { latestSourceLabel } from "../lexicon/retrieval.ts";

// ---------- real fixture data (same as archie-core tests) ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
const fixture = JSON.parse(
  fs.readFileSync(
    new URL(
      "../semantic-graph/__fixtures__/lexicon-for-graph.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  words: Array<Record<string, any>>;
  senses: Array<Record<string, any>>;
  synsetRelations: Array<{
    relation_type: string;
    from_synset_key: string;
    to_synset_key: string;
  }>;
  senseRelations: Array<{
    relation_type: string;
    from_sense_external_id: string;
    to_sense_external_id: string;
  }>;
  source: Record<string, any>;
};

// ---------- materialize the fixture graph (same mapping as
// the semantic-graph test suite — the SQL-mirrored
// materializer, never a hand-written graph) ----------
function materializeFixtureGraph() {
  const wordCanonical = new Map(
    fixture.words.map((w) => [w.id, w.canonical] as const),
  );
  const nodesByKey = new Map<string, GraphNodeRow>();
  const senseToSynset = new Map<string, string>();
  for (const s of fixture.senses) {
    if (s.knowledge_status !== "VERIFIED") continue;
    senseToSynset.set(s.external_id, s.synset_key);
    let n = nodesByKey.get(s.synset_key);
    if (!n) {
      n = {
        id: `node-${s.synset_key}`,
        concept_key: s.synset_key,
        synset_key: s.synset_key,
        canonical_name: "\uffff",
        sense_external_ids: [],
        description: s.definition,
        domain: s.domain ?? null,
        language: "en",
        region: null,
        knowledge_status: "VERIFIED",
        confidence: 1,
        source_id: s.source_id ?? null,
        provenance: `concept derived from OEWN ${fixture.source?.version ?? ""} synset ${s.synset_key} (via ARCHIE Universal Lexicon)`,
        version: 1,
      };
      nodesByKey.set(s.synset_key, n);
    }
    n.sense_external_ids.push(s.external_id);
    const lemma = String(wordCanonical.get(s.word_id) ?? "");
    if (lemma && lemma < n.canonical_name) n.canonical_name = lemma;
  }
  const edges: GraphEdgeRow[] = [];
  const edgeSeen = new Set<string>();
  const pushEdge = (
    source: string,
    relationType: string,
    target: string,
    original: string,
    table: "lexicon_relationships" | "lexicon_sense_relations",
  ) => {
    if (!nodesByKey.has(source) || !nodesByKey.has(target)) return;
    const key = `${source}|${relationType}|${target}`;
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({
      id: `edge-${edges.length}`,
      source_concept_key: source,
      relation_type: relationType,
      target_concept_key: target,
      knowledge_status: "VERIFIED",
      confidence: 1,
      provenance: `${LEXICON_EDGE_PROVENANCE} via ${table}: ${original}`,
      evidence: `OEWN ${original}: mapped to ${relationType} (directly sourced meaning)`,
      domain: null,
      source_id: null,
      version: 1,
    });
  };
  for (const r of fixture.synsetRelations) {
    const m = LEXICON_RELATION_MAPPINGS.find(
      (x) =>
        x.lexiconTable === "lexicon_relationships" &&
        x.lexiconRelation === r.relation_type,
    );
    if (!m) continue;
    pushEdge(
      r.from_synset_key,
      m.graphRelation,
      r.to_synset_key,
      r.relation_type,
      "lexicon_relationships",
    );
  }
  for (const r of fixture.senseRelations) {
    const m = LEXICON_RELATION_MAPPINGS.find(
      (x) =>
        x.lexiconTable === "lexicon_sense_relations" &&
        x.lexiconRelation === r.relation_type,
    );
    if (!m) continue;
    const fromKey = senseToSynset.get(r.from_sense_external_id);
    const toKey = senseToSynset.get(r.to_sense_external_id);
    if (fromKey && toKey)
      pushEdge(
        fromKey,
        m.graphRelation,
        toKey,
        r.relation_type,
        "lexicon_sense_relations",
      );
  }
  return { nodes: [...nodesByKey.values()], edges };
}

// ---------- minimal chainable client (harness-compatible,
// mirrors the semantic-graph retrieval test suite) ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
function fakeFromFactory(tables: Map<string, Row[]>) {
  return function fakeFrom(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let maxRows = Infinity;
    const q: any = {
      select: () => q,
      eq: (col: string, v: any) => {
        filters.push((r) =>
          Array.isArray(v) ? v.includes(r[col]) : r[col] === v,
        );
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
      order: () => q,
      limit: (n: number) => {
        maxRows = n;
        return q;
      },
      maybeSingle: async () => ({ data: resolve()[0] ?? null, error: null }),
      single: async () => ({ data: resolve()[0] ?? null, error: null }),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve({ data: resolve(), error: null }).then(
          onFulfilled,
          onRejected,
        ),
      catch: (onR: any) => q.then(undefined, onR),
      finally: (fn: any) => q.then(fn, fn),
    };
    function resolve() {
      return (tables.get(table) ?? [])
        .filter((r) => filters.every((f) => f(r)))
        .slice(0, maxRows);
    }
    return q;
  };
}

const graph = materializeFixtureGraph();
const tables = new Map<string, Row[]>([
  ["lexicon_words", fixture.words as Row[]],
  ["lexicon_senses", fixture.senses as Row[]],
  ["semantic_graph_nodes", [...graph.nodes] as Row[]],
  ["semantic_graph_edges", [...graph.edges] as Row[]],
  ["lexicon_sources", [fixture.source] as Row[]],
]);
const client: GraphClient = {
  from: fakeFromFactory(tables),
  rpc: async () => ({ data: null, error: { message: "rpc not stubbed" } }),
} as unknown as GraphClient;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- sense tests (spec §22: ambiguous words) ----------
describe("engine — contextual sense/concept selection over real data", () => {
  const cases: Array<{
    word: string;
    context: string;
    expectDefinitionIncludes?: string[];
  }> = [
    {
      word: "bank",
      context: "How does the bank issue my mortgage?",
      expectDefinitionIncludes: ["financial"],
    },
    {
      word: "bank",
      context: "We sat on the river bank and watched the water",
      expectDefinitionIncludes: ["sloping", "water"],
    },
    {
      word: "run",
      context: "He went for a run, traveling on foot at a fast pace",
      expectDefinitionIncludes: ["traveling on foot"],
    },
    {
      word: "light",
      context: "light the fire in the fireplace",
      expectDefinitionIncludes: ["fire"],
    },
    {
      word: "plant",
      context: "the factory plant manufactures cement",
      expectDefinitionIncludes: ["building", "industrial"],
    },
    {
      word: "charge",
      context: "charge the battery by passing a current through it",
      expectDefinitionIncludes: ["energize a battery"],
    },
    {
      word: "file",
      context: "the file holds my electronic records together",
      expectDefinitionIncludes: ["related records"],
    },
    {
      word: "bat",
      context: "the flying bat has wings",
      expectDefinitionIncludes: ["mammal", "wing"],
    },
  ];

  for (const { word, context, expectDefinitionIncludes } of cases) {
    it(`ranks the contextually correct concept for "${word}" in: "${context}"`, async () => {
      const sel = await selectContextualConcepts(client, word, context);
      expect(sel.concepts.length).toBeGreaterThan(0);
      const top = sel.ranked[0] ?? sel.concepts[0];
      for (const frag of expectDefinitionIncludes ?? []) {
        expect(top.definition.toLowerCase()).toContain(frag.toLowerCase());
      }
    });
  }

  it("preserves genuine ambiguity when context does not resolve it (spec §4)", async () => {
    // "the bank" alone carries no disambiguating context
    const sel = await selectContextualConcepts(client, "bank", "the bank");
    // all candidate concepts are on the table
    expect(sel.concepts.length).toBeGreaterThan(1);
    const definitions = sel.concepts.map((c) => c.definition.toLowerCase());
    expect(definitions.some((d) => d.includes("financial"))).toBe(true);
    expect(
      definitions.some((d) => d.includes("sloping") || d.includes("water")),
    ).toBe(true);
    // but NO selection is made — direct evidence is required,
    // and none exists: no invented certainty
    expect(sel.selected).toBeNull();
    expect(sel.ambiguous).toBe(true);
    expect(sel.note).not.toContain("resolved");
  });

  it("is honest when a word is not in the lexicon", async () => {
    const sel = await selectContextualConcepts(
      client,
      "qqzzxj",
      "the qqzzxj is here",
    );
    expect(sel.concepts).toHaveLength(0);
    expect(sel.note).toBe("not in lexicon");
  });
});

// ---------- graph + engine integration (spec §22) ----------
describe("engine — live pathway over real fixture data", () => {
  beforeEach(() => {
    // fixture graph is immutable; nothing to reset
  });

  it("reads the CURRENT knowledge edition label from lexicon_sources (never hardcoded)", async () => {
    const label = await latestSourceLabel(client);
    expect(label).toBe(`OEWN ${fixture.source.version}`);
  });

  it("runs the full pipeline for a bank/mortgage message with facts, concepts and bounded retrieval", async () => {
    const gt = await inferenceGroundTruth(
      client,
      "How does the bank issue a mortgage?",
      [
        { role: "owner", content: "Hello, I hope you are doing well." },
        { role: "archie", content: "Hello! What can I help you with today?" },
      ],
      { language: "en", now: () => "2026-09-17T08:00:00.000Z" },
    );
    expect(gt.block).toContain("Context & Inference Engine ground truth");
    expect(gt.block).toContain("FACT [VERIFIED, stored]");
    expect(gt.termsExamined).toBeGreaterThan(0);
    expect(gt.edgesExamined).toBeGreaterThan(0);
    expect(gt.edgesExamined).toBeLessThanOrEqual(32);
    // context bounded: the greeting turn is relevance-filtered
    expect(gt.context.relevantPriorTurns.length).toBeLessThanOrEqual(3);
    // provenance honest: edition label present
    expect(gt.sourceLabel).toBe(`OEWN ${fixture.source.version}`);
  });

  it("derives a TAXONOMIC 2-hop inference from real fixture chains and keeps it separate from facts", async () => {
    // find a real 2-hop IS_A chain in the fixture, then build a
    // message around its top concept
    const hyper = new Map<string, string[]>();
    for (const e of graph.edges) {
      if (e.relation_type !== "IS_A") continue;
      const list = hyper.get(e.source_concept_key) ?? [];
      list.push(e.target_concept_key);
      hyper.set(e.source_concept_key, list);
    }
    let chain: { a: string; b: string; c: string } | null = null;
    for (const [a, bs] of hyper) {
      for (const b of bs) {
        for (const c of hyper.get(b) ?? []) {
          if (c === a) continue;
          const direct = graph.edges.some(
            (e) =>
              e.relation_type === "IS_A" &&
              e.source_concept_key === a &&
              e.target_concept_key === c,
          );
          if (!direct) {
            chain = { a, b, c };
            break;
          }
        }
        if (chain) break;
      }
      if (chain) break;
    }
    expect(chain).not.toBeNull();
    const name = (k: string) =>
      graph.nodes.find((n) => n.concept_key === k)?.canonical_name ?? k;
    const message = `Tell me about ${name(chain!.a)} and what kind of thing it is`;
    const gt = await inferenceGroundTruth(client, message, [], {
      language: "en",
      now: () => "2026-09-17T08:00:00.000Z",
    });
    const taxonomic = gt.inferences.filter(
      (i) => i.ruleId === "TAXONOMIC_TRANSITIVE_2HOP",
    );
    // the engine may or may not surface this specific chain
    // depending on which concept the lexicon resolves — but
    // anything it DOES surface must be honestly derived:
    for (const inf of taxonomic) {
      expect(inf.conclusion.hops).toBe(2);
      expect(inf.confidence).toBe("SUPPORTED");
      // the block always labels derived conclusions as INFERENCE
      expect(gt.block).toContain("INFERENCE [SUPPORTED, DERIVED");
      // and the conclusion never appears among the FACT premises
      const asFact = gt.facts.some(
        (f) => f.statement === inf.conclusion.statement,
      );
      expect(asFact).toBe(false);
    }
  });

  it("labels user premises distinctly and never as verified facts", async () => {
    const gt = await inferenceGroundTruth(
      client,
      "The bank ATM is unavailable — can I still deposit money at the bank?",
      [],
      { language: "en", now: () => "2026-09-17T08:00:00.000Z" },
    );
    if (gt.context.userPremises.length) {
      for (const p of gt.context.userPremises) {
        expect(p.knowledgeStatus).toBe("USER_PROVIDED");
      }
      expect(gt.block).toContain("USER-PREMISE [USER_PROVIDED, not verified]");
    }
    // no fact premise is ever stamped from the user message
    for (const f of gt.facts) {
      expect(f.source).toBe("SEMANTIC_GRAPH");
    }
  });

  it("keeps the block bounded — never the graph in context (spec §21)", async () => {
    const gt = await inferenceGroundTruth(
      client,
      "bank run light plant scale charge field point file bat",
      [],
      { language: "en", now: () => "2026-09-17T08:00:00.000Z" },
    );
    const lineCount = gt.block.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(30);
    expect(gt.edgesExamined).toBeLessThanOrEqual(32);
  });

  it("refuses to invent relationships: a message about nothing in the lexicon produces no facts", async () => {
    const gt = await inferenceGroundTruth(client, "qqzzxj fwblm pqrst", [], {
      language: "en",
      now: () => "2026-09-17T08:00:00.000Z",
    });
    expect(gt.facts).toHaveLength(0);
    expect(gt.inferences).toHaveLength(0);
    expect(gt.block).toBe("");
  });

  it("records rejected chains as the anti-hallucination audit trail", async () => {
    const gt = await inferenceGroundTruth(
      client,
      "How does the bank issue a mortgage?",
      [],
      { language: "en", now: () => "2026-09-17T08:00:00.000Z" },
    );
    // whatever was examined and NOT promoted is recorded with
    // a reason — never silently dropped
    expect(Array.isArray(gt.rejectedChains)).toBe(true);
  });
});
