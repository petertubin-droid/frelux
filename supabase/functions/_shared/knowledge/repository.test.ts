// =========================================================
// ARCHIE KNOWLEDGE REPOSITORY — UNIT TESTS (offline, CI-safe)
//
// Phase 5 acceptance (server-side): configuration fail-safety,
// credential hygiene, write gating (the freeze), delegation of
// every knowledge operation through the repository, and the
// canonical row-shape contract (projection seam).
//
// Live Project B verification lives in live.test.ts (skipped
// unless KNOWLEDGE_DB_URL + KNOWLEDGE_SERVICE_ROLE_KEY are set;
// see vitest.live.config.ts — never part of CI).
// =========================================================

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake query
 * builder mirrors the loose supabase chain on purpose (same pattern
 * as lexicon/retrieval.test.ts). */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import {
  loadKnowledgeConfig,
  readEnv,
  knowledgeOrigin,
  type KnowledgeConfigResult,
} from "./config.ts";
import { KNOWLEDGE_TABLES } from "./tables.ts";
import { projectEdgeRow, EDGE_COLUMNS } from "./projection.ts";
import {
  createKnowledgeRepository,
  KnowledgeConfigError,
  KnowledgeWriteDisabledError,
  type KnowledgeRepositoryOptions,
} from "./repository.ts";
import type { GraphClient } from "../semantic-graph/retrieval.ts";

// ---------- minimal chainable client (harness-compatible) ----------

type Row = Record<string, any>;
const fixtures = new Map<string, Row[]>();
const inserts: Array<{ table: string; rows: Row[] }> = [];
const rpcCalls: string[] = [];

function fakeFrom(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let maxRows = Infinity;
  const q: any = {
    select: () => q,
    insert: (rows: any) => {
      inserts.push({ table, rows: Array.isArray(rows) ? rows : [rows] });
      return q;
    },
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
    then: (resolve: any, reject: any) =>
      Promise.resolve({ data: resolve2(), error: null }).then(resolve, reject),
    catch: (onR: any) => q.then(undefined, onR),
    finally: (fn: any) => q.then(fn, fn),
  };
  function resolve2() {
    return (fixtures.get(table) ?? [])
      .filter((r) => filters.every((f) => f(r)))
      .slice(0, maxRows);
  }
  return q;
}

function fakeClient(): GraphClient {
  return {
    from: fakeFrom,
    rpc: async (fn: string) => {
      rpcCalls.push(fn);
      if (fn === "archie_graph_health") {
        return {
          data: {
            total_nodes: 107085,
            total_edges: 303888,
            orphan_nodes: 1705,
            missing_provenance: { nodes: 0, edges: 0 },
            circular_relationships: { self_loops: 8, is_a_two_cycles: 0 },
            relation_type_breakdown: { IS_A: 87101 },
          },
          error: null,
        };
      }
      return { data: { nodes: 1, edges: 1 }, error: null };
    },
  } as any;
}

const VALID_URL = "https://knowledge-project.supabase.co";
const VALID_KEY = "eyJ-test-service-role-key-with-enough-length";

function repoOpts(
  over: Partial<Record<string, string>> = {},
): KnowledgeRepositoryOptions {
  const config: KnowledgeConfigResult = {
    ok: true,
    config: {
      url: VALID_URL,
      serviceKey: VALID_KEY,
      writesEnabled: over.KNOWLEDGE_WRITES_ENABLED === "true",
    },
  };
  return { config, clientFactory: () => fakeClient() };
}

// ---------- real fixture data (extracted from the live DB) ----------

const lexFixture = JSON.parse(
  fs.readFileSync(
    new URL("../lexicon/__fixtures__/test-words.json", import.meta.url),
    "utf8",
  ),
);
function seed() {
  fixtures.clear();
  inserts.length = 0;
  rpcCalls.length = 0;
  const put = (name: string, rows: Row[]) =>
    fixtures.set(
      name,
      rows.map((r) => ({ ...r })),
    );
  put("lexicon_sources", [lexFixture.source]);
  put("lexicon_words", lexFixture.words);
  put("lexicon_senses", lexFixture.senses);
  put("lexicon_sense_relations", lexFixture.senseRelations);
  put("lexicon_relationships", lexFixture.synsetRelations);
  // Graph rows: minimal canonical-shape nodes/edges derived from the
  // real lexicon fixture synsets (bank senses exist in test-words.json).
  const synsets = [
    ...new Map(lexFixture.senses.map((s: any) => [s.synset_key, s])).values(),
  ] as any[];
  const nodes = synsets.map((sense, i) => ({
    id: `node-${i}`,
    concept_key: sense.synset_key,
    synset_key: sense.synset_key,
    canonical_name: String(lexFixture.words[0]?.canonical ?? "bank"),
    sense_external_ids: [sense.external_id],
    description: sense.definition,
    domain: sense.domain ?? null,
    language: "en",
    region: null,
    knowledge_status: "VERIFIED",
    confidence: 1,
    source_id: sense.source_id ?? lexFixture.source.id,
    provenance: "concept derived from OEWN test fixture",
    version: 1,
  }));
  put("semantic_graph_nodes", nodes);
  if (nodes.length >= 2) {
    put("semantic_graph_edges", [
      {
        id: "edge-1",
        source_concept_key: nodes[0].concept_key,
        relation_type: "IS_A",
        target_concept_key: nodes[1].concept_key,
        knowledge_status: "VERIFIED",
        confidence: 1,
        provenance: "Open English WordNet (CC BY 4.0) test fixture",
        evidence: "OEWN HYPERNYM: mapped to IS_A (directly sourced meaning)",
        domain: null,
        source_id: lexFixture.source.id,
        version: 1,
      },
    ]);
  }
}

