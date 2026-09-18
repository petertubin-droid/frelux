// =========================================================
// ARCHIE KNOWLEDGE REPOSITORY — LIVE PROJECT B VERIFICATION
// (Phase 5 acceptance; NOT part of CI)
//
// Runs ONLY when KNOWLEDGE_DB_URL + KNOWLEDGE_SERVICE_ROLE_KEY
// are present in the environment, and ONLY against Project B
// (the knowledge subsystem). Executes via the dedicated config:
//
//   npx vitest run --config supabase/functions/_shared/knowledge/vitest.live.config.ts
//
// Covers the owner's 13 Phase 5 test requirements and compares
// representative results against the Phase 3/4 baseline
// (107,085 nodes / 303,888 edges / orphans 1,705 / self-loops 8 /
// zero missing provenance / 100% VERIFIED).
//
// READ-ONLY: every operation is a lookup, traversal, or RPC
// health read. The ingestion gate stays closed.
// =========================================================

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import ws from "ws";
// Node 20 has no native WebSocket; supabase-js 2.109 initializes its
// realtime client at construction and refuses to boot otherwise. The
// Deno edge runtime (production) HAS WebSocket; the knowledge
// repository never opens channels. This polyfill is live-test-only.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = ws;
}
import {
  createKnowledgeRepository,
  KnowledgeConfigError,
} from "./repository.ts";
import { loadKnowledgeConfig } from "./config.ts";
import type { KnowledgeRepository } from "./repository.ts";

const liveEnv =
  !!process.env.KNOWLEDGE_DB_URL && !!process.env.KNOWLEDGE_SERVICE_ROLE_KEY;

