// =========================================================
// ARCHIE NATIVE ENGINE — HONEST CAPABILITY MANIFEST
//
// The owner's rule: "If a capability is not yet implemented,
// clearly report it rather than pretending it exists." This
// manifest is the single source of truth for what ARCHIE's
// native engine can actually do — OPERATIONAL entries are
// backed by passing tests named in measuredBy. The engine
// surfaces this manifest in responses and diagnostics.
// =========================================================

import type { CapabilityReport } from "./types.ts";

export const NATIVE_ENGINE_ID = "archie-native-engine";

/** The thirteen foundational processing layers the owner
 *  directed — each mapped to its real subsystem and honest
 *  maturity. */
export function nativeEngineCapabilityManifest(): CapabilityReport[] {
  return [
    {
      id: "natural-conversation",
      description:
        "Natural conversation and language understanding: TF-IDF context vectors, entity extraction, Naive Bayes intent classification (trained at boot from the embedded corpus)",
      maturity: "OPERATIONAL",
      measuredBy:
        "native-engine.test.ts (NLU + accuracy fixture), native-engine-runtime.test.ts",
    },
    {
      id: "reasoning",
      description:
        "Reasoning and problem solving: bounded forward-chaining rule inference over the knowledge store with confidence propagation, full derivation traces, and backward goal checking",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (reasoning cases)",
    },
    {
      id: "context-management",
      description:
        "Context management: working memory with salience-ranked retrieval (relevance × recency) over vectorized conversation turns",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (memory salience case)",
    },
    {
      id: "persistent-memory-retrieval",
      description:
        "Persistent-memory retrieval via a pluggable persistence adapter (Supabase-backed in edge/app deployments: frelux_archie_native_facts / frelux_archie_native_outcomes); in-memory fallback when unwired",
      maturity: "OPERATIONAL",
      measuredBy:
        "native-engine.test.ts (persistence round-trip), native-engine-runtime.test.ts",
    },
    {
      id: "knowledge-acquisition",
      description:
        "Knowledge acquisition and consolidation: SPO fact store with contradiction detection, confidence arbitration, duplicate merge, decay, and promotion — uncertain information is never stored as established fact",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (knowledge cases)",
    },
    {
      id: "planning",
      description:
        "Planning and decision-making: means-ends analysis over a registered operator library with cost-ranked plans and honest gap reports for missing prerequisites",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (planner cases)",
    },
    {
      id: "coding-intelligence-analysis",
      description:
        "Coding intelligence (analysis): deterministic static analysis — imports/exports/functions/classes extraction, cyclomatic-complexity estimate, risk flags",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (code analysis cases)",
    },
    {
      id: "coding-intelligence-generation",
      description:
        "Code analysis and generation: deterministic unit-test scaffold generation derived from analysis output. Open-ended generative coding is NOT_IMPLEMENTED and always reported honestly",
      maturity: "DEVELOPING",
      measuredBy: "native-engine.test.ts (scaffold generation case)",
    },
    {
      id: "tool-orchestration",
      description:
        "Tool orchestration: typed tool registry with contract validation, honest failure reporting, and a real deterministic arithmetic evaluator (shunting-yard)",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (tool + arithmetic cases)",
    },
    {
      id: "web-research",
      description:
        "Web research pipeline with PRIORITY SOURCE SELECTION: question → domain classification → appropriate priority sources first (wikipedia/britannica, MDN/github/stackoverflow/python/node docs, scholar/arxiv/pubmed, NIST/MITRE ATT&CK/OWASP/CVE per the owner registry) → parallel site-scoped searches → cross-source check → early stopping → discovered-source classification (never auto-trusted) → storage as low-confidence candidate knowledge with full provenance. Speed optimizations: parallel searches, result caching with TTL, deduplication, relevance ranking. Network-dependent; the DuckDuckGo Lite adapter operates without keys or auth bypass; priority sources and hierarchy per the owner's web knowledge source registry",
      maturity: "DEVELOPING",
      measuredBy:
        "native-engine.test.ts (research pipeline case with labeled test adapter) + archie-web-source-registry.test.ts (source selection, cross-check, caching, discovery)",
    },
    {
      id: "self-evaluation",
      description:
        "Self-evaluation and verification: contradiction scans, inference stability re-derivation, plan validity checks, response-integrity checks, calibration statistics",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (self-eval cases)",
    },
    {
      id: "outcome-learning",
      description:
        "Learning from validated outcomes: outcome recording with credit assignment, confidence reinforcement (success strengthens, failure/correction weakens), consolidation passes",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine.test.ts (learning cases)",
    },
    {
      id: "market-intelligence-price-lookup",
      description:
        "Market intelligence price lookup: price queries resolve through a pluggable lookup adapter over real observed market data (approved prices first, raw observations labeled honestly); no data or no wired adapter produces an honest refusal — ARCHIE never guesses prices",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine-runtime.test.ts (market price cases)",
    },
    {
      id: "system-adapters-documents-images-voice-social-family",
      description:
        "System adapters for documents, images, voice bank, social accounts and the trusted-people roster: status questions resolve through pluggable lookups over real deployed tables; no data or no wired adapter produces an honest refusal — system state is never invented",
      maturity: "OPERATIONAL",
      measuredBy: "native-engine-runtime.test.ts (system adapter cases)",
    },
    {
      id: "construction-calculators",
      description:
        "Deterministic construction calculators in chat: blocks for a wall, paint litres for an area, cement bags for a concrete volume — pure arithmetic with stated assumptions (450x225mm block, 10 m2/litre/coat, 1:2:4 mix); missing parameters get an honest request, never guessed numbers",
      maturity: "OPERATIONAL",
      measuredBy:
        "native-engine-runtime.test.ts (construction calculator cases)",
    },
    {
      id: "generative-language-model",
      description:
        "Open-ended natural-language generation comparable to a large language model. NOT implemented — ARCHIE composes structured responses from real retrieved knowledge, reasoning outputs, and tool results, and states clearly when knowledge is insufficient rather than imitating generative prose",
      maturity: "NOT_IMPLEMENTED",
      measuredBy:
        "honest disclosure — enforced by native-engine-runtime.test.ts (honesty cases)",
    },
  ];
}

/** Honest counts for diagnostics. */
export function manifestSummary(manifest: CapabilityReport[]): {
  operational: number;
  developing: number;
  notImplemented: number;
} {
  return {
    operational: manifest.filter((c) => c.maturity === "OPERATIONAL").length,
    developing: manifest.filter((c) => c.maturity === "DEVELOPING").length,
    notImplemented: manifest.filter((c) => c.maturity === "NOT_IMPLEMENTED")
      .length,
  };
}