beforeEach(seed);

// ---------- configuration fail-safety ----------

describe("knowledge configuration", () => {
  const SET =
    "KNOWLEDGE_DB_URL KNOWLEDGE_SERVICE_ROLE_KEY KNOWLEDGE_WRITES_ENABLED";

  afterEach(() => {
    for (const k of SET.split(" ")) delete (process.env as any)[k];
  });

  it("fails safe with a typed error when the URL is missing", () => {
    delete (process.env as any).KNOWLEDGE_DB_URL;
    (process.env as any).KNOWLEDGE_SERVICE_ROLE_KEY = VALID_KEY;
    const r = loadKnowledgeConfig();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("missing_url");
      expect(r.message).not.toContain(VALID_KEY);
      expect(() => {
        throw new KnowledgeConfigError(r.reason, r.message);
      }).toThrow(KnowledgeConfigError);
    }
  });

  it("rejects non-https, non-supabase, or path-bearing URLs", () => {
    (process.env as any).KNOWLEDGE_DB_URL =
      "http://knowledge-project.supabase.co";
    (process.env as any).KNOWLEDGE_SERVICE_ROLE_KEY = VALID_KEY;
    expect(loadKnowledgeConfig().ok).toBe(false);
    if (!loadKnowledgeConfig().ok) {
      expect(loadKnowledgeConfig().reason).toBe("invalid_url");
    }
    (process.env as any).KNOWLEDGE_DB_URL = "https://evil.example.com";
    expect(loadKnowledgeConfig().ok).toBe(false);
    (process.env as any).KNOWLEDGE_DB_URL =
      "https://knowledge-project.supabase.co/rest/v1";
    expect(loadKnowledgeConfig().ok).toBe(false);
  });

  it("fails safe when the service key is missing", () => {
    (process.env as any).KNOWLEDGE_DB_URL = VALID_URL;
    delete (process.env as any).KNOWLEDGE_SERVICE_ROLE_KEY;
    const r = loadKnowledgeConfig();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing_key");
  });

  it("validates a correct configuration and defaults writes to disabled", () => {
    (process.env as any).KNOWLEDGE_DB_URL = VALID_URL;
    (process.env as any).KNOWLEDGE_SERVICE_ROLE_KEY = VALID_KEY;
    const r = loadKnowledgeConfig();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.writesEnabled).toBe(false);
  });

  it("readEnv never throws and knowledgeOrigin redacts bad URLs", () => {
    expect(readEnv("ARCHIE_DEFINITELY_UNSET_VAR_XYZ")).toBeUndefined();
    expect(knowledgeOrigin("not-a-url")).toBe("<invalid-knowledge-url>");
    expect(knowledgeOrigin(VALID_URL)).toBe(VALID_URL);
  });
});

// ---------- repository construction + delegation ----------