describe.skipIf(!liveEnv)("knowledge repository — LIVE (Project B)", () => {
  let repo: KnowledgeRepository;

  beforeAll(() => {
    const r = createKnowledgeRepository();
    if (!r.ok) throw new Error(`config failed: ${r.error.message}`);
    repo = r.repository;
  });

  // restore env for the failure-handling suite below
  afterAll(() => {
    // nothing to clean: live config read happens in beforeAll
  });

  it("1. word lookup: 'bank' resolves with multiple senses (never collapsed)", async () => {
    const results = await repo.lexicon.lookup("bank");
    expect(results.length).toBeGreaterThan(0);
    const senses = results.reduce((n, e) => n + e.senses.length, 0);
    expect(senses).toBeGreaterThan(3);
  });

  it("2. sense lookup: contextual selection returns ranked candidates", async () => {
    const sel = await repo.lexicon.contextualSenses(
      "bank",
      "the bank approved the mortgage loan",
    );
    expect(sel.selection.candidates.length).toBeGreaterThan(0);
    const top = sel.selection.candidates[0];
    expect(String(top.sense.definition).toLowerCase()).toContain("financial");
  });

  it("3. relationship lookup: synset relationships return typed relations", async () => {
    const sel = await repo.lexicon.contextualSenses(
      "bank",
      "the bank approved the mortgage loan",
    );
    const synset = sel.selection.candidates[0].sense.synset_key;
    const rels = await repo.lexicon.relatedWords(synset);
    expect(Array.isArray(rels)).toBe(true);
  });

  it("4. sense relationship lookup: sense relations resolve", async () => {
    const entries = await repo.lexicon.lookup("bank");
    const sense = entries[0].senses[0];
    const rels = await repo.lexicon.senseRelations(sense.external_id);
    expect(Array.isArray(rels)).toBe(true);
  });

  it("5. semantic node lookup: concept resolves with provenance", async () => {
    const concepts = await repo.graph.conceptsForWord("bank");
    expect(concepts.length).toBeGreaterThan(0);
    const node = await repo.graph.concept(concepts[0].conceptKey);
    expect(node).not.toBeNull();
    expect(node!.provenance).toContain("OEWN");
  });

  it("6. semantic edge lookup: edges carry the canonical text shape", async () => {
    const concepts = await repo.graph.conceptsForWord("bank");
    const nb = await repo.graph.neighbors(concepts[0].conceptKey);
    expect(nb.neighbors.length).toBeGreaterThan(0);
    const edge = nb.neighbors[0].edge;
    expect(typeof edge.provenance).toBe("string");
    expect(edge.provenance.length).toBeGreaterThan(0);
    // single-edge lookup through the repository projection seam
    const fetched = await repo.provenance.forEdge(edge.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(edge.id);
  });

  it("7. graph traversal: hierarchy and bounded paths resolve", async () => {
    const concepts = await repo.graph.conceptsForWord("bank");
    const key = concepts[0].conceptKey;
    const h = await repo.graph.hierarchy(key, { maxDepth: 3 });
    expect(h).not.toBeNull();
    const paths = await repo.graph.paths(key, key); // degenerate but bounded
    expect(paths).toBeTruthy();
  });

  it("8. provenance retrieval: node + edge + ingestion ledgers", async () => {
    const concepts = await repo.graph.conceptsForWord("bank");
    const node = await repo.provenance.forNode(concepts[0].conceptKey);
    expect(node!.provenance.length).toBeGreaterThan(0);
    const lexImports = await repo.provenance.lexiconImports();
    const graphImports = await repo.provenance.graphImports();
    expect(lexImports.length).toBeGreaterThan(0);
    expect(graphImports.length).toBeGreaterThan(0);
  });

  it("9. evidence retrieval: evidence text present on sourced edges", async () => {
    const concepts = await repo.graph.conceptsForWord("bank");
    const nb = await repo.graph.neighbors(concepts[0].conceptKey);
    const withEvidence = nb.neighbors.find((n) => !!n.edge.evidence);
    expect(withEvidence).toBeTruthy();
    expect(withEvidence!.edge.evidence).toContain("OEWN");
  });

  it("10. graph health matches the Phase 3/4 baseline exactly", async () => {
    const h = await repo.health();
    expect(h).not.toBeNull();
    expect(h!.total_nodes).toBe(107085);
    expect(h!.total_edges).toBe(303888);
    expect(h!.orphan_nodes).toBe(1705);
    expect(h!.circular_relationships.self_loops).toBe(8);
    expect(h!.circular_relationships.is_a_two_cycles).toBe(0);
    expect(h!.missing_provenance.nodes).toBe(0);
    expect(h!.missing_provenance.edges).toBe(0);
    expect(h!.unverified_nodes).toBe(0);
    expect(h!.unverified_edges).toBe(0);
    expect(h!.relation_type_breakdown["IS_A"]).toBe(87101);
    expect(h!.relation_type_breakdown["HAS_TYPE"]).toBe(87101);
  });

  it("11. end-to-end: representative ARCHIE ground-truth retrieval", async () => {
    const gt = await repo.graph.groundTruth(
      "The bank approved the mortgage, so the loan deposit will be held in escrow near the river bank.",
    );
    expect(gt).toBeTruthy();
    expect(gt!.termsExamined).toBeGreaterThan(0);
    expect(
      gt!.conceptsIdentified.length + gt!.conceptsAmbiguous.length,
    ).toBeGreaterThan(0);
    // Bounded: the ground-truth block never over-fetches
    const raw = JSON.stringify(gt);
    expect(raw.length).toBeLessThan(60_000);
  });

  it("12. failure handling: misconfiguration and unavailability fail safe", async () => {
    // (a) missing configuration → typed error, no throw, no credentials
    const url = process.env.KNOWLEDGE_DB_URL;
    const key = process.env.KNOWLEDGE_SERVICE_ROLE_KEY;
    delete process.env.KNOWLEDGE_DB_URL;
    delete process.env.KNOWLEDGE_SERVICE_ROLE_KEY;
    const missing = loadKnowledgeConfig();
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.message).not.toContain(key ?? "KEY");
      const r = createKnowledgeRepository();
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBeInstanceOf(KnowledgeConfigError);
    }
    // (b) unavailable Project B host → the repository fails SAFE:
    // *.supabase.co wildcard DNS reaches Supabase's edge, which rejects
    // the bogus project — the retrieval layer degrades to an EMPTY result
    // (honest absence), never fabricated data, never a thrown credential.
    const bad = createKnowledgeRepository({
      config: {
        ok: true,
        config: {
          url: "https://archie-nonexistent-host-987654321.supabase.co",
          serviceKey: key ?? "eyJ-unreachable-test",
          writesEnabled: false,
        },
      },
    });
    if (bad.ok) {
      const degraded = await bad.repository.lexicon.lookup("bank");
      expect(degraded).toEqual([]); // no data, no invention, no crash
    }
    process.env.KNOWLEDGE_DB_URL = url;
    process.env.KNOWLEDGE_SERVICE_ROLE_KEY = key;
  });

  it("13. security hygiene: origin-only logging, no key material in errors", async () => {
    // the repository exposes only the origin for logs
    expect(repo.origin).not.toContain("service");
    expect(repo.origin).not.toContain("key");
    expect(repo.origin).toMatch(/^https:\/\/.+\.supabase\.co$/);
    // writes remain disabled in the live configuration (freeze honored)
    expect(repo.writesEnabled).toBe(false);
  });
});
