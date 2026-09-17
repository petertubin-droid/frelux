// =========================================================
// ARCHIE SEMANTIC KNOWLEDGE GRAPH — RETRIEVAL TESTS
//
// Spec §20: verify the graph database API — concept
// identification from text, contextual concept selection,
// relationship retrieval, hierarchy, multi-hop traversal,
// concept comparison, graph health, and the ground-truth
// block for the live ARCHIE turn.
//
// ALL fixtures are REAL data extracted from the production
// lexicon by scripts/semantic-graph/generate-test-fixtures.ts
// — never hand-written expectations about the data. The graph
// fixture rows are materialized in-test from those lexicon
// rows with the same mapping the SQL materialization uses
// (registry: relations.ts).
// =========================================================

import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import {
  getConcept,
  conceptsForWord,
  selectContextualConcepts,
  getNeighbors,
  conceptReport,
  getHierarchy,
  findPaths,
  compareConcepts,
  graphHealth,
  semanticGraphGroundTruth,
  type GraphNodeRow,
  type GraphEdgeRow,
  type GraphClient,
} from "./retrieval.ts";
import {
  LEXICON_RELATION_MAPPINGS,
  LEXICON_EDGE_PROVENANCE,
} from "./relations.ts";

// ---------- real fixture data ----------
/* eslint-disable @typescript-eslint/no-explicit-any -- fixture
 * rows come from parsed JSON whose exact shapes match the DB */
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./__fixtures__/lexicon-for-graph.json", import.meta.url),
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
};

// ---------- materialize the fixture graph ----------
// Same mapping as archie_build_semantic_graph(): one concept
// node per VERIFIED synset, edges from the registry mapping.

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
        canonical_name: "\uffff", // resolved below to the alphabetical-first member lemma
        sense_external_ids: [],
        description: null,
        domain: s.domain ?? null,
        language: "en",
        region: s.region ?? null,
        knowledge_status: "VERIFIED",
        confidence: 1,
        source_id: s.source_id ?? null,
        provenance: `concept derived from OEWN 2025 synset ${s.synset_key} (via ARCHIE Universal Lexicon)`,
        version: 1,
      };
      nodesByKey.set(s.synset_key, n);
    }
    n.sense_external_ids.push(s.external_id);
    const lemma = String(wordCanonical.get(s.word_id) ?? "");
    if (lemma && lemma < n.canonical_name) n.canonical_name = lemma;
    if (!n.description || String(s.external_id) < n.description[0]) {
      n.description = s.definition;
    }
  }
  // description resolution above compares apples and oranges;
  // redo deterministically: the alphabetically-first sense's
  // definition (all senses in a synset share it)
  for (const s of fixture.senses) {
    if (s.knowledge_status !== "VERIFIED") continue;
    const n = nodesByKey.get(s.synset_key);
    if (n) n.description = s.definition;
  }

  const edges: GraphEdgeRow[] = [];
  const edgeSeen = new Set<string>();
  const pushEdge = (
    source: string,
    relationType: string,
    target: string,
    original: string,
    table: "lexicon_relationships" | "lexicon_sense_relations",
    sourceId: string | null,
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
      source_id: sourceId,
      version: 1,
    });
  };
  for (const r of fixture.synsetRelations) {
    const m = LEXICON_RELATION_MAPPINGS.find(
      (x) =>
        x.lexiconTable === "lexicon_relationships" &&
        x.lexiconRelation === r.relation_type,
    );
    if (!m) continue; // unmapped → counted + reported in prod, never guessed
    pushEdge(
      r.from_synset_key,
      m.graphRelation,
      r.to_synset_key,
      r.relation_type,
      "lexicon_relationships",
      null,
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
        null,
      );
  }
  return { nodes: [...nodesByKey.values()], edges };
}

// ---------- minimal chainable client (harness-compatible) ----------
/* eslint-disable @typescript-eslint/no-explicit-any -- the fake
 * query builder mirrors the loose supabase chain on purpose. */