describe("knowledge repository", () => {
  it("builds with a valid config and exposes the bound client once", () => {
    const r = createKnowledgeRepository(repoOpts());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c1 = r.repository.graphClient();
    const c2 = r.repository.graphClient();
    expect(c1).toBe(c2); // one bound client, not per-call clients
    expect(r.repository.origin).toBe(VALID_URL);
  });

  it("returns a typed KnowledgeConfigError (not a throw) when unconfigured", () => {
    const r = createKnowledgeRepository({
      config: { ok: false, reason: "missing_url", message: "no url" },
      clientFactory: () => fakeClient(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(KnowledgeConfigError);
  });

  it("delegates lexicon word lookup through the bound client (real fixtures)", async () => {
    const r = createKnowledgeRepository(repoOpts());
    if (!r.ok) throw new Error("unconfigured");
    const results = await r.repository.lexicon.lookup("bank");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].word.normalized).toBe("bank");
    expect(results[0].senses.length).toBeGreaterThan(1); // word ≠ one concept
  });

  it("delegates sense lookup and synset relationships", async () => {
    const r = createKnowledgeRepository(repoOpts());
    if (!r.ok) throw new Error("unconfigured");
    const sel = await r.repository.lexicon.contextualSenses(
      "bank",
      "the bank approved the mortgage",
    );
    expect(sel.selection.candidates.length).toBeGreaterThan(0);
    const bankSense = sel.selection.candidates[0];
    const rels = await r.repository.lexicon.relatedWords(
      bankSense.synset_key ?? "x",
    );
    expect(Array.isArray(rels)).toBe(true);
  });

  it("delegates graph operations (nodes, edges, traversal, ground truth)", async () => {
    const r = createKnowledgeRepository(repoOpts());
    if (!r.ok) throw new Error("unconfigured");
    const concepts = await r.repository.graph.conceptsForWord("bank");
    expect(Array.isArray(concepts)).toBe(true);
    if (concepts.length > 0) {
      const key = concepts[0].conceptKey;
      const node = await r.repository.graph.concept(key);
      expect(node?.concept_key ?? node).toBeTruthy();
      const nb = await r.repository.graph.neighbors(key);
      expect(nb.node || nb.neighbors).toBeTruthy();
      const gt = await r.repository.graph.groundTruth("the bank of the river");
      expect(gt).toBeTruthy();
    }
  });

  it("delegates health through the archie_graph_health RPC", async () => {
    const r = createKnowledgeRepository(repoOpts());
    if (!r.ok) throw new Error("unconfigured");
    const h = await r.repository.health();
    expect(h).not.toBeNull();
    expect(h!.total_edges).toBe(303888);
    expect(rpcCalls).toContain("archie_graph_health");
  });

  it("retrieves provenance/evidence in the canonical text shape", async () => {
    const edges = fixtures.get(KNOWLEDGE_TABLES.graphEdges) ?? [];
    if (edges.length === 0) return; // fixture-set dependent
    const r = createKnowledgeRepository(repoOpts());
    if (!r.ok) throw new Error("unconfigured");
    const e = await r.repository.provenance.forEdge(edges[0].id);
    expect(e).not.toBeNull();
    expect(typeof e!.provenance).toBe("string"); // text contract (Phase 4)
    const p = projectEdgeRow(e as any);
    expect(p.provenance).toBe(e!.provenance); // identity today
    expect(EDGE_COLUMNS).toContain("provenance,evidence");
  });

  it("reads the ingestion ledgers through the repository", async () => {
    fixtures.set(KNOWLEDGE_TABLES.lexiconImports, [
      { id: "i1", source_id: "s1", rows_word: 1, created_date: "2026-09-17" },
    ]);
    const r = createKnowledgeRepository(repoOpts());
    if (!r.ok) throw new Error("unconfigured");
    const lex = await r.repository.provenance.lexiconImports();
    expect(lex.length).toBe(1);
  });
});

// ---------- write gating (the freeze) ----------

describe("knowledge write gate", () => {
  it("defaults to DISABLED and every ingestion op fails closed", async () => {
    const r = createKnowledgeRepository(repoOpts());
    if (!r.ok) throw new Error("unconfigured");
    const repo = r.repository;
    expect(repo.writesEnabled).toBe(false);
    expect(repo.ingestion.enabled).toBe(false);
    await expect(
      repo.ingestion.insertWords([{ id: "w1" }]),
    ).rejects.toBeInstanceOf(KnowledgeWriteDisabledError);
    await expect(
      repo.ingestion.insertSenses([{ id: "s1" }]),
    ).rejects.toBeInstanceOf(KnowledgeWriteDisabledError);
    await expect(
      repo.ingestion.insertSynsetRelations([]),
    ).rejects.toBeInstanceOf(KnowledgeWriteDisabledError);
    await expect(
      repo.ingestion.insertSenseRelations([]),
    ).rejects.toBeInstanceOf(KnowledgeWriteDisabledError);
    await expect(repo.ingestion.recordLexiconImport({})).rejects.toBeInstanceOf(
      KnowledgeWriteDisabledError,
    );
    await expect(repo.ingestion.recordGraphImport({})).rejects.toBeInstanceOf(
      KnowledgeWriteDisabledError,
    );
    await expect(
      repo.ingestion.upsertSources([] as any),
    ).rejects.toBeInstanceOf(KnowledgeWriteDisabledError);
    await expect(repo.ingestion.rebuildSemanticGraph()).rejects.toBeInstanceOf(
      KnowledgeWriteDisabledError,
    );
    expect(inserts.length).toBe(0); // nothing reached the database
    expect(rpcCalls).not.toContain("archie_build_semantic_graph");
  });

  it("when explicitly enabled, writes go through the bound client only", async () => {
    const r = createKnowledgeRepository(
      repoOpts({ KNOWLEDGE_WRITES_ENABLED: "true" }),
    );
    if (!r.ok) throw new Error("unconfigured");
    const repo = r.repository;
    expect(repo.writesEnabled).toBe(true);
    await repo.ingestion.insertWords([{ id: "w1", canonical: "test" }]);
    expect(inserts).toEqual([
      {
        table: KNOWLEDGE_TABLES.lexiconWords,
        rows: [{ id: "w1", canonical: "test" }],
      },
    ]);
  });
});