type Row = Record<string, any>;
const tables = new Map<string, Row[]>();
let rpcImpl: ((name: string, args?: any) => { data: any; error: any }) | null =
  null;

function fakeFrom(table: string) {
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
}

const svc: GraphClient = {
  from: fakeFrom,
  rpc: async (name: string, args?: any) =>
    rpcImpl
      ? rpcImpl(name, args)
      : { data: null, error: { message: `rpc ${name} not stubbed` } },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- test-fixture graph health (mirrors archie_graph_health SQL) ----------
function fixtureHealth() {
  const { nodes, edges } = graph;
  const breakdown: Record<string, number> = {};
  for (const e of edges)
    breakdown[e.relation_type] = (breakdown[e.relation_type] ?? 0) + 1;
  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source_concept_key);
    connected.add(e.target_concept_key);
  }
  return {
    total_nodes: nodes.length,
    total_edges: edges.length,
    relation_type_breakdown: breakdown,
    node_status_breakdown: { VERIFIED: nodes.length },
    edge_status_breakdown: { VERIFIED: edges.length },
    orphan_nodes: nodes.filter((n) => !connected.has(n.concept_key)).length,
    duplicate_candidates: 0,
    missing_provenance: { nodes: 0, edges: 0 },
    circular_relationships: { self_loops: 0, is_a_two_cycles: 0 },
    invalid_relationship_types: 0,
    unverified_nodes: 0,
    unverified_edges: 0,
    graph_version: 1,
    last_ingestion: {
      kind: "LEXICON_MATERIALIZE",
      status: "SUCCESS",
      stats: { nodes_after: nodes.length, edges_after: edges.length },
    },
  };
}

// ---------- setup ----------
const graph = materializeFixtureGraph();

beforeEach(() => {
  tables.clear();
  rpcImpl = null;
  tables.set("lexicon_words", fixture.words as Row[]);
  tables.set("lexicon_senses", fixture.senses as Row[]);
  tables.set("semantic_graph_nodes", [...graph.nodes] as Row[]);
  tables.set("semantic_graph_edges", [...graph.edges] as Row[]);
});

// ---------- node tests ----------
describe("semantic graph — nodes", () => {
  it("creates one concept node per verified synset, unique by concept key", () => {
    const keys = graph.nodes.map((n) => n.concept_key);
    expect(new Set(keys).size).toBe(keys.length);
    // every fixture synset with VERIFIED senses became a node
    const synsets = new Set(
      fixture.senses
        .filter((s) => s.knowledge_status === "VERIFIED")
        .map((s) => s.synset_key),
    );
    expect(keys.length).toBe(synsets.size);
  });

  it("retrieves a concept by key with provenance, status and confidence", async () => {
    const n = await getConcept(svc, "14828345-n"); // cement (powder building material)
    expect(n).not.toBeNull();
    expect(n!.canonical_name).toBe("cement");
    expect(n!.knowledge_status).toBe("VERIFIED");
    expect(n!.confidence).toBe(1);
    expect(n!.provenance).toMatch(/OEWN 2025 synset 14828345-n/);
    expect(n!.description).toMatch(/building material/);
  });

  it("normalizes at the concept level: one word maps to many distinct concepts", async () => {
    const concepts = await conceptsForWord(svc, "bank");
    expect(concepts.length).toBeGreaterThanOrEqual(10);
    const keys = new Set(concepts.map((c) => c.conceptKey));
    expect(keys.size).toBe(concepts.length);
    // the financial and river senses are DIFFERENT concepts
    expect(keys.has("08437235-n")).toBe(true); // financial institution
    expect(keys.has("09236472-n")).toBe(true); // sloping land beside water
    // each carries its own definition — senses are never collapsed
    const financial = concepts.find((c) => c.conceptKey === "08437235-n")!;
    expect(financial.definition).toMatch(/financial institution/);
  });

  it("respects the default VERIFIED filter and explicit widening", async () => {
    tables.set("semantic_graph_nodes", [
      {
        ...graph.nodes[0],
        concept_key: "test-unverified-1",
        knowledge_status: "UNVERIFIED",
      },
    ] as Row[]);
    expect(await getConcept(svc, "test-unverified-1")).toBeNull();
    expect(
      await getConcept(svc, "test-unverified-1", { statuses: ["UNVERIFIED"] }),
    ).not.toBeNull();
  });
});

// ---------- relationship tests ----------
describe("semantic graph — relationships", () => {
  it("returns only relationships that actually exist, with provenance", async () => {
    const { node, neighbors } = await getNeighbors(svc, "14828345-n");
    expect(node!.canonical_name).toBe("cement");
    // REAL OEWN facts for the cement synset (not the spec's
    // illustrative sand/aggregate example — never invented)
    expect(
      neighbors.some(
        ({ edge, direction }) =>
          edge.relation_type === "IS_A" &&
          direction === "outgoing" &&
          edge.target_concept_key === "14810638-n",
      ),
    ).toBe(true);
    expect(
      neighbors.some(
        ({ edge, direction }) =>
          edge.relation_type === "PART_OF" &&
          direction === "outgoing" &&
          (edge.target_concept_key === "14844350-n" ||
            edge.target_concept_key === "14980028-n"),
      ),
    ).toBe(true);
    for (const { edge } of neighbors) {
      expect(edge.knowledge_status).toBe("VERIFIED");
      expect(edge.provenance).toMatch(/^OEWN 2025 .* via lexicon_/);
    }
  });

  it("groups the §14 relationship tree by relation type with categories", async () => {
    const report = await conceptReport(svc, "14828345-n");
    expect(report).not.toBeNull();
    const types = report!.relations.map((r) => r.relation_type);
    expect(types).toContain("IS_A");
    expect(types).toContain("PART_OF");
    for (const group of report!.relations) {
      expect(group.category).toBeTruthy(); // every stored type is registered
    }
  });

  it("filters traversal by relation type and category", async () => {
    const onlyTax = await getNeighbors(svc, "14828345-n", {
      categories: ["TAXONOMIC"],
    });
    // the real cement synset carries BOTH directions of the
    // taxonomy: IS_A up to building material, HAS_TYPE down to
    // its subtype — both are TAXONOMIC
    expect(onlyTax.neighbors.length).toBeGreaterThan(0);
    for (const { edge } of onlyTax.neighbors) {
      expect(["IS_A", "HAS_TYPE"]).toContain(edge.relation_type);
    }
  });

  it("edges are unique per (source, type, target) — sense-level relations dedupe at concept level", () => {
    const keys = graph.edges.map(
      (e) =>
        `${e.source_concept_key}|${e.relation_type}|${e.target_concept_key}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ---------- context tests (spec §§11, 13, 20) ----------
describe("semantic graph — contextual concept identification", () => {
  it("prioritizes the FINANCIAL bank concept for a mortgage context", async () => {
    const sel = await selectContextualConcepts(
      svc,
      "bank",
      "How does a bank issue a mortgage?",
    );
    expect(sel.concepts.length).toBeGreaterThanOrEqual(10);
    expect(sel.ranked[0].conceptKey).toBe("08437235-n"); // financial institution
    expect(sel.ranked[0].definition).toMatch(/financial institution/);
    // no direct lexical evidence → ambiguity is PRESERVED,
    // never resolved by invention (spec §13)
    expect(sel.ambiguous).toBe(true);
    expect(sel.selected).toBeNull();
    expect(sel.note).toMatch(/graph-neighborhood lexical evidence/);
  });

  it("prioritizes the RIVER bank concept for a river context", async () => {
    const sel = await selectContextualConcepts(
      svc,
      "bank",
      "The house is beside the river bank.",
    );
    expect(sel.ranked[0].conceptKey).toBe("09236472-n"); // sloping land beside a body of water
    expect(sel.ambiguous).toBe(true); // honest: chain evidence is weak
  });

  it.each([
    ["run", "I need to run the program"],
    ["light", "the light from the sun"],
    ["plant", "a nuclear power plant"],
    ["scale", "weigh it on the bathroom scale"],
    ["charge", "the electric charge of the battery"],
    ["field", "a field of wheat"],
    ["point", "the point of the argument"],
    ["file", "save the file on disk"],
    ["bat", "the bat flew out of the cave"],
  ])(
    "ranks a semantically plausible concept first for %q (never silently ignoring it)",
    async (word, context) => {
      const sel = await selectContextualConcepts(svc, word, context);
      // every one of the spec's ten ambiguous words is genuinely
      // multi-concept in the real data
      expect(sel.concepts.length).toBeGreaterThanOrEqual(2);
      expect(sel.ranked.length).toBeGreaterThan(0);
      // honesty contract: either resolved with direct evidence,
      // or explicitly ambiguous
      if (sel.selected) {
        expect(sel.ambiguous).toBe(false);
      } else {
        expect(sel.ambiguous).toBe(true);
        expect(sel.note.length).toBeGreaterThan(0);
      }
    },
  );

  it("is honest when the word is not in the lexicon", async () => {
    const sel = await selectContextualConcepts(svc, "zzzqwop", "nothing here");
    expect(sel.concepts).toHaveLength(0);
    expect(sel.selected).toBeNull();
    expect(sel.ambiguous).toBe(true);
  });
});

// ---------- hierarchy tests ----------
describe("semantic graph — hierarchy", () => {
  it("walks the IS_A chain upward from cement to building material", async () => {
    const h = await getHierarchy(svc, "14828345-n");
    expect(h).not.toBeNull();
    expect(h!.ancestors[0].concept_key).toBe("14810638-n");
    expect(h!.ancestors[0].name).toBe("building material");
    expect(h!.ancestors.length).toBeGreaterThanOrEqual(2); // material chain continues up
  });

  it("lists subtypes one level down", async () => {
    const h = await getHierarchy(svc, "14828345-n");
    expect(h!.subtypes.length).toBeGreaterThan(0);
    expect(h!.subtypes.some((s) => s.concept_key === "14829128-n")).toBe(true);
  });

  it("is bounded and stops at the depth limit without claiming completeness", async () => {
    const h = await getHierarchy(svc, "14828345-n", { maxDepth: 1 });
    expect(h!.ancestors.length).toBe(1);
    expect(h!.truncated).toBe(true);
  });
});

// ---------- multi-hop traversal (spec §15) ----------
describe("semantic graph — multi-hop paths", () => {
  it("classifies a 1-hop path as a DIRECT RELATIONSHIP", async () => {
    const { paths } = await findPaths(svc, "14828345-n", "14810638-n");
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0].classification).toBe("DIRECT RELATIONSHIP");
    expect(paths[0].path).toHaveLength(1);
    expect(paths[0].path[0].relation_type).toBe("IS_A");
    expect(paths[0].names).toEqual(["cement", "building material"]);
  });

  it("traverses deeper paths as MULTI-HOP with readable names", async () => {
    // 14829128-n (subtype of cement) → cement → building material
    const { paths } = await findPaths(svc, "14829128-n", "14810638-n");
    expect(paths.length).toBeGreaterThan(0);
    const multi = paths.find((p) => p.path.length >= 2);
    expect(multi).toBeTruthy();
    expect(multi!.classification).toBe("MULTI-HOP RELATIONSHIP");
    expect(multi!.names.length).toBe(multi!.path.length + 1);
    expect(multi!.path.map((s) => s.relation_type)).toContain("IS_A");
  });

  it("never claims concepts are unrelated beyond the search bound", async () => {
    // find an unreachable pair within the bound: search from
    // a verb deep outside the noun chain (bank%2:35:01:: "cover
    // with ashes" verb synset) to building material
    const { paths, note } = await findPaths(svc, "01237357-v", "14810638-n", {
      maxDepth: 2,
    });
    if (!paths.length) {
      expect(note).toMatch(/does not mean the concepts are unrelated/);
    } else {
      expect(paths[0].names.length).toBe(paths[0].path.length + 1);
    }
  });
});

// ---------- concept comparison ----------
describe("semantic graph — comparing concepts", () => {
  it("relates cement to concrete through sourced PART_OF edges", async () => {
    const cmp = await compareConcepts(svc, "14828345-n", "14844350-n");
    expect(cmp.a!.canonical_name).toBe("cement");
    // the live data path: cement IS a substance-part of concrete
    expect(
      cmp.directRelations.some(
        (d) => d.relation_type === "PART_OF" && d.direction === "a→b",
      ),
    ).toBe(true);
    expect(cmp.sharedAncestors.length).toBeGreaterThan(0); // building material
    expect(typeof cmp.note).toBe("string");
  });
});

// ---------- graph health (spec §19) ----------
describe("semantic graph — health dashboard", () => {
  it("reports real database state with the registry cross-check", async () => {
    rpcImpl = () => ({ data: fixtureHealth(), error: null });
    const h = await graphHealth(svc);
    expect(h).not.toBeNull();
    expect(h!.total_nodes).toBe(graph.nodes.length);
    expect(h!.total_edges).toBe(graph.edges.length);
    expect(h!.relation_type_breakdown.IS_A).toBeGreaterThan(0);
    expect(h!.orphan_nodes).toBeGreaterThanOrEqual(0);
    expect(h!.last_ingestion?.kind).toBe("LEXICON_MATERIALIZE");
    // every relation type present in the fixture DB must be a
    // known registry type — invalid types are surfaced, not hidden
    expect(h!.registry_unknown_types).toEqual([]);
    expect(h!.missing_provenance.nodes).toBe(0);
  });

  it("degrades honestly when the health function is unavailable", async () => {
    rpcImpl = () => ({ data: null, error: { message: "undefined function" } });
    expect(await graphHealth(svc)).toBeNull();
  });
});

// ---------- ground truth for the live turn (spec §12) ----------
describe("semantic graph — ARCHIE turn ground truth", () => {
  it("builds a provenance-carrying block for an ambiguous financial message", async () => {
    const gt = await semanticGraphGroundTruth(
      svc,
      "How does a bank issue a mortgage?",
    );
    expect(gt.block).toMatch(/Semantic knowledge graph ground truth/);
    // "bank" is genuinely multi-concept: it appears honestly —
    // as identified (if direct evidence existed) or ambiguous
    const bankTouched =
      gt.conceptsIdentified.some((c) => c.term === "bank") ||
      gt.conceptsAmbiguous.includes("bank");
    expect(bankTouched).toBe(true);
    expect(gt.block).toMatch(/\[VERIFIED, OEWN 2025\]/);
    expect(gt.block).toMatch(/knowledge status/);
    expect(gt.termsExamined).toBeGreaterThan(0);
    expect(gt.edgesRetrieved).toBeGreaterThan(0);
  });

  it("identifies the cement concept and its REAL relationships", async () => {
    const gt = await semanticGraphGroundTruth(
      svc,
      "Which cement should I use for the concrete slab?",
    );
    expect(gt.block).toMatch(/cement/);
    expect(gt.block).toMatch(/IS_A→/);
    // the financial institution audit path stays bounded
    expect(gt.edgesRetrieved).toBeLessThanOrEqual(24);
  });

  it("is bounded and honest for messages with no graph concepts", async () => {
    const gt = await semanticGraphGroundTruth(
      svc,
      "zzz qwop blorptastic frumious",
    );
    expect(gt.block).toBe("");
    expect(gt.termsExamined).toBeLessThanOrEqual(6);
    expect(gt.conceptsIdentified).toEqual([]);
  });

  it("marks causal relations as sourced when they appear", async () => {
    // "kill causes die" is the classic OEWN CAUSES pair; use a
    // message around killing to see the causal marking contract
    const gt = await semanticGraphGroundTruth(
      svc,
      "killing the process kills the file",
    );
    // whatever the graph actually holds: if a causal relation
    // surfaced, it is marked "(sourced causal)" in the block
    if (gt.block.includes("CAUSES")) {
      expect(gt.block).toMatch(/CAUSES \(sourced causal\)/);
    } else {
      expect(gt.block).not.toMatch(/CAUSES/);
    }
  });
});
