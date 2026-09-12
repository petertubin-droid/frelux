// =========================================================
// ARCHIE NATIVE INTELLIGENCE ENGINE — THE ENGINE
//
// ARCHIE's OWN inference runtime: a foundational core
// component that operates with ZERO external AI APIs. It
// implements the shared ArchieRuntime contract, so every
// ARCHIE surface (archie-core, archie-chat, Coding Studio,
// app) resolves it through the provider-agnostic engine
// registry — the registry slot that used to sit empty.
//
// Pipeline (permanent architecture):
//   NLU → MEMORY → KNOWLEDGE → REASONING → TOOLS →
//   LEARNING → VERIFICATION → IMPROVEMENT
//
// Honesty is structural: responses are composed from real
// retrieved facts, reasoning outputs, tool results and the
// capability manifest — never from canned conversation
// strings, and never pretending capabilities that do not
// exist (see capabilities.ts).
// =========================================================

import type {
  ArchieCapability,
  ArchieInferencePart,
  ArchieInferenceRequest,
  ArchieInferenceResult,
  ArchieInferenceTurn,
  ArchieRuntime,
} from "../runtime.ts";
import {
  crossCheckTicker,
  defaultFetcher,
  fetchCandles,
  type Fetcher,
} from "./crypto/market-data.ts";
import {
  buildPrediction,
  walkForwardValidate,
  type DataQuality,
} from "./crypto/probability.ts";
import {
  DEFAULT_TRADING_LIMITS,
  evaluateTradeGate,
  renderGateDecision,
  type TradingLimits,
  type TradeRequest,
} from "./crypto/trade-gate.ts";
import {
  NATIVE_ENGINE_ID,
  manifestSummary,
  nativeEngineCapabilityManifest,
} from "./capabilities.ts";
import {
  understand,
  decomposeClauses,
  MAX_COMPOUND_CLAUSES,
  composeCompound,
  tokenize,
  probeVocabulary,
} from "./nlu.ts";
// Conversational English expansion (owner directive,
// 2026-09-11): deterministic, grounded composition for
// social and conversational intents.
import { composeConversational } from "./conversation.ts";
import {
  derivedOpening,
  ownerAssertedOpening,
  howtoFooter,
  includesDerived,
  knowledgeOpening,
  unknownOpening,
  type Verbosity,
} from "./composer.ts";
import { ContextMemory } from "./memory.ts";
import { redactSecrets } from "../cognitive/security-integrity.ts";
import { FactStore } from "./knowledge.ts";
import { FULL_SEED_CORPUS, SEED_CORPUS_VERSION } from "./seed-corpus.ts";
import { PageFetcher } from "./page-fetch.ts";
import { WikipediaSearchAdapter } from "./wikipedia-search.ts";
import { DEFAULT_RULES, GENERAL_RULES, ReasoningEngine } from "./reasoning.ts";
import {
  consistency,
  executeStrategy,
  hypothesis,
  selectStrategies,
  comparative,
  constraint,
  temporal,
  extractComparisonSubjects,
} from "./strategies.ts";
import { DEFAULT_OPERATORS, PLANNING_OPERATORS, Planner } from "./planning.ts";
import {
  mergeLessonRisk,
  retrieveRelevantLessons,
  type RecordedLesson,
} from "./lessons.ts";
import { DomainSkillRegistry } from "./domains/registry.ts";
// Skill wiring only (composition): the engine imports NO
// construction logic — the calculator, rules, NLU lexicon,
// seed facts, quantities hint and operator execution all live
// in the skill and route through the registry
// (domain-capture completion 2026-09-11). Importers that need
// constructionEstimate import it from the domain module.
import { constructionSkill } from "./domains/construction.ts";
import { ToolOrchestrator, registerBuiltInTools } from "./tools.ts";
import {
  ResearchPipeline,
  salientTokens,
  type ResearchAdapter,
  DuckDuckGoLiteAdapter,
  MultiSearchAdapter,
} from "./webresearch.ts";
import { getWebSourceRegistry } from "./web-sources.ts";
import { analyzeSource, generateUnitTestScaffold } from "./coding.ts";
import {
  analyzeProject as analyzeProjectFiles,
  generateDependencyAwareTestScaffold,
  type ProjectAnalysis,
  type ProjectFile,
} from "./coding-project.ts";
import { SelfEvaluator } from "./selfeval.ts";
import { OutcomeLearner } from "./learning.ts";
import { SupabasePersistence, type SupabaseLike } from "./persistence.ts";
import { CounterPersistence, EpisodicPersistence } from "./persistence.ts";
import type { Fact, Plan, PlanLesson, RetrievedContext } from "./types.ts";

/** Phase 4.4 (lessons → behavior): caller-provided fetch of
 *  the owner's evolution-memory rows (archie_evolution_memory,
 *  §15). archie-chat wires this at boot with the service
 *  client. Null/[]/throw → the plan simply carries no lessons
 *  (absence is honest, never fabricated). */
export type LessonLookup = () => Promise<RecordedLesson[] | null>;

/** Foundational knowledge seeded at engine construction —
 *  real reference facts in ARCHIE's home domain. */
/** Region hint extraction for the market tool: honest —
 *  empty when the owner did not name a place (the tool then
 *  reports that a region is required; no default invented). */
function extractRegionHint(input: string): string {
  const m =
    /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/.exec(input) ??
    /\b(?:region|area|state|country)\s+(?:of|is|in)?\s*([A-Za-z]+(?:\s[A-Za-z]+)?)/i.exec(
      input,
    );
  return (m?.[1] ?? "").trim().slice(0, 80);
}

/** Deterministic, honest tool-output summarizer (plan P1):
 *  relays the tool's own answer fields verbatim; unknown
 *  shapes are shown as truncated JSON — never paraphrased
 *  into claims the tool did not make. */
function summarizeToolOutput(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    for (const key of [
      "answer",
      "text",
      "reply",
      "result",
      "summary",
      "price",
      "status",
    ]) {
      if (typeof o[key] === "string" && (o[key] as string).length > 0) {
        return o[key] as string;
      }
    }
    if (o.error && typeof o.error === "string") {
      return `The tool reported an error: ${o.error}`;
    }
    try {
      const j = JSON.stringify(output, null, 2);
      return j.length > 600 ? `${j.slice(0, 600)}…` : j;
    } catch {
      return "The tool returned output I could not display.";
    }
  }
  return String(output ?? "");
}

export interface ConverseResult {
  nlu: ReturnType<typeof understand>;
  responseText: string;
  confidence: number;
  citedFactIds: string[];
  selfCheck: { check: string; passed: boolean; detail: string };
  plan?: Plan;
  toolResults?: Array<{
    tool: string;
    ok: boolean;
    output: unknown;
    error?: string;
  }>;
  /** Pending tool invocation (plan P1, audit C1): the engine
   *  asks the CALLER to execute a declared tool and feed the
   *  result back as a trailing owner toolResult turn. Emitted
   *  ONLY when the caller declared the tool in the request. */
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

// ---------------------------------------------------------
// Market intelligence adapter boundary (pluggable, like the
// research adapter). Production (archie-chat) wires a real
// service-role lookup over mi_approved_prices / mi_price_
// observations; tests inject doubles. The engine NEVER guesses
// prices — no lookup wired or no data means an honest answer.
// ---------------------------------------------------------
export interface MarketPriceResult {
  product: string;
  price: number;
  currency: string;
  packageSize: number | null;
  packageUnit: string | null;
  marketCode: string;
  /** Honest freshness classification of the underlying record. */
  freshness: "fresh" | "recent" | "stale" | "expired";
  /** "approved" = curated price list; "observation" = raw crawl. */
  source: "approved" | "observation";
  recordedAt: string;
  note?: string;
}

export type MarketPriceLookup = (
  product: string,
  market?: string,
) => Promise<MarketPriceResult | null>;

// ---------------------------------------------------------
// System adapters (documents, images, voice bank, social,
// family). Same honest contract as the market lookup: a
// pluggable boundary the deployment wires to REAL tables;
// no data or no wired adapter produces an honest refusal —
// ARCHIE never invents system state.
// ---------------------------------------------------------
export interface SystemAdapterResult {
  /** The honest, fully-composed answer body. */
  headline: string;
  /** Real provenance (table(s) / adapter name). */
  source: string;
}

export type SystemAdapter = () => Promise<SystemAdapterResult | null>;

export type SystemAdapterKey =
  "documents" | "images" | "voice" | "social" | "family";

export type SystemAdapters = Partial<Record<SystemAdapterKey, SystemAdapter>>;

// Explicit owner confirmation language (audit H1, plan P3):
// this is VERIFICATION evidence — the opposite of a correction.
const EXPLICIT_CONFIRM =
  /\b(?:you were right about|you'?re right about|confirm that|i confirm that|verified that|verify that|that'?s (?:right|correct|exact) about)\b/i;

/** Request-scoped conversational state (audit fix C-1,
 *  2026-09-11). The engine singleton previously carried ONE
 *  shared ContextMemory, one conversation id and one tool
 *  surface — concurrent requests inside an edge isolate bled
 *  context across conversations and stamped episodic rows
 *  under the wrong conversation id. All per-request state now
 *  lives in a session object keyed by conversation id; the
 *  engine itself keeps only isolate-scoped state (facts,
 *  counters, learner, research, tools). */
interface EngineSession {
  conversationId: string;
  memory: ContextMemory;
  /** Tool names the CALLER declared (plan P1): toolCalls are
   *  emitted only for declared tools — never speculatively. */
  requestToolNames: string[];
  createdAt: number;
}

export class ArchieNativeEngine implements ArchieRuntime {
  /** Session table — bounded, FIFO-evicted. */
  private sessions = new Map<string, EngineSession>();
  /** Shared episodic snapshot hydrated ONCE per isolate at
   *  boot; every new session memory is seeded from it so
   *  prior-session context survives session isolation too. */
  private episodicTurns: Array<{
    role: "owner" | "archie";
    text: string;
    at: number;
  }> = [];
  /** Legacy pointer: the session selected by setConversationId
   *  or the last explicit opts — "default" for direct converse()
   *  callers, preserving the original serial semantics. */
  private currentSessionId = "default";

  private static readonly MAX_SESSIONS = 64;

  /** The session for a conversation id (created on demand,
   *  episodic-seeded, FIFO-bounded). */
  private sessionFor(conversationId?: string): EngineSession {
    const id =
      conversationId && conversationId.length > 0
        ? conversationId
        : this.currentSessionId;
    let session = this.sessions.get(id);
    if (!session) {
      const memory = new ContextMemory();
      if (this.episodicTurns.length > 0) {
        memory.hydrateEpisodic(this.episodicTurns);
      }
      session = {
        conversationId: id,
        memory,
        requestToolNames: [],
        createdAt: Date.now(),
      };
      this.sessions.set(id, session);
      if (this.sessions.size > ArchieNativeEngine.MAX_SESSIONS) {
        // FIFO eviction: oldest session is dropped — its
        // turns remain retrievable through episodic persistence.
        const oldest = [...this.sessions.entries()].sort(
          (a, b) => a[1].createdAt - b[1].createdAt,
        )[0];
        if (oldest) this.sessions.delete(oldest[0]);
      }
    }
    return session;
  }

  /** The caller declares its tool surface per request (plan
   *  P1). The cognitive kernel calls converse() directly, so
   *  it must be able to hand the surface to the substrate
   *  without going through generate(). Scoped to the
   *  CURRENT session (audit fix C-1) — concurrent
   *  conversations can no longer stomp each other's surface. */
  noteDeclaredTools(names: string[]): void {
    this.sessionFor().requestToolNames = names;
  }

  /** Per-request tool surface for an explicit conversation
   *  (C-1): generate()/kernel paths hand both in together. */
  private toolsFor(conversationId: string): string[] {
    return this.sessionFor(conversationId).requestToolNames;
  }
  readonly id = NATIVE_ENGINE_ID;
  readonly kind = "archie-native" as const;
  readonly label =
    "ARCHIE Native Intelligence Engine (own inference — operational)";

  private facts: FactStore;
  private reasoning: ReasoningEngine;
  private planner: Planner;
  private tools = new ToolOrchestrator();
  private selfEval = new SelfEvaluator();
  private learner: OutcomeLearner;
  private research: ResearchPipeline;
  /** Pluggable domain skills (audit fix 2026-09-11). */
  private domains: DomainSkillRegistry;
  private adapter: ResearchAdapter;
  private marketPriceLookup: MarketPriceLookup | null;
  /** H-2 — crypto market-data fetcher (null = real fetch). */
  private cryptoFetcher: Fetcher | null;
  /** H-2 — trade-gate limits. */
  private tradingLimits: TradingLimits;
  /** Phase 4.4 — owner evolution-memory lessons provider. */
  private lessonLookup: LessonLookup | null;
  private systemAdapters: SystemAdapters;
  private persistence: SupabasePersistence | null;
  private verbosity: Verbosity = "detailed";
  /** P7 — episodic-turn store (prior-session context). */
  private episodicStore: EpisodicPersistence | null = null;
  /** P7 — cross-isolate counter store. */
  private counterStore: CounterPersistence | null = null;
  /** P7 — calibration counters for THIS isolate only: the
   *  mean-confidence denominator must be local, or the
   *  calibration would dilute dishonestly. */
  private sessionInferences = 0;
  /** P7 — system-wide counters (seeded from persisted base
   *  at boot, incremented live, persisted per turn). */
  private unknownTopicHits = 0;
  private verificationFails = 0;
  private bootedAt = Date.now();
  private inferences = 0;
  private confidenceSum = 0;
  private booted = false;

  constructor(options?: {
    /** null/undefined = run in-memory only (the REAL
     *  personalization privacy control). */
    persistence?: SupabaseLike | null;
    researchAdapter?: ResearchAdapter;
    marketPriceLookup?: MarketPriceLookup;
    lessonLookup?: LessonLookup;
    systemAdapters?: SystemAdapters;
    /** P6 Batch B — owner verbosity profile. Selects which
     *  OPTIONAL connectives are composed; content and
     *  epistemic labels are identical in both modes. */
    verbosity?: Verbosity;
    /** P7 — conversation id for episodic-turn session
     *  grouping. Default 'default'. */
    conversationId?: string;
    /** Audit fix H-2 — injected crypto market-data fetcher.
     *  null/undefined = the real global fetch (all venues
     *  queried live; unreachable venues are reported
     *  honestly, never simulated). */
    cryptoFetcher?: Fetcher;
    /** Audit fix H-2 — owner trading limits for the trade
     *  gate. Defaults to DEFAULT_TRADING_LIMITS. */
    tradingLimits?: TradingLimits;
  }) {
    this.currentSessionId = options?.conversationId ?? "default";
    this.cryptoFetcher = options?.cryptoFetcher ?? null;
    this.tradingLimits = options?.tradingLimits ?? DEFAULT_TRADING_LIMITS;
    this.verbosity = options?.verbosity ?? "detailed";
    this.marketPriceLookup = options?.marketPriceLookup ?? null;
    this.lessonLookup = options?.lessonLookup ?? null;
    this.systemAdapters = options?.systemAdapters ?? {};
    this.persistence = options?.persistence
      ? new SupabasePersistence(options.persistence)
      : null;
    // P7: episodic-turn persistence shares the SAME consent
    // gate — persistence null (consent revoked) means no
    // episodic reads or writes either.
    this.episodicStore = options?.persistence
      ? new EpisodicPersistence(options.persistence)
      : null;
    // P7 batch 2 — cross-isolate counters share the same
    // consent gate (persistence null → in-memory only).
    this.counterStore = options?.persistence
      ? new CounterPersistence(options.persistence)
      : null;
    this.adapter =
      options?.researchAdapter ??
      // Composite search (audit Phase 2.2): DDG Lite first
      // (best coverage where its IPs are not blocked), with an
      // HONEST fallback to the edge-reliable Wikipedia API —
      // DDG anomaly-blocks Supabase datacenter traffic
      // (live-verified), and a blocked primary must never
      // become a fake "no results" research report.
      new MultiSearchAdapter([
        new DuckDuckGoLiteAdapter(),
        new WikipediaSearchAdapter(),
      ]);
    this.facts = new FactStore(this.persistence ?? undefined);
    // Domain-skill registry (audit fix 2026-09-11, domain-
    // capture removal): construction knowledge — calculator,
    // rules, operator — is a pluggable skill, not engine
    // structure. The engine stays domain-neutral; the
    // registered skills compose the effective rule and
    // operator sets, so shipped behavior is unchanged.
    this.domains = new DomainSkillRegistry();
    registerBuiltInDomainSkills(this.domains);
    // Domain-general reasoning substrate first, domain rules
    // after (owner directive 2026-09-10 §16): domain knowledge
    // is additive, never structural.
    this.reasoning = new ReasoningEngine(this.facts, [
      ...GENERAL_RULES,
      ...DEFAULT_RULES,
      ...this.domains.rules(),
    ]);
    this.planner = new Planner(this.facts, [
      ...DEFAULT_OPERATORS,
      ...PLANNING_OPERATORS,
      ...this.domains.operators(),
    ]);
    this.learner = new OutcomeLearner(
      this.facts,
      this.persistence ?? undefined,
    );
    // PRIORITY WEB KNOWLEDGE SOURCE REGISTRY — intelligent
    // source selection (owner directive 2026-09-10): the
    // research pipeline classifies the question's domain and
    // searches the most appropriate priority sources first.
    this.research = new ResearchPipeline(
      this.facts,
      this.adapter,
      getWebSourceRegistry(),
      // Audit Phase 2.2 — real page fetching: the top hits are
      // deepened with robots-checked, timeout-guarded page
      // content; content agreement raises the confidence cap.
      new PageFetcher(),
    );
    registerBuiltInTools(this.tools);
  }

  /** Hydrate persisted knowledge + seed foundational facts. */
  async boot(): Promise<{ hydratedFacts: number; seededFacts: number }> {
    if (this.booted) {
      return { hydratedFacts: 0, seededFacts: 0 };
    }
    this.booted = true;
    const hydratedFacts = await this.facts.hydrate();
    let seededFacts = 0;
    // Corpus v2 (plan P4, audit K1): versioned, swappable
    // knowledge — domain foundations + FRELUX product facts.
    // Domain-capture completion 2026-09-11: the engine seeds its
    // own generic/business corpus, then every registered skill
    // contributes its domain facts through the registry —
    // construction semantics no longer live in this file.
    for (const seed of [...FULL_SEED_CORPUS, ...this.domains.seedFacts()]) {
      const exists = this.facts
        .query({ subject: seed.subject, predicate: seed.predicate })
        .some((f) => JSON.stringify(f.object) === JSON.stringify(seed.object));
      if (!exists) {
        await this.facts.assert({
          ...seed,
          provenance: {
            source: "seed",
            note: `seed corpus v${SEED_CORPUS_VERSION} + domain skills (${this.domains.ids().join(", ") || "none"}) — engine/business corpus + skill-contributed facts, seeded at engine boot`,
          },
          status: "validated",
        });
        seededFacts += 1;
      }
    }
    // Situational facts for planning preconditions.
    if (this.facts.count() > 0) {
      await this.facts.assert({
        subject: "knowledge",
        predicate: "available",
        object: `${this.facts.count()} fact(s) in store`,
        confidence: 0.9,
        provenance: { source: "seed", note: "knowledge store is populated" },
        status: "validated",
      });
    }
    await this.facts.assert({
      subject: "rules",
      predicate: "loaded",
      object: `${GENERAL_RULES.length + DEFAULT_RULES.length} reasoning rules registered`,
      confidence: 0.9,
      provenance: { source: "seed", note: "reasoning rule library loaded" },
      status: "validated",
    });
    await this.learner.hydrate();
    // P7 batch 2 — seed system-wide counters from the
    // persisted base so diagnostics report system-wide
    // numbers, not per-isolate noise.
    if (this.counterStore) {
      try {
        const base = await this.counterStore.loadCounters();
        this.inferences += base["inferences"] ?? 0;
        this.unknownTopicHits += base["unknown_topic_hits"] ?? 0;
        this.verificationFails += base["verification_fails"] ?? 0;
      } catch {
        // Counter hydration is best-effort: unavailable table
        // → this isolate counts from zero, honestly.
      }
    }
    // P7 — hydrate prior-session episodic context once per
    // isolate. Cross-isolate: a fresh chat request recalls
    // owner-taught context from previous sessions.
    if (this.episodicStore) {
      try {
        const rows = await this.episodicStore.loadEpisodicTurns();
        if (rows.length > 0) {
          // C-1: episodic turns live in ONE shared snapshot;
          // every session memory is seeded from it on creation.
          this.episodicTurns = rows
            .slice()
            .reverse() // oldest first, stable ranking
            .map((r) => ({
              role: r.role,
              text: r.text,
              at: Date.parse(r.turn_at) || Date.now(),
            }));
          // Already-created sessions pick the snapshot up too.
          for (const session of this.sessions.values()) {
            session.memory.hydrateEpisodic(this.episodicTurns);
          }
        }
      } catch {
        // Episodic hydration is best-effort: an unavailable
        // table degrades to in-session memory only — the
        // conversation still works.
      }
    }
    return { hydratedFacts, seededFacts };
  }

  isOperational(): boolean {
    return true; // genuinely implemented — see capabilities()
  }

  /** P7/C-1 — select the conversation id for episodic-turn
   *  session grouping. Legacy pointer semantics preserved for
   *  direct converse() callers; generate()/kernel hand the id
   *  per request so concurrent conversations never share a
   *  session. */
  setConversationId(id: string): void {
    this.currentSessionId = id || "default";
  }

  capabilities(): ArchieCapability[] {
    return [
      "inference",
      "tokenization",
      "context-handling",
      "retrieval",
      "memory",
      "tool-calling",
      "structured-output",
      "evaluation",
      "monitoring",
    ];
  }

  async generate(req: ArchieInferenceRequest): Promise<ArchieInferenceResult> {
    const lastOwner = [...req.turns]
      .reverse()
      .find((t: ArchieInferenceTurn) => t.role === "owner");
    // The caller's declared tool surface (plan P1, audit C1) —
    // stamped onto the REQUEST'S session, not the isolate
    // (audit fix C-1: concurrent conversations never share
    // a tool surface or a memory).
    const conversationId =
      (req as { conversationId?: string }).conversationId ??
      this.currentSessionId;
    const session = this.sessionFor(conversationId);
    session.requestToolNames = req.tools.map((t) => t.name);
    // Tool-result resume (plan P1): the caller executed the
    // tool and fed the REAL output back — compose the final
    // answer from it, verbatim and provenance-labeled.
    const trailingToolResult = lastOwner?.parts.find(
      (p: ArchieInferencePart) => p.toolResult,
    )?.toolResult;
    if (trailingToolResult) {
      return this.resumeFromToolResult(trailingToolResult, session);
    }
    const text = lastOwner
      ? lastOwner.parts
          .map((p: ArchieInferencePart) => p.text ?? "")
          .join(" ")
          .trim()
      : "";
    const result = await this.converse(text, req.turns, req.systemInstruction, {
      conversationId,
    });
    const parts: ArchieInferencePart[] = [{ text: result.responseText }];
    if (result.toolCall) {
      // The dead-tool seam (audit C1) is now bridged: the
      // engine EMITS the call; the caller's tool loop (it
      // already exists in archie-chat) executes it and feeds
      // the result back.
      parts.push({
        toolCall: {
          name: result.toolCall.name,
          args: result.toolCall.args,
        },
      });
    }
    return {
      parts,
      engine: {
        path: "archie-native",
        note: "Generated by ARCHIE's own Native Intelligence Engine — no external AI provider involved.",
      },
      finishReason: result.toolCall ? "TOOL_CALL" : "COMPLETE",
    };
  }

  /** Compose the final answer from a REAL tool result —
   *  relayed verbatim, provenance-labeled, never fabricated
   *  (plan P1). The tool's own output decides what ARCHIE
   *  can say; the engine only frames it honestly. */
  private resumeFromToolResult(
    toolResult: {
      name: string;
      output: unknown;
    },
    session: EngineSession,
  ): ArchieInferenceResult {
    this.inferences += 1;
    this.sessionInferences += 1;
    const body = summarizeToolOutput(toolResult.output);
    const text =
      `${body}\n` +
      `[Source: ${toolResult.name} tool — real system output relayed verbatim by the ARCHIE native engine. I never fabricate system state.]`;
    session.memory.addTurn("owner", `[tool result: ${toolResult.name}]`);
    session.memory.addTurn("archie", text);
    return {
      parts: [{ text }],
      engine: {
        path: "archie-native",
        note: "Tool-result resume — ARCHIE's native engine composed the answer from real tool output. No external AI provider involved.",
      },
      finishReason: "COMPLETE",
    };
  }

  /** One full conversational inference pass. */
  async converse(
    input: string,
    history?: ArchieInferenceTurn[],
    /** Caller-provided operating context (persona, domain
     *  scope, injected knowledge base) — consulted as a
     *  retrieval source, never persisted as knowledge. */
    systemInstruction?: string,
    /** Request scoping (audit fix C-1): the conversation id
     *  for this pass, and (kernel handoff, M-1) a
     *  precomputed NLU result so the input is parsed ONCE
     *  per request instead of once per layer. */
    opts?: {
      conversationId?: string;
      nlu?: ReturnType<typeof understand>;
    },
  ): Promise<ConverseResult> {
    await this.boot();
    this.inferences += 1;
    this.sessionInferences += 1;
    // C-1: the memory, conversation id and episodic stamping
    // are SESSION-scoped. Concurrent requests with different
    // conversation ids are fully isolated; serial calls on
    // the same id keep their continuity.
    if (opts?.conversationId) this.currentSessionId = opts.conversationId;
    const session = this.sessionFor(opts?.conversationId);
    const memory = session.memory;
    memory.seedFromTurns(
      (history ?? []).map((t) => ({
        role: t.role,
        text: t.parts
          .map((p) => p.text ?? "")
          .join(" ")
          .trim(),
      })),
    );
    // Anaphora context (audit L.5): the turns BEFORE this
    // message are the resolver's evidence — captured before
    // the current input is added.
    const priorTurns = memory.recentTurns(6);

    memory.addTurn("owner", input);

    const nlu = understand(input, priorTurns, {
      rules: this.domains.nluRules(),
    });
    // A resolved pronoun is a RETRIEVAL hint only: it widens
    // the fact/memory query so a follow-up ("how do i apply
    // it?") ranks the referent's knowledge. Never surfaced as
    // a claim, never persisted.
    const referents = Array.from(
      new Set(
        nlu.anaphora.filter((a) => a.referent).map((a) => a.referent as string),
      ),
    );
    const retrievalQuery =
      referents.length > 0 ? `${input} ${referents.join(" ")}` : input;
    const context = memory.retrieve(retrievalQuery);
    const ranked = this.facts.rank(retrievalQuery);

    // Compound-request decomposition (plan P2, audit N2):
    // owners speak in multi-part requests. Each clause gets
    // its own honest route — nothing is silently dropped.
    // Negated clauses are constraints: acknowledged and
    // excluded, never answered.
    const clauses = decomposeClauses(input);
    let outcome: ConverseResult;
    if (clauses.length > MAX_COMPOUND_CLAUSES) {
      outcome = this.compose(
        `That is ${clauses.length} requests in one message — more than I can hold honestly in one pass. Send them one or two at a time and I will answer each fully.`,
        nlu.confidence * 0.5,
        [],
      );
    } else if (clauses.length > 1 || clauses[0].negated) {
      // A single clause that is itself an exclusion routes
      // through the same honest exclusion path.
      outcome = await this.routeClauses(clauses, systemInstruction, session);
    } else {
      outcome = await this.route(
        nlu,
        input,
        ranked,
        context,
        systemInstruction,
      );
    }
    this.confidenceSum += outcome.confidence;

    const selfCheck = this.selfEval.verifyResponse(
      outcome.citedFactIds,
      this.facts,
      false,
    );
    // P7 — a failed response-integrity check is a real,
    // countable verification failure (cross-isolate).
    if (!selfCheck.passed) this.verificationFails += 1;
    // Phase 3.3 (audit) — REAL semantic verification: the
    // response's PROSE must agree with the validated facts it
    // cites (restated numbers match, nothing negates a cited
    // validated fact). A misstatement in the reply is a
    // countable verification failure, not just a hidden risk.
    const semanticCheck = this.selfEval.verifySemanticClaims(
      outcome.citedFactIds
        .map((id) => this.facts.get(id))
        .filter((f): f is Fact => f !== undefined),
      outcome.responseText,
    );
    if (!semanticCheck.passed) this.verificationFails += 1;
    memory.addTurn("archie", outcome.responseText);
    // P7 — persist this turn pair so the NEXT session (any
    // isolate) recalls it. Consent gate: this.episodicStore
    // is null when personalization_memory is revoked.
    if (this.episodicStore) {
      const at = Date.now();
      const convId = session.conversationId;
      const ownerText = input;
      const archieText = outcome.responseText;
      try {
        await this.episodicStore.saveEpisodicTurn({
          conversationId: convId,
          role: "owner",
          text: ownerText,
          at,
        });
        await this.episodicStore.saveEpisodicTurn({
          conversationId: convId,
          role: "archie",
          text: archieText,
          at: at + 1,
        });
      } catch {
        // Best-effort: a failed episodic write never breaks
        // the conversation.
      }
    }

    // Learning: an answer that cites knowledge is NOT a
    // verified outcome — citing must never reinforce (audit
    // C3). Only explicit owner confirmation counts as real
    // success evidence for the cited facts.
    // Evidence-quality learning (audit H1): gratitude and
    // praise are ACKNOWLEDGEMENT — engagement, not
    // verification. They must never reinforce or promote the
    // knowledge cited in the answer. Only an EXPLICIT owner
    // confirmation that names the subject ("you were right
    // about X", "confirm that X", "verify that X") is real
    // success evidence.
    // The correction route records confirmation outcomes
    // itself (kind "success"); recording here too would double
    // the reinforcement. When the intent is correction the
    // route has already handled the outcome.
    const explicitlyConfirmed =
      outcome.citedFactIds.length > 0 &&
      nlu.intent !== "correction" &&
      EXPLICIT_CONFIRM.test(input);
    const acknowledged =
      nlu.intent === "gratitude" ||
      /\b(?:good answer|well done|nice work|great job|thanks?|thank you)\b/i.test(
        input,
      );
    await this.learner.record({
      kind: explicitlyConfirmed
        ? "success"
        : acknowledged
          ? "acknowledged"
          : "cited",
      task: `${nlu.intent}: ${input.slice(0, 80)}`,
      contributing: outcome.citedFactIds,
    });

    // P7 batch 2 — persist system-wide counters after the
    // turn. Read-modify-write upsert: under concurrent
    // isolates the LAST write wins; these are diagnostics,
    // not accounting (documented in CounterPersistence).
    if (this.counterStore) {
      try {
        await this.counterStore.saveCounters({
          inferences: this.inferences,
          unknown_topic_hits: this.unknownTopicHits,
          verification_fails: this.verificationFails,
        });
      } catch {
        // Best-effort: a failed counter write never breaks
        // the conversation.
      }
    }

    return { ...outcome, nlu, selfCheck };
  }

  /** Intent routing — the intelligence core of a turn. */
  /** P1b — strategy-driven speculation. "Why" / uncertain
   *  questions receive ranked hypothesis framing (status:
   *  hypothesis, NEVER fact); conflicting-evidence questions
   *  receive an explicit conflict band. Both cite real store
   *  evidence or state plainly that none exists. */
  /** Strategy-backed answers (plan P5 Batch C): comparative,
   *  constraint and temporal questions answered from real
   *  stored evidence with honest refusals otherwise. Returns
   *  null to fall through to normal knowledge handling. */
  private async strategyAnswer(
    input: string,
    ranked: Fact[],
    confidence: number,
  ): Promise<ConverseResult | null> {
    const task = {
      text: input,
      subject: ranked[0]?.subject,
      facts: this.facts,
      reasoning: this.reasoning,
      rules: this.reasoning.getRules(),
    };
    const sel = selectStrategies(task);

    // ── comparative ──
    if (sel.chosen.includes("comparative")) {
      const pair = extractComparisonSubjects(input);
      if (pair) {
        const comp = comparative({
          ...task,
          subject: pair.a,
          subject2: pair.b,
        });
        if (comp.conclusions.length > 0) {
          const lines = comp.conclusions.map(
            (c, i) =>
              `${i + 1}. ${c.statement} — confidence ${(c.confidence * 100).toFixed(0)}%`,
          );
          return this.compose(
            `Comparison of ${pair.a} vs ${pair.b}, from my stored facts only:\n${lines.join("\n")}\n${comp.explanation}\nEvery line is derived from the cited facts — where my store lacks a dimension you care about, I say so rather than invent it.`,
            Math.min(
              0.9,
              Math.max(...comp.conclusions.map((c) => c.confidence)),
            ),
            comp.evidence.slice(0, 6),
          );
        }
        return this.compose(
          `I can compare ${pair.a} and ${pair.b} only on dimensions I hold facts for — and my store has no shared predicate between them, so there is nothing real to compare. I will not invent a comparison. Teach me facts about either (or both) and I will compare them properly.`,
          confidence * 0.45,
          [],
        );
      }
    }

    // ── constraint ──
    if (sel.chosen.includes("constraint")) {
      const con = constraint(task);
      // "No numeric constraint detected" → not a constraint
      // question; fall through to normal handling.
      if (!/no numeric constraint/i.test(con.summary)) {
        const subject = ranked[0]?.subject ?? "this";
        if (con.conclusions.length === 0) {
          return this.compose(
            `I parsed the bound in your question, but I hold no numeric facts about ${subject} to check it against — I will not guess whether it satisfies the constraint. Teach me the real value (e.g. "remember that the ${subject} cost is X") and I will check the bound properly.`,
            confidence * 0.45,
            [],
          );
        }
        const lines = con.conclusions.map((c) => `- ${c.statement}`);
        return this.compose(
          `Constraint check on ${subject}, from my stored facts:\n${lines.join("\n")}\n${con.explanation}`,
          Math.min(0.9, Math.max(...con.conclusions.map((c) => c.confidence))),
          con.evidence.slice(0, 6),
        );
      }
    }

    // ── temporal ──
    if (sel.chosen.includes("temporal")) {
      const rawSubject =
        /\b(?:about|for|of)\s+([a-z0-9\- ]+)/i.exec(input)?.[1] ?? "";
      // Normalize "the cement price" → "cement" so the store
      // lookup actually finds the subject's facts.
      const extracted = rawSubject
        .trim()
        .replace(/^(?:the|my)\s+/i, "")
        .replace(/\s+(?:prices?|costs?|cost|history|timeline|records?)$/i, "")
        .trim();
      const subject = extracted.length > 0 ? extracted : ranked[0]?.subject;
      const tem = subject ? temporal({ ...task, subject }) : null;
      if (tem) {
        if (tem.conclusions.length > 0) {
          const lines = tem.conclusions.map(
            (c) =>
              `- ${c.statement} (confidence ${(c.confidence * 100).toFixed(0)}%)`,
          );
          return this.compose(
            `Dated facts about ${subject}, in chronological order, from my store only:\n${lines.join("\n")}\n${tem.explanation}`,
            Math.min(
              0.9,
              Math.max(...tem.conclusions.map((c) => c.confidence)),
            ),
            tem.evidence.slice(0, 6),
          );
        }
        // Perf-pass fix (2026-09-11, cx-3, refined same day):
        // zero DATED conclusions must not mask a stored fact
        // that ACTUALLY answers the when-question — e.g.
        // (delivery, is, "on Tuesday"). But a fact merely
        // mentioning the subject (a definition, a price) is
        // NOT an answer to "when": falling through to it would
        // replace the honest no-history answer with a
        // non-answer. Fall through only when a subject fact
        // carries a temporal value (weekday/date-like object
        // or a when/day/date predicate).
        const answersWhen = (f: Fact) =>
          (typeof f.object === "string" &&
            (/^on\s+/i.test(f.object) ||
              /\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b/i.test(
                f.object,
              ))) ||
          /(?:^|-)(?:when|day|date|time|due|schedule)/i.test(f.predicate);
        const hasTemporalAnswer =
          subject !== null &&
          subject !== undefined &&
          ranked.some(
            (f) =>
              (f.subject === subject || f.subject.includes(subject)) &&
              answersWhen(f),
          );
        if (!hasTemporalAnswer) {
          return this.compose(
            `That asks about the timeline of ${subject ?? "this"}, but I hold no dated facts about it — I will not reconstruct a history I do not have. Teach me dated facts ("X was true on <date>") and I will order them properly.`,
            confidence * 0.45,
            [],
          );
        }
        return null; // stored facts exist — let the standard knowledge path answer
      }
    }
    return null;
  }

  private async speculativeAnswer(
    input: string,
    ranked: Fact[],
    confidence: number,
  ): Promise<ConverseResult | null> {
    const subject = ranked[0]?.subject;
    const strategyTask = {
      text: input,
      subject,
      facts: this.facts,
      reasoning: this.reasoning,
      rules: this.reasoning.getRules(),
    };
    const sel = selectStrategies(strategyTask);
    const wantsSpeculation =
      sel.chosen.includes("hypothesis") ||
      sel.chosen.includes("abductive") ||
      sel.chosen.includes("causal");
    // "A or B" numeric questions / disagreement language →
    // the conflicting-evidence band.
    const conflictClaim =
      /\b(disagree|disagrees|disagreeing|conflicting|conflicts?|contradict|contradicts|contradiction)\b/i.test(
        input,
      ) ||
      (/\bor\b/i.test(input) && /\d/.test(input));

    if (conflictClaim) {
      const cons = consistency(strategyTask);
      const storeConflicts = cons.conclusions.length > 0;
      const lines = storeConflicts
        ? cons.conclusions.map((c) => `- ${c.statement}`)
        : [
            "- your sources disagree, but I hold no stored facts on this point to arbitrate between them",
          ];
      return this.compose(
        `Conflicting evidence on this. ${storeConflicts ? "My knowledge store contains competing claims:" : ""}\n${lines.join("\n")}\n` +
          `Confidence band: conflicting. I will not average the claims away or assert either side as knowledge — both stay uncertain until the conflict is resolved. To verify: identify which source is authoritative, tell me the resolution, and I will retain it.`,
        confidence * 0.5,
        cons.evidence.slice(0, 5),
      );
    }
    if (!wantsSpeculation) return null;

    const hyp = await hypothesis(strategyTask);
    if (hyp.conclusions.length > 0) {
      const lines = hyp.conclusions.map(
        (c, i) =>
          `${i + 1}) ${c.statement} — confidence ${(c.confidence * 100).toFixed(0)}%. To verify: check the cited evidence independently. NOT established as fact.`,
      );
      return this.compose(
        `I do not have validated knowledge on this, so here are working hypotheses — framed as hypotheses, never as fact:\n${lines.join("\n")}\n` +
          `Each hypothesis names the evidence needed to promote or eliminate it; check that evidence before acting on any of them.`,
        confidence * 0.5,
        hyp.evidence.slice(0, 5),
      );
    }
    // No evidentiary basis at all: refuse to fabricate, honestly.
    return this.compose(
      `I do not have validated knowledge on this. A real hypothesis needs at least some evidence, and I hold none on this subject — any possible cause I invented would be fiction dressed as reasoning, so I refuse to fabricate one. ` +
        `My honest position: uncertain until you teach me the relevant facts or I research them; then I will rank hypotheses and name the evidence to check for each.`,
      confidence * 0.4,
      [],
    );
  }

  /** Extract quantity+unit pairs from text ("3 days", "7 mm"). */
  private quantitiesIn(text: string): Array<{ value: number; unit: string }> {
    const re =
      /(\d+(?:\.\d+)?)\s*(days?|hours?|hrs?|weeks?|months?|mm|cm|meters?|metres?|m|kg|tonnes?|tons?|%)/gi;
    const out: Array<{ value: number; unit: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({
        value: parseFloat(m[1]),
        unit: m[2].toLowerCase().replace(/s$/, ""),
      });
    }
    return out;
  }

  /** P1b compositional hypothesis: connect the numbers in the
   *  user's problem to the numbers in validated knowledge. A
   *  gap (question value below knowledge requirement, same
   *  unit) becomes a working-hypothesis "possible cause" —
   *  always framed as NOT established as fact. */
  private speculativeFollowUp(input: string, validated: Fact[]): string | null {
    if (
      !/\b(why|how come|cause|crack|cracked|fail|failed|failure|problem|broken|damage|damaged)\b/i.test(
        input,
      )
    ) {
      return null;
    }
    const qNums = this.quantitiesIn(input);
    if (qNums.length === 0) return null;
    for (const f of validated) {
      const fNums = this.quantitiesIn(String(f.object));
      for (const q of qNums) {
        for (const fn of fNums) {
          if (q.unit === fn.unit && q.value < fn.value) {
            return (
              `Working hypothesis (possible cause — NOT established as fact): the situation mentions ${q.value} ${q.unit}, ` +
              `while my knowledge records “${f.subject} ${f.predicate.replace(/-/g, " ")}: ${String(f.object)}”. ` +
              `The gap between ${q.value} and ${fn.value} ${fn.unit} may be the cause. ` +
              `To verify: check what was actually done on site against the recorded requirement — confirm before acting on this.`
            );
          }
        }
      }
    }
    return null;
  }

  /** Public retrieval surface (audit M-2/C-1): the SAME
   *  TF-IDF context retrieval converse() uses, scoped to a
   *  conversation's session. Callers (tests, tools) no longer
   *  reach into private state to verify recall. */
  retrieveContext(query: string, conversationId?: string): RetrievedContext {
    return this.sessionFor(conversationId).memory.retrieve(query);
  }

  /** Public knowledge ranking surface (audit M-2): the SAME
   *  TF-IDF FactRankIndex ranking converse() uses. */
  rankKnowledge(query: string, k?: number): Fact[] {
    return this.facts.rank(query, k);
  }

  /** Run citation verification from outside the engine —
   *  used by the reasoning-loop controller (plan P5) so
   *  externally composed results get the same verification
   *  rigor as the internal path. */
  verifyCitations(factIds: string[]): ConverseResult["selfCheck"] {
    return this.selfEval.verifyResponse(factIds, this.facts, false);
  }

  /** Route each decomposed clause of a compound request and
   *  compose one honest, numbered answer (plan P2, audit N2).
   *  Negated clauses are listed as respected exclusions — the
   *  engine must answer what was asked and visibly honor what
   *  was excluded. */
  private async routeClauses(
    clauses: ReturnType<typeof decomposeClauses>,
    systemInstruction?: string,
    session?: EngineSession,
  ): Promise<ConverseResult> {
    const parts: string[] = [];
    const cited = new Set<string>();
    const excluded: string[] = [];
    let confSum = 0;
    let positive = 0;
    for (const clause of clauses) {
      if (clause.negated) {
        excluded.push(clause.text);
        continue;
      }
      const clauseNlu = understand(clause.text);
      const clauseRanked = this.facts.rank(clause.text);
      const clauseContext = (session ?? this.sessionFor()).memory.retrieve(
        clause.text,
      );
      const res = await this.route(
        clauseNlu,
        clause.text,
        clauseRanked,
        clauseContext,
        systemInstruction,
        session,
      );
      positive += 1;
      confSum += res.confidence;
      parts.push(res.responseText);
      for (const id of res.citedFactIds) cited.add(id);
    }
    const text = composeCompound(parts, excluded);
    return {
      nlu: understand(clauses[0].text),
      responseText: text,
      confidence: positive > 0 ? confSum / positive : 0.4,
      citedFactIds: [...cited],
      selfCheck: this.selfEval.verifyResponse([...cited], this.facts, false),
    };
  }

  /** Phase 2.4: one bounded, NON-PERSISTING derivation pass
   *  over a scratch copy of the store. The question's exact
   *  SPO probe (subject + attribute noun) decides what counts
   *  as an answer — unrelated chain conclusions are discarded.
   *  ONLY a derived fact that actually answers the probe is
   *  promoted into the real store, so a question never leaves
   *  knowledge behind (casual conversation still creates no
   *  facts — the memory-integration guarantee). Promotion goes
   *  through assert(): twin detection, reinforcement and
   *  conflict handling all still apply. Returns the promoted
   *  facts ([] when nothing derived or nothing matched). */
  private async deriveForQuestion(qSPO: {
    subject: string;
    predicate: string;
  }): Promise<Fact[]> {
    const scratch = new FactStore();
    for (const f of this.facts.list()) {
      // Copy without id/validatedCount/createdAt — assert()
      // re-mints those on the scratch store.
      await scratch.assert({
        subject: f.subject,
        predicate: f.predicate,
        object: f.object,
        qualifiers: f.qualifiers,
        confidence: f.confidence,
        provenance: f.provenance,
        status: f.status,
      });
    }
    const scratchReasoning = new ReasoningEngine(
      scratch,
      this.reasoning.getRules(),
    );
    const inference = await scratchReasoning.forwardChain();
    if (inference.derived.length === 0) return [];
    const hit = scratch
      .query({ subject: qSPO.subject, predicate: qSPO.predicate })
      .filter((f) => f.status === "derived")
      .slice(0, 3);
    if (hit.length === 0) return [];
    const promoted: Fact[] = [];
    for (const f of hit) {
      const res = await this.facts.assert({
        subject: f.subject,
        predicate: f.predicate,
        object: f.object,
        qualifiers: f.qualifiers,
        confidence: f.confidence,
        provenance: f.provenance,
        status: f.status,
      });
      promoted.push(res.fact);
    }
    return promoted;
  }

  private async route(
    nlu: ReturnType<typeof understand>,
    input: string,
    ranked: Fact[],
    context: RetrievedContext,
    systemInstruction?: string,
    session?: EngineSession,
  ): Promise<ConverseResult> {
    /** The request's declared tool surface — session-scoped
     *  (C-1): falls back to the legacy pointer's session for
     *  direct converse() callers. */
    const requestToolNames = session
      ? session.requestToolNames
      : this.sessionFor().requestToolNames;
    const cite = (facts: Fact[]) => facts.map((f) => f.id);

    // cd-3 — cross-system contradiction reconciliation: "the
    // web says X but I told you Y". Surface BOTH sources,
    // compare provenance, reconcile honestly: owner-taught
    // knowledge stays authoritative for the owner's project;
    // external claims remain candidate evidence. Never
    // silently pick a side.
    if (
      /\b(?:web|internet|online|article|site|source)\b[^.?!]*\bsays?\b[^.?!]*\bbut\b[^.?!]*\b(?:i|i'm|we|my|our)\b/i.test(
        input,
      )
    ) {
      const webClaim = input.match(/\bsays?\s+([^.?!]*?)\s+but/i)?.[1];
      const ownerClaim = input.match(
        /\bbut\s+(?:i told you|i said|we agreed(?: on)?|my|our|i'm)\s+([^.?!]+)/i,
      )?.[1];
      return this.compose(
        `These two sources disagree — I will not silently pick a side. External claim: "${webClaim ?? "(not extracted)"}" (candidate evidence, single-source provenance). Your statement: "${ownerClaim ?? "(not extracted)"}" (owner-taught, authoritative for your project). ` +
          `To reconcile honestly: your value stays my working knowledge with owner provenance; the external value is retained as unverified evidence that should be cross-checked — say "research this" and I will fetch independent sources to resolve the disagreement. If the external claim is from a price list you trust, teach it explicitly and I will store it with that provenance.`,
        nlu.confidence * 0.7,
        [],
      );
    }

    // P5 Batch C — strategy-backed answers where the store
    // holds real evidence (comparative / constraint / temporal)
    // take precedence for QUESTION-LIKE intents only. Each
    // composes from cited facts and refuses honestly when the
    // store lacks the needed predicates — teaching, correction
    // and arithmetic are never intercepted (intent allowlist).
    if (
      [
        "knowledge_query",
        "howto_guidance",
        "research_request",
        "price_query",
      ].includes(nlu.intent)
    ) {
      const strat = await this.strategyAnswer(input, ranked, nlu.confidence);
      if (strat) return strat;
    }

    switch (nlu.intent) {
      // -------------------------------------------------
      // Conversational English expansion (owner directive,
      // 2026-09-11): social and conversational intents are
      // composed deterministically by the conversational
      // composer — grounded in the real clock, the real
      // memory turns, the real engine state. No canned
      // scripts, no fabricated feelings, no invented facts.
      // Learning semantics are unchanged: these turns are
      // acknowledgement or cited outcomes that reinforce
      // nothing (recorded after the switch, below).
      // -------------------------------------------------
      // Greeting keeps the REAL engine state greeting (owner
      // spec, native-engine-runtime test: "greets with real
      // engine state — no canned conversational script").
      case "greeting": {
        const text = `ARCHIE native engine online and listening. ${this.statusLine()} Ask me anything in my knowledge, or teach me something new.`;
        return this.compose(text, nlu.confidence, []);
      }
      case "farewell":
      case "gratitude":
      case "help_request":
      case "apology":
      case "acknowledgment":
      case "agreement":
      case "disagreement":
      case "emotional_expression":
      case "celebration":
      case "social_talk":
      case "time_query":
      case "availability_check":
      case "activity_query":
      case "clarification_request": {
        const summary = manifestSummary(nativeEngineCapabilityManifest());
        const text = composeConversational({
          input,
          intent: nlu.intent,
          now: new Date(),
          emojiTone: nlu.emojiTone,
          recentTurns: session ? session.memory.recentTurns(6) : [],
          factsCount: this.facts.count(),
          inferences: this.inferences,
          capabilitiesSummary:
            `${summary.operational} capabilities operational, ${summary.developing} developing, ` +
            `${summary.notImplemented} not implemented (reported honestly, never faked)`,
        });
        return this.compose(text, nlu.confidence, []);
      }

      case "identity_query": {
        // Forensic fix 2026-09-11 (batch 3): a poisoned/parked
        // identity fact (status uncertain) hydrated before the
        // seed corpus used to be identity[0] and answered "who
        // are you" as the rogue identity. Uncertain facts never
        // stand as the self-model — same filter as the
        // knowledge_query path.
        const identity = this.facts
          .about("archie")
          .filter((f) => f.predicate === "identity")
          .filter((f) => f.status !== "uncertain");
        return this.compose(
          identity.length > 0
            ? `${String(identity[0].object)}. I run on my own native inference engine — NLU, knowledge, reasoning, planning and learning all execute in-engine, with no Gemini, OpenAI or Claude anywhere in my core.`
            : "ARCHIE native engine. I run my own inference — no external AI provider is part of my core.",
          nlu.confidence,
          cite(identity),
        );
      }

      case "capability_query": {
        const manifest = nativeEngineCapabilityManifest();
        const summary = manifestSummary(manifest);
        const lines = manifest.map(
          (c) => `- ${c.id}: ${c.maturity} — ${c.description.split(":")[0]}`,
        );
        const text =
          `Capability manifest (honest, measured): ${summary.operational} operational, ${summary.developing} developing, ${summary.notImplemented} not implemented.\n` +
          lines.join("\n") +
          `\nAnything not implemented is reported, never faked.`;
        return this.compose(text, nlu.confidence, []);
      }

      case "system_status": {
        // Plan P1 (audit C1): the caller's frelux_status tool
        // reports REAL deployment state (database, orders,
        // ingestion) — strictly more than the engine's local
        // counters. Prefer the tool when the caller declared
        // it; the native diagnostics remain the honest
        // fallback.
        if (requestToolNames.includes("frelux_status")) {
          const pending = this.compose(
            "Checking the live deployment status — one moment.",
            nlu.confidence,
            [],
          );
          pending.toolCall = { name: "frelux_status", args: {} };
          return pending;
        }
        const d = this.diagnostics();
        const text =
          `Engine: ${d.engineId}. Knowledge: ${d.counts.facts} facts (${d.counts.validatedFacts} validated). ` +
          `Reasoning rules: ${d.counts.rules}. Operators: ${d.counts.operators}. Tools: ${d.counts.tools}. ` +
          `Memory turns: ${d.counts.memoryTurns}. Outcomes learned: ${d.counts.outcomes}. Inferences: ${d.counts.inferences}. ` +
          `Self-checks run: ${d.calibration.selfChecksRun}, contradictions caught: ${d.calibration.contradictionsCaught}. ` +
          `Persistence: ${d.persistence.note}. Uptime: ${d.uptimeMs} ms.`;
        return this.compose(text, nlu.confidence, []);
      }

      case "math_question": {
        // Unit conversion ("convert 5 meters to centimeters") —
        // deterministic factors, same dimension only (P2 ma-3).
        const conv = input.match(
          /convert\s+(-?\d+(?:\.\d+)?)\s*([a-z°]+)\s+(?:to|into|in)\s+([a-z°]+)/i,
        );
        if (conv) {
          const invocation = await this.tools.invoke("convert_units", {
            value: Number(conv[1]),
            from: conv[2],
            to: conv[3],
          });
          const text = invocation.ok
            ? `${conv[1]} ${conv[2]} = ${String(invocation.output)} ${conv[3]} (converted deterministically in-engine)`
            : `I could not convert that: ${invocation.error}. My unit conversion is honest — it reports errors rather than guessing.`;
          return this.compose(text, nlu.confidence, [], undefined, [
            invocation,
          ]);
        }
        const expression = extractExpression(input);
        if (!expression) {
          return this.compose(
            "I did not find an arithmetic expression in that. My math capability is deterministic — give me the numbers and operators (e.g. 25 * 48) and I will compute exactly.",
            nlu.confidence,
            [],
          );
        }
        const invocation = await this.tools.invoke("arithmetic", {
          expression,
        });
        let text = invocation.ok
          ? `${expression} = ${String(invocation.output)} (computed deterministically in-engine)`
          : `I could not compute that: ${invocation.error}. My arithmetic is honest — it reports errors rather than guessing.`;
        // P2/ts-3 — cross-tool verification: when the owner
        // asks to verify, re-derive the result by an INVERSE
        // computation (percent-of) or a second deterministic
        // evaluation, and report the check honestly.
        if (invocation.ok && /verif|cross-check|confirm/i.test(input)) {
          const pct = expression.match(
            /^\(\((\d+(?:\.\d+)?)\/100\)\*\((\d+(?:\.\d+)?)\)\)$/,
          );
          if (pct) {
            const inverse = (Number(invocation.output) / Number(pct[2])) * 100;
            const passed = Math.abs(inverse - Number(pct[1])) < 1e-6;
            text += ` Cross-check ${passed ? "passed" : "FAILED"}: ${String(invocation.output)} ÷ ${pct[2]} × 100 = ${Number(inverse.toFixed(4))}% — inverse verification of the ${pct[1]}% claim.`;
          } else {
            const recompute = await this.tools.invoke("arithmetic", {
              expression,
            });
            const passed =
              recompute.ok && recompute.output === invocation.output;
            text += ` Cross-check ${passed ? "passed" : "FAILED"}: independent recomputation returned ${recompute.ok ? String(recompute.output) : `an error (${recompute.error})`} — verified by double-computation.`;
          }
        }
        return this.compose(text, nlu.confidence, [], undefined, [invocation]);
      }

      case "knowledge_query":
      case "howto_guidance": {
        // P1b — counterfactual questions ("if it had not
        // rained, would the ground be dry?") need a causal
        // model, regardless of what generic facts rank. Ask
        // before the validated-knowledge branch can swallow
        // the question.
        const cfTask = {
          text: input,
          subject: ranked[0]?.subject,
          facts: this.facts,
          reasoning: this.reasoning,
          rules: this.reasoning.getRules(),
        };
        if (selectStrategies(cfTask).chosen.includes("counterfactual")) {
          const cf = await executeStrategy("counterfactual", cfTask);
          const text =
            cf.conclusions.length > 0
              ? `Counterfactual analysis: ${cf.explanation} Conclusions are candidate effects, not certainties — ${cf.conclusions.map((c) => c.statement).join("; ")}.`
              : `Counterfactual reasoning needs a causal model of the situation, and I hold none for this — I cannot say what would have happened. Teach me the causes involved (e.g. "remember that rain causes wet ground") and I will reason the counterfactual properly from the real causal graph.`;
          return this.compose(
            text,
            nlu.confidence * 0.4,
            cf.evidence.slice(0, 5),
          );
        }
        // Caller-provided knowledge base (livechat path):
        // consult the injected systemInstruction as a retrieval
        // source BEFORE the validated-fact path — a matching
        // section answers from the site's own curated content.
        // Filler words never win a match (informative-token
        // scoring, body overlap as tiebreak).
        const kbSection = retrieveFromSystemInstruction(
          input,
          systemInstruction,
        );
        if (kbSection) {
          return this.compose(
            `From the knowledge base: ${kbSection}`,
            Math.max(nlu.confidence, 0.75),
            [],
          );
        }

        // tr-3 — historical price/state questions that route
        // here ("what was the cement price last month?"): no
        // price time series exists. Honest refusal, never a
        // fabricated historical value.
        const histPhrase =
          /\b(last (?:month|week|year|quarter)|previous|history|historical|ago)\b/i.exec(
            input,
          );
        if (histPhrase && /\b(?:price|cost|rate)\b/i.test(input)) {
          return this.compose(
            `I have no historical record for that — my market intelligence keeps the current observed snapshot, not a price time series, so I honestly cannot reconstruct values for ${histPhrase[1]}. I do not guess prices. Ask me to research the history and I will fetch dated sources, or teach me dated facts ("the price was X on <date>") and I will retain them with valid-from/valid-until timestamps.`,
            nlu.confidence * 0.5,
            [],
          );
        }
        // cx-2 — pronoun reference resolution: "what is his
        // role?" — resolve the pronoun to the most recent
        // proper noun from salient owner turns, then answer
        // from that subject's facts. Real antecedent lookup,
        // not a guess.
        if (/\b(?:his|her|their|its)\b/i.test(input)) {
          const PROPER_NOUN =
            /\b(?!Remember\b|Please\b|What\b|Note\b|Learn\b|Teach\b|The\b|Monday\b|Tuesday\b|Wednesday\b|Thursday\b|Friday\b|Saturday\b|Sunday\b)([A-Z][a-z]{2,})\b/g;
          let name: string | undefined;
          for (const t of context.salientTurns) {
            if (t.role !== "owner") continue;
            const matches = [...t.text.matchAll(PROPER_NOUN)];
            if (matches.length > 0) {
              name = matches[matches.length - 1][1];
            }
          }
          if (name) {
            const personFacts = this.facts
              .query({ subject: name.toLowerCase() })
              .filter((f) => f.status !== "uncertain");
            if (personFacts.length > 0) {
              const top = personFacts.slice(0, 3);
              const parts = top.map(
                (f) =>
                  `${f.subject} ${f.predicate.replace(/-/g, " ")}: ${String(f.object)} [confidence ${(f.confidence * 100) | 0}%, ${f.provenance.source}]`,
              );
              const pronoun = /\bhis\b/i.test(input)
                ? "his"
                : /\bher\b/i.test(input)
                  ? "her"
                  : /\btheir\b/i.test(input)
                    ? "their"
                    : "its";
              return this.compose(
                `Resolving "${pronoun}" to ${name} from our conversation. From my validated knowledge:\n${parts.join("\n")}`,
                nlu.confidence * 0.8,
                cite(top),
              );
            }
          }
        }
        let validated = ranked
          .filter((f) => f.status !== "uncertain")
          .slice(0, 3);
        // Phase 2.4 SPO probe: a question naming a specific
        // attribute ("what is the screed volume?") is only
        // ANSWERED by a fact with that exact subject+predicate
        // — a topic-word match (the taught thickness ranking
        // high because it shares the word "screed") is NOT an
        // answer. When the exact SPO is absent from retrieval,
        // give the rule engine one bounded derivation pass and
        // re-probe; a computed conclusion answers, honestly
        // labeled as derived.
        const qSPO = questionSPO(input);
        if (qSPO) {
          const directlyAnswered = ranked.some(
            (f) => f.subject === qSPO.subject && f.predicate === qSPO.predicate,
          );
          if (!directlyAnswered) {
            const promoted = await this.deriveForQuestion(qSPO);
            if (promoted.length > 0) validated = promoted;
          }
        }
        if (validated.length === 0) {
          // P7 — a knowledge question with zero matched
          // facts is a countable unknown-topic hit.
          this.unknownTopicHits += 1;
          // Episodic memory: recall what the owner said earlier
          // in this conversation. REAL retrieval — the recalled
          // turns actually change the answer instead of a bare
          // "I do not know". The current input is excluded so
          // ARCHIE never "recalls" the question itself.
          const recalled = context.salientTurns.filter(
            (t) =>
              t.role === "owner" &&
              t.text.trim() !== input.trim() &&
              t.text.length > 12 &&
              // Relevance floor: recency alone is not recall.
              (t.relevance ?? 0) >= 0.3,
          );
          if (recalled.length > 0) {
            const recent = recalled
              .slice(0, 2)
              .map((t) => `“${t.text.slice(0, 160)}”`)
              .join(" | ");
            return this.compose(
              `I do not have that in my validated long-term knowledge, but earlier in this conversation you said: ${recent}. ` +
                `That is episodic context from our chat — not validated knowledge. If it should be permanent, teach it explicitly (“remember that …”) and I will retain it with provenance.`,
              nlu.confidence * 0.6,
              [],
            );
          }
          // P1b — strategy-driven honest speculation: "why"
          // questions get hypothesis framing (never as fact);
          // conflicting-evidence questions get a conflict band.
          const strategic = await this.speculativeAnswer(
            input,
            ranked,
            nlu.confidence,
          );
          if (strategic) return strategic;
          // REMEDIATION batch 2 (2026-09-12): a message with
          // ZERO known vocabulary (no corpus word matched at
          // all) and zero fact matches gets an honest rephrase
          // request — the research/teach options are useless
          // for a term ARCHIE cannot even tokenize into
          // meaning, and offering them would be theater.
          if (probeVocabulary(input) === 0) {
            return this.compose(
              `I didn't recognize any of the words in that message, so I won't guess at a meaning. Could you rephrase it? If it is a term you want me to know, teach it to me directly and I will retain it with owner provenance.`,
              nlu.confidence * 0.5,
              [],
            );
          }
          const plan = await this.planFor("researched");
          // P6 — variance on the honest unknown line; the
          // "validated knowledge" marker survives in every
          // variant (composer self-check enforces it).
          return this.compose(
            `${unknownOpening(input)} My knowledge store holds ${this.facts.count()} facts — none matched. ` +
              `I can research it on the open web (cross-checked, stored as candidate knowledge for validation) or you can teach me directly; both are real options. ${plan.executable ? `Research plan is ready (${plan.steps.length} steps).` : ""}`,
            nlu.confidence * 0.5,
            [],
            plan,
          );
        }
        // P8: derived facts carry an explicit epistemic label
        // — a rule-chain conclusion is never presented as
        // owner-validated knowledge.
        const parts = validated.map((f) => {
          const base = `${f.subject} ${f.predicate.replace(/-/g, " ")}: ${String(f.object)} `;
          if (f.status === "derived" || f.provenance.source === "inferred") {
            return (
              base +
              `[confidence ${(f.confidence * 100).toFixed(0)}%, DERIVED — inferred by rule chain, not owner-validated]`
            );
          }
          // H-1: owner-asserted facts are labeled as the
          // owner's assertion — citable, but never dressed as
          // independently-validated knowledge.
          if (f.status === "owner-asserted") {
            return (
              base +
              `[confidence ${(f.confidence * 100).toFixed(0)}%, OWNER-ASSERTED (${f.provenance.source}) — taught by you, not independently verified]`
            );
          }
          return (
            base +
            `[confidence ${(f.confidence * 100).toFixed(0)}%, ${f.provenance.source}]`
          );
        });
        // P1b: if the question is a "why did this go wrong"
        // problem with numbers that fall short of a recorded
        // requirement, connect them as a working hypothesis.
        const followUp = this.speculativeFollowUp(input, validated);
        // P6 — deterministic phrasing variance: the opening
        // and footer are picked by a stable hash of the CITED
        // FACT IDS. Same evidence always reads the same;
        // different questions read differently. Content and
        // epistemic labels never change.
        const kbSeed = validated.map((f) => f.id).join("|");
        const footer =
          nlu.intent === "howto_guidance"
            ? howtoFooter(kbSeed, this.verbosity)
            : "";
        // P8: an answer citing derived knowledge opens with the
        // derived marker, never "validated knowledge".
        const opening = includesDerived(validated)
          ? derivedOpening(kbSeed)
          : // H-1: an answer citing ONLY owner-asserted facts
            // opens with the owner-asserted frame — the owner's
            // assertion is never presented under the
            // independently-validated banner.
            validated.every((f) => f.status === "owner-asserted")
            ? ownerAssertedOpening(kbSeed)
            : knowledgeOpening(kbSeed);
        return this.compose(
          `${opening}\n${parts.join("\n")}` +
            (followUp ? `\n\n${followUp}` : "") +
            (footer ? `\n${footer}` : ""),
          nlu.confidence * Math.min(1, validated[0].confidence + 0.3),
          cite(validated),
        );
      }

      case "teaching": {
        // Secrets are never memorized — the immune system's
        // redaction gate applies to memory writes too.
        const secretScan = redactSecrets(input);
        if (secretScan.foundCount > 0) {
          return this.compose(
            "I will not store that — it contains a credential/secret. ARCHIE memory never retains secrets (they are redacted at ingest and refused at store). Teach me the non-secret part and I will keep that.",
            nlu.confidence,
            [],
          );
        }
        const triple = extractTriple(input);
        if (!triple) {
          return this.compose(
            "I want to learn that, but I could not extract a clean fact from it. State it as a simple subject-verb-object line (e.g. 'screeding ratio is 1:4 cement to sand') and I will retain it with provenance.",
            nlu.confidence,
            [],
          );
        }
        const { fact, conflict } = await this.facts.assert({
          ...triple,
          confidence: 0.8,
          provenance: {
            source: "owner-taught",
            note: `taught in conversation: ${input.slice(0, 120)}`,
          },
          // H-1 (audit fix 2026-09-11): a taught fact is held on
          // the owner's AUTHORITY — it is citable with an honest
          // label, but "validated" is earned through real
          // verification events (explicit owner confirmation
          // in use), never minted on arrival.
          status: "owner-asserted",
        });
        const text = conflict
          ? `Retained — but flagged: this contradicts ${conflict.conflictingFactIds.length} existing fact(s) on the same point. Both are held as uncertain until you confirm which is correct.`
          : `Retained as your assertion (owner-asserted — held on your authority, not independently verified): ${fact.subject} ${fact.predicate.replace(/-/g, " ")} → ${String(fact.object)}. When I use it and you confirm I was right, it earns validated status.`;
        return this.compose(text, nlu.confidence, [fact.id]);
      }

      case "memory_exclusion": {
        // Defense in depth for negated memory directives
        // ("do not remember the gate code"). The NLU rule
        // routes these here deterministically; even if a
        // caller bypasses the negated-clause exclusion path,
        // this handler NEVER writes to the fact store, and
        // no conversation memory is retained from it. Honest
        // acknowledgment only.
        return this.compose(
          "Understood — I will not store that, and nothing from it has been kept.",
          nlu.confidence,
          [],
        );
      }

      case "correction": {
        // Explicit owner confirmation is VERIFICATION, not
        // correction (audit H1): "confirm that X is correct"
        // must strengthen the verified knowledge — the old
        // path weakened it, which punished owners for
        // confirming ARCHIE.
        if (EXPLICIT_CONFIRM.test(input)) {
          // Audit fix 2026-09-11 (confirmation targeting): the
          // old path stamped owner-confirm on the top-3
          // TF-IDF matches REGARDLESS of fit — a confirmation
          // that merely mentioned a neighbouring topic could
          // silently validate unrelated facts. A fact is only
          // strengthened when it clearly matches what the
          // owner confirmed: at least 2 shared salient tokens
          // with the confirmation text. Below the floor the
          // outcome is recorded as acknowledged — engagement,
          // NOT verification evidence — and nothing is
          // reinforced (audit C3/H1 gates).
          const queryTokens = salientTokens(input);
          // Hyphenated subject/object ("market-sand") must
          // tokenize the same way as the owner's phrasing
          // ("market sand") — normalize every component.
          const factTokens = (f: Fact) =>
            salientTokens(
              `${f.subject.replace(/-/g, " ")} ${f.predicate.replace(/-/g, " ")} ${String(f.object).replace(/-/g, " ")}`,
            );
          const confirmed = this.facts.rank(input, 3).filter((f) => {
            const ft = factTokens(f);
            if (ft.size === 0) return false;
            let shared = 0;
            for (const t of queryTokens) if (ft.has(t)) shared += 1;
            return shared >= 2;
          });
          if (confirmed.length > 0) {
            await this.learner.record({
              kind: "success",
              task: `owner confirmation: ${input.slice(0, 80)}`,
              contributing: confirmed.map((f) => f.id),
            });
            return this.compose(
              `Confirmed — thank you. ${confirmed.length} related fact(s) strengthened and stamped as owner-confirmed evidence. ${this.statusLine()}`,
              nlu.confidence,
              confirmed.map((f) => f.id),
            );
          }
          // No fact matched the confirmation closely enough —
          // record it as acknowledged (audit trail, zero
          // reinforcement) and say so honestly.
          await this.learner.record({
            kind: "acknowledged",
            task: `owner confirmation below similarity floor: ${input.slice(0, 80)}`,
            contributing: [],
          });
          return this.compose(
            "Noted as a confirmation — but nothing in my stored knowledge matches it closely enough for me to strengthen honestly. I only reinforce facts that clearly match what you confirmed. Teach me the fact first, then confirm it after I answer.",
            nlu.confidence,
            [],
          );
        }
        const triple = extractTriple(input);
        // Targeted demotion: facts directly on the corrected
        // SPO, plus TF-IDF related facts. The contradicted fact
        // itself must never survive on a ranking technicality.
        const targeted = new Map<string, Fact>();
        if (triple) {
          for (const f of this.facts.query({
            subject: triple.subject,
            predicate: triple.predicate,
          })) {
            targeted.set(f.id, f);
          }
        }
        for (const f of this.facts.rank(input, 3)) {
          targeted.set(f.id, f);
        }
        for (const fact of targeted.values()) {
          fact.status = "uncertain";
        }
        await this.learner.record({
          kind: "correction",
          task: `correction on: ${input.slice(0, 80)}`,
          contributing: [...targeted.keys()],
        });
        if (triple) {
          const correctionStamp = `owner-correction:${Date.now()}`;
          const { fact } = await this.facts.assert({
            ...triple,
            confidence: 0.8,
            provenance: {
              source: "owner-taught",
              note: `owner correction: ${input.slice(0, 120)}`,
            },
            // H-1: a corrected value is the owner's assertion —
            // stronger than a plain teaching (the owner reviewed
            // a live contradiction) and stamped with that real
            // verification event, but it still earns "validated"
            // through confirmation, not on arrival.
            status: "owner-asserted",
          });
          if (!(fact.verifiedBy ?? []).includes(correctionStamp)) {
            fact.verifiedBy = [...(fact.verifiedBy ?? []), correctionStamp];
          }
          // The conflict detector parks a contradicting
          // newcomer — but HERE the owner has explicitly
          // resolved the contradiction (the wrong facts were
          // already moved to uncertain above), so the
          // corrected assertion must stand as owner-asserted,
          // not be parked alongside the facts it replaces.
          if (fact.status === "uncertain" || fact.status === "validated") {
            fact.status = "owner-asserted";
          }
          return this.compose(
            `Correction processed. ${targeted.size} related fact(s) moved to uncertain, and the corrected knowledge is retained as the owner-corrected assertion (owner-asserted — you resolved the contradiction, and the correction is stamped as a verification event). I do not silently keep wrong facts.`,
            nlu.confidence,
            [fact.id],
          );
        }
        return this.compose(
          `Correction processed. ${targeted.size} related fact(s) moved to uncertain pending re-teaching. Tell me the correct fact and I will retain it.`,
          nlu.confidence,
          [...targeted.keys()].slice(0, 3),
        );
      }

      case "research_request": {
        const query = extractResearchQuery(input);
        if (!query) {
          return this.compose(
            "Ready to research — give me the topic or question and I will search, cross-check and store findings as candidate knowledge.",
            nlu.confidence,
            [],
          );
        }
        // Explicit owner research request = network authorization for this query.
        await this.facts.assert({
          subject: "network",
          predicate: "authorized",
          object: `owner requested research: ${query.slice(0, 80)}`,
          confidence: 0.9,
          provenance: {
            source: "seed",
            note: "owner-authorized research request",
          },
          status: "validated",
        });
        const report = await this.research.research(query);
        // HONEST SOURCE-AWARE REPORTING — only sources actually
        // searched are named; failures, disagreements and
        // discovered sources are reported, never smoothed over.
        if (report.reusedCache) {
          return this.compose(
            `Recent findings for "${query}" are still current — reusing ${report.hits.length} cached finding(s) instead of searching again. Ask me to validate them if you want them promoted to knowledge.`,
            nlu.confidence,
            [],
          );
        }
        if (report.hits.length > 0) {
          const lines: string[] = [];
          lines.push(
            `Research completed for "${query}" — classified as ${report.category ?? "unclassified"} domain.`,
          );
          lines.push(
            `Sources searched (priority first): ${report.sourcesSearched.join(", ") || "none"}.`,
          );
          if (report.sourceFailures.length > 0) {
            lines.push(
              `Failed/declined: ${report.sourceFailures.map((f) => `${f.domain} (${f.note})`).join("; ")}.`,
            );
          }
          lines.push(
            `${report.hits.length} result(s) found across ${new Set(report.hits.map((h) => h.domain)).size} domain(s)` +
              (report.crossChecked
                ? "; independent sources agree (cross-checked)."
                : "; cross-source agreement NOT yet established — treat with caution."),
          );
          if (report.contentCrossChecked) {
            lines.push(
              "Deep verification: source PAGE CONTENTS from ≥2 independent domains were fetched, extracted and agree — the strongest candidate confidence applies (still pending owner validation).",
            );
          }
          const failedFetches = report.pageFetches.filter((f) => !f.ok);
          if (failedFetches.length > 0) {
            lines.push(
              `Pages I could not read (honest, not hidden): ${failedFetches.map((f) => `${new URL(f.url).hostname} (${f.note})`).join("; ")}.`,
            );
          }
          for (const c of report.conflicts) {
            lines.push(`Caution: ${c}`);
          }
          if (report.discoveredSources.length > 0) {
            lines.push(
              `Newly discovered sources classified (evaluating, not trusted yet): ${report.discoveredSources.join(", ")}.`,
            );
          }
          lines.push(
            `${report.storedKnowledge} finding(s) stored as low-confidence candidate knowledge pending validation.`,
          );
          lines.push("Top results:");
          for (const h of report.hits.slice(0, 3)) {
            lines.push(`- ${h.title} (${h.url})`);
          }
          lines.push(
            "Nothing here is accepted as fact yet — validate findings before I treat them as knowledge.",
          );
          return this.compose(lines.join("\n"), nlu.confidence, []);
        }
        return this.compose(
          `Research ran but returned no results: ${report.note}. I report that honestly rather than inventing sources.`,
          nlu.confidence,
          [],
        );
      }

      case "task_planning": {
        // Phase 3.2 (audit): the goal is DERIVED FROM THE REQUEST,
        // and the plan is a real, goal-scoped step chain — never a
        // canned template. Session-true facts are asserted first
        // (the owner IS present and web research IS authorized by
        // permanent directive), then means-ends runs over the
        // $goal-scoped operator library, then the engine EXECUTES
        // the steps bound to real subsystems and reports honest
        // per-step results. Consequential steps stop at PROPOSE.
        const goalSubject = deriveGoalSubject(input);
        // The digit check is domain-general; WHICH words count as
        // quantities is domain knowledge — the registry asks the
        // registered skills (construction knows its materials).
        const quantities = /\d/.test(input) && this.domains.quantifies(input);
        await this.assertPlanningFacts(goalSubject, input, quantities);
        const plan = await this.planFor({
          subject: goalSubject,
          predicate: "planned",
        });
        await this.executePlanSteps(plan, goalSubject, input);
        // Phase 4.4 (lessons → behavior): owner-recorded
        // evolution-memory lessons relevant to THIS goal are
        // retrieved and attached to the plan — context with
        // dated provenance, never facts, never auto-blocks.
        // A failed/rolled-back past attempt raises the risk
        // level honestly.
        plan.relevantLessons = await this.fetchPlanLessons(
          `${goalSubject} ${input}`,
        );
        if (plan.relevantLessons.length > 0) {
          plan.risk = mergeLessonRisk(plan.relevantLessons, plan.risk);
        }
        const lessonsNote =
          plan.relevantLessons.length > 0
            ? `\nPast lessons from your evolution memory apply here (owner-recorded, dated — context, not validated rules): ` +
              plan.relevantLessons
                .map(
                  (l, i) =>
                    `${i + 1}. [${l.recordedAt.slice(0, 10)}] ${l.lesson}` +
                    (l.failedBefore
                      ? " (a past attempt on this problem failed or was rolled back — risk noted)"
                      : ""),
                )
                .join(" ") +
              (plan.relevantLessons.some((l) => l.failedBefore)
                ? `\nRisk level raised accordingly: ${plan.risk.level}.`
                : "")
            : "";
        const text = plan.executable
          ? `Plan for your request (${plan.steps.length} steps, cost ${plan.totalCost}) — goal: ${goalSubject}\n` +
            plan.steps
              .map((s, i) => {
                const outcome = s.result
                  ? ` — ${statusLabel(s.status)}: ${s.result}`
                  : "";
                return `${i + 1}. ${s.achieves} → ${s.satisfies}${outcome}`;
              })
              .join("\n") +
            (plan.alternatives.length > 0
              ? `\nReal alternative chains: ${plan.alternatives
                  .map((a) => `${a.description} (${a.tradeoff})`)
                  .join("; ")}.`
              : "") +
            lessonsNote +
            `\nConsequential actions in this plan end at PROPOSE — execution stays yours to authorize.`
          : `I cannot honestly plan that yet. Gaps: ${plan.gapReport.join("; ")}. I report gaps rather than inventing steps.` +
            lessonsNote;
        return this.compose(text, nlu.confidence, [], plan);
      }

      case "code_analysis_request": {
        const codeBlock = input.match(/```[\w]*\n([\s\S]*?)```/);
        if (codeBlock) {
          const analysis = analyzeSource("inline-snippet.ts", codeBlock[1]);
          return this.compose(
            `Static analysis complete (deterministic):\n` +
              `- ${analysis.lines} lines, ${analysis.functions.length} function(s), ${analysis.classes.length} class(es)\n` +
              `- imports: ${analysis.imports.join(", ") || "none"}\n` +
              `- exports: ${analysis.exports.join(", ") || "none"}\n` +
              `- cyclomatic complexity estimate: ${analysis.complexity.cyclomatic}\n` +
              (analysis.risks.length > 0
                ? `- risks: ${analysis.risks.join("; ")}\n`
                : "- no risk flags\n") +
              `Open-ended code generation is not implemented — analysis and unit-test scaffolds are.`,
            nlu.confidence,
            [],
          );
        }
        const hasFileRef = nlu.entities.filePaths.length > 0;
        return this.compose(
          hasFileRef
            ? `I see the reference ${nlu.entities.filePaths.join(", ")}, but I need the actual source text to analyze — paste it in a code block. Deterministic static analysis runs on real source, never on a filename alone.`
            : `Paste the source in a code block and I will run deterministic static analysis (structure, complexity, risk flags). Analysis and unit-test scaffolds are implemented; open-ended generation is not.`,
          nlu.confidence,
          [],
        );
      }

      case "price_query": {
        // tr-3 — historical price questions ("what was the
        // cement price last month?"): market intelligence
        // holds the CURRENT observed snapshot, not a time
        // series. Honest refusal, never a fabricated
        // historical price.
        const temporalPhrase =
          /\b(last (?:month|week|year|quarter)|previous|history|historical|recent|ago)\b/i.exec(
            input,
          );
        if (temporalPhrase) {
          return this.compose(
            `I have no historical record for that — my market intelligence keeps the current observed snapshot, not a price time series, so I honestly cannot reconstruct prices for ${temporalPhrase[1]}. I do not guess prices. Ask me to research the history and I will fetch dated sources, or teach me dated facts ("the cement price was X on <date>") and I will retain them with valid-from/valid-until timestamps.`,
            nlu.confidence * 0.5,
            [],
          );
        }
        const product = extractPriceProduct(input);
        if (!product) {
          return this.compose(
            "Ask me about a specific material — for example 'what is the price of cement' — and I will answer from real observed market data, never from a guess.",
            nlu.confidence,
            [],
          );
        }
        if (!this.marketPriceLookup) {
          // Plan P1 (audit C1): if the caller declared the
          // market_intelligence tool, ASK the caller to execute
          // it instead of refusing — the dead-tool seam is now
          // a live bridge.
          if (requestToolNames.includes("market_intelligence")) {
            const pending = this.compose(
              `Consulting market intelligence for the observed price of "${product}" — one moment.`,
              nlu.confidence,
              [],
            );
            pending.toolCall = {
              name: "market_intelligence",
              args: { region: extractRegionHint(input), item: product },
            };
            return pending;
          }
          return this.compose(
            `My market intelligence adapter is not wired in this deployment, so I cannot look up observed prices for "${product}" here. I do not guess prices.`,
            nlu.confidence,
            [],
          );
        }
        const result = await this.marketPriceLookup(product);
        if (!result) {
          return this.compose(
            `I have no observed price data for "${product}" yet — the market intelligence crawler has not recorded it, and I do not guess prices. You can teach me a price directly and I will retain it as owner-provided knowledge.`,
            nlu.confidence,
            [],
          );
        }
        const pkg =
          result.packageSize && result.packageUnit
            ? ` for ${result.packageSize} ${result.packageUnit}`
            : "";
        const stale =
          result.freshness === "stale" || result.freshness === "expired";
        const sourceNote =
          result.source === "approved"
            ? "approved price list"
            : "raw market observation (not yet approved)";
        const date = String(result.recordedAt).slice(0, 10);
        return this.compose(
          `${result.currency} ${result.price} for ${result.product}${pkg} — market ${result.marketCode}, recorded ${date} (${sourceNote}).` +
            (stale
              ? ` This price is ${result.freshness} — treat it as indicative only.`
              : ""),
          nlu.confidence,
          [],
        );
      }

      case "documents_query":
      case "images_query":
      case "voice_query":
      case "social_query":
      case "family_query": {
        const key: SystemAdapterKey =
          nlu.intent === "documents_query"
            ? "documents"
            : nlu.intent === "images_query"
              ? "images"
              : nlu.intent === "voice_query"
                ? "voice"
                : nlu.intent === "social_query"
                  ? "social"
                  : "family";
        const label = SYSTEM_ADAPTER_LABELS[key];
        const adapter = this.systemAdapters[key];
        if (!adapter) {
          return this.compose(
            `My ${label} adapter is not wired in this deployment, so I cannot read that system's real state here. I never invent system status.`,
            nlu.confidence,
            [],
          );
        }
        const result = await adapter();
        if (!result) {
          return this.compose(
            `I have no ${label} data recorded yet — there is nothing to report from that system, and I do not invent state.`,
            nlu.confidence,
            [],
          );
        }
        return this.compose(
          `${result.headline} (Source: ${result.source})`,
          nlu.confidence,
          [],
        );
      }

      case "crypto_market_query": {
        // Audit fix H-2 (2026-09-11): the crypto intelligence
        // libraries (multi-venue market data, probability
        // evidence, trade gate) existed and were tested but
        // were UNREACHABLE from conversation. They are now
        // wired: live multi-venue price cross-checks and
        // evidence-gated trade evaluations — every number is
        // observed from a real venue or the failure is
        // reported honestly. No simulated prices, ever.
        return this.handleCryptoMarketQuery(input, nlu);
      }

      case "construction_calc": {
        // Domain skills are pluggable (audit fix 2026-09-11):
        // an unregistered skill is answered honestly, never
        // fabricated.
        const domainHandler = this.domains.handlerFor("construction_calc");
        if (!domainHandler) {
          return this.compose(
            "That capability is not installed on this engine — I will not fabricate a construction estimate. " +
              this.statusLine(),
            nlu.confidence,
            [],
          );
        }
        return this.compose(domainHandler(input), nlu.confidence, []);
      }

      default: {
        return this.compose(
          `I parsed that as general reasoning input (intent ${nlu.intent}, confidence ${(nlu.confidence * 100).toFixed(0)}%). ` +
            `My reasoning engine works over stored knowledge — ask a question, teach me a fact, request research, or give me a task to plan.`,
          nlu.confidence,
          [],
        );
      }
    }
  }

  // ---------------------------------------------------------
  // Crypto market intelligence (audit fix H-2)
  // ---------------------------------------------------------

  /** Longest-alias-first registry — multi-word aliases must
   *  win over their substrings ("binance coin" over "bnb" is
   *  fine by order below; both map to BNB-USD anyway). */
  private static CRYPTO_ALIASES: Array<[string, string]> = [
    ["binance coin", "BNB-USD"],
    ["bitcoin", "BTC-USD"],
    ["btc", "BTC-USD"],
    ["ethereum", "ETH-USD"],
    ["eth", "ETH-USD"],
    ["solana", "SOL-USD"],
    ["sol", "SOL-USD"],
    ["ripple", "XRP-USD"],
    ["xrp", "XRP-USD"],
    ["dogecoin", "DOGE-USD"],
    ["doge", "DOGE-USD"],
    ["bnb", "BNB-USD"],
    ["cardano", "ADA-USD"],
    ["ada", "ADA-USD"],
    ["chainlink", "LINK-USD"],
    ["link", "LINK-USD"],
    ["litecoin", "LTC-USD"],
    ["ltc", "LTC-USD"],
  ];

  private cryptoSymbolOf(lower: string): string | null {
    for (const [alias, sym] of ArchieNativeEngine.CRYPTO_ALIASES) {
      if (new RegExp(`\\b${alias}\\b`).test(lower)) return sym;
    }
    return null;
  }

  private async handleCryptoMarketQuery(
    input: string,
    nlu: { confidence: number },
  ): Promise<ConverseResult> {
    const lower = input.toLowerCase();
    const symbol = this.cryptoSymbolOf(lower);

    // Trade evaluation: a direction word AND trade-plan
    // vocabulary. Price snapshots need only the symbol.
    const direction: "long" | "short" | null = /\b(?:buy|long|bullish)\b/.test(
      lower,
    )
      ? "long"
      : /\b(?:sell|short|bearish)\b/.test(lower)
        ? "short"
        : null;
    const wantsTradeEval =
      direction !== null &&
      /\b(?:entry|enter(?:ing)?|stop|target|take[-\s]?profit|position|portfolio|evaluate)\b/i.test(
        input,
      );

    if (!symbol) {
      return this.compose(
        "Ask me for a live crypto price — for example 'what is the price of bitcoin' — or give me a trade to evaluate ('should i buy eth, entry 3000, stop 2800, target 3300, size 500, portfolio 25000'). " +
          "I answer from real multi-venue market data, never from a guess.",
        nlu.confidence,
        [],
      );
    }

    const fetcher = this.cryptoFetcher ?? defaultFetcher;
    const cc = await crossCheckTicker(symbol, fetcher);

    if (cc.venuesReporting.length === 0) {
      const failures = cc.venuesUnavailable
        .map((v) => `${v.venue}: ${v.reason}`)
        .join("; ");
      return this.compose(
        `I could not get a live ${symbol} price — every venue I query reported unavailable or refused (${failures}). I will not fabricate a market price. Try again later.`,
        nlu.confidence,
        [],
      );
    }

    const fmt = (n: number) =>
      n.toLocaleString("en-US", { maximumFractionDigits: 2 });

    if (!wantsTradeEval) {
      // PRICE SNAPSHOT — consensus across the venues that
      // really answered.
      const withChange = cc.snapshots.find((x) => x.changePct24h !== null);
      const parts = [
        `${symbol} consensus $${fmt(cc.consensusPrice ?? 0)} across ${cc.venuesReporting.length} live venues (${cc.venuesReporting.join(", ")})`,
      ];
      if (cc.venuesUnavailable.length > 0) {
        parts.push(
          `${cc.venuesUnavailable.length} venue(s) unavailable, reported honestly (${cc.venuesUnavailable.map((v) => v.venue).join(", ")})`,
        );
      }
      const ch = withChange?.changePct24h ?? null;
      if (ch !== null) {
        parts.push(
          `24h change ${ch >= 0 ? "+" : ""}${ch.toFixed(2)}% (${withChange!.venue})`,
        );
      }
      if (cc.maxDeviationPct !== null) {
        parts.push(
          `max cross-venue deviation ${cc.maxDeviationPct.toFixed(2)}%` +
            (cc.anomaly
              ? " — ANOMALY: venues disagree beyond the 1% threshold, treat this snapshot with suspicion"
              : ""),
        );
      }
      parts.push("observed live market data — not financial advice");
      return this.compose(parts.join(". ") + ".", nlu.confidence, []);
    }

    // TRADE EVALUATION — the full evidence pipeline:
    // cross-check + candle history + walk-forward-validated
    // prediction + the 11-check gate. Missing parameters are
    // asked for, never guessed.
    const num = (re: RegExp): number | null => {
      const m = re.exec(input);
      if (!m) return null;
      const v = parseFloat(m[1].replace(/,/g, ""));
      return Number.isFinite(v) ? v : null;
    };
    const entry =
      num(
        /(?:entry|enter(?:ing)?|buy(?:ing)?|sell(?:ing)?|short(?:ing)?)\s+(?:at\s+)?\$?([\d,.]+)/i,
      ) ?? cc.consensusPrice!; // market order: entry = live consensus (venues reported)
    const stop = num(
      /(?:stop(?:[-\s]?loss)?|invalidation)\s*[:=]?\s*\$?([\d,.]+)/i,
    );
    const target = num(/(?:target|take[-\s]?profit)\s*[:=]?\s*\$?([\d,.]+)/i);
    const size = num(
      /(?:position\s*)?(?:size|amount)\s*[:=]?\s*(?:of\s+)?\$?([\d,.]+)/i,
    );
    const portfolio = num(
      /(?:portfolio|account)\s*(?:value|balance)?\s*[:=]?\s*(?:of\s+)?\$?([\d,.]+)/i,
    );
    if (
      stop === null ||
      target === null ||
      size === null ||
      portfolio === null
    ) {
      const missing = [
        stop === null ? "stop-loss" : null,
        target === null ? "take-profit target" : null,
        size === null ? "position size" : null,
        portfolio === null ? "portfolio value" : null,
      ].filter(Boolean);
      return this.compose(
        `To evaluate a ${symbol} trade honestly I need the full plan — ${missing.join(", ")} — plus your direction. Example: "should i ${direction ?? "buy"} ${symbol.replace("-USD", "").toLowerCase()}, entry 3000, stop 2800, target 3300, size 500, portfolio 25000". I will not evaluate a trade with guessed parameters.`,
        nlu.confidence,
        [],
      );
    }

    const INTERVAL = 60; // 60-minute candles
    const HORIZON = 4; // 4-candle (4h) prediction horizon
    const candlesRes = await fetchCandles(
      "coinbase",
      symbol,
      INTERVAL,
      400,
      fetcher,
    );
    if (candlesRes.kind !== "ok") {
      return this.compose(
        `I have a live ${symbol} price, but the candle history I need for trade evidence is unavailable right now (${candlesRes.reason}) — I will not evaluate a trade without real evidence. Try again later.`,
        nlu.confidence,
        [],
      );
    }
    const candles = candlesRes.data.candles;
    const validation = walkForwardValidate(symbol, candles, INTERVAL, HORIZON);

    // Honest data quality from the live series + cross-check.
    const analysisAnomalies: string[] = [];
    if (candles.length >= 2) {
      const expectedSpan = (candles.length - 1) * INTERVAL * 60;
      const actualSpan = candles[candles.length - 1].ts - candles[0].ts;
      if (actualSpan < expectedSpan * 0.9) {
        analysisAnomalies.push("gapped candle series");
      }
    }
    const dataQuality: DataQuality = {
      crossVenueAnomaly: cc.anomaly,
      venuesReporting: cc.venuesReporting.length,
      analysisAnomalies,
      dataAgeMs:
        candles.length > 0
          ? Date.now() - candles[candles.length - 1].ts * 1000
          : null,
    };

    const prediction = buildPrediction(
      symbol,
      direction,
      candles,
      INTERVAL,
      HORIZON,
      validation,
      dataQuality,
    );
    if (!prediction) {
      return this.compose(
        `I could not build honest prediction evidence for ${symbol} from the live candle history — the series is too thin or too gapped for my feature extraction, and I will not evaluate a trade on insufficient data.`,
        nlu.confidence,
        [],
      );
    }

    const request: TradeRequest = {
      symbol,
      direction,
      entryPrice: entry,
      stopPrice: stop,
      targetPrice: target,
      positionSizeQuote: size,
      portfolioValueQuote: portfolio,
    };
    const decision = evaluateTradeGate(
      request,
      prediction,
      this.tradingLimits,
      Date.now(),
    );
    return this.compose(
      renderGateDecision(decision) +
        ` Calibrated probability for a ${direction} ${symbol.replace("-USD", "")} position: ${(prediction.calibratedProbability * 100).toFixed(1)}% ` +
        `(60m candles, 4h horizon, walk-forward validated on ${validation.samples} samples, Brier ${validation.brier !== null ? validation.brier.toFixed(3) : "n/a"}). ` +
        `This is a mechanical evaluation of YOUR trade parameters against real market evidence — not financial advice.`,
      nlu.confidence,
      [],
    );
  }

  /** Phase 4.4 — fetch owner evolution-memory lessons
   *  relevant to a planning query. Absence is honest ([]):
   *  no provider wired, provider failure, or nothing
   *  clearing the retrieval floor. NEVER throws into the
   *  planning path. */
  private async fetchPlanLessons(query: string): Promise<PlanLesson[]> {
    if (!this.lessonLookup) return [];
    try {
      const rows = await this.lessonLookup();
      if (!rows || rows.length === 0) return [];
      return retrieveRelevantLessons(rows, query);
    } catch {
      return [];
    }
  }

  private async planFor(
    goalPredicate: string | import("./types.ts").FactPattern,
  ): Promise<Plan> {
    return this.planner.plan(goalPredicate);
  }

  /** Session-true facts for planning: the owner IS present in
   *  this conversation; web research IS authorized by permanent
   *  owner directive; the goal scope and quantity status come
   *  from the request itself. All asserted with real provenance —
   *  nothing invented. */
  private async assertPlanningFacts(
    goalSubject: string,
    input: string,
    quantities: boolean,
  ): Promise<void> {
    await this.facts.assert({
      subject: "owner",
      predicate: "available",
      object: "owner is addressing ARCHIE in this conversation",
      confidence: 1,
      provenance: {
        source: "seed",
        note: "session-true: owner is addressing ARCHIE in this conversation",
      },
      status: "validated",
    });
    await this.facts.assert({
      subject: "network",
      predicate: "authorized",
      object: "cross-checked web research",
      confidence: 0.9,
      provenance: {
        source: "seed",
        note: "permanent owner directive authorizes cross-checked open-web research",
      },
      status: "validated",
    });
    await this.facts.assert({
      subject: goalSubject,
      predicate: "scope-defined",
      object: input.slice(0, 120),
      confidence: 0.9,
      provenance: { source: "seed", note: "scope as stated by owner" },
      status: "validated",
    });
    // Quantities: when present, only the REAL estimator (the
    // domain skill's estimate operator, routed via the
    // registry) may produce inputs-quantified;
    // when absent, the trivial truth is asserted directly —
    // there is nothing to estimate, so no estimate step. This
    // makes shadowing impossible: one predicate, one producer
    // per case.
    await this.facts.assert(
      quantities
        ? {
            subject: goalSubject,
            predicate: "quantities-detected",
            object: input.slice(0, 120),
            confidence: 0.9,
            provenance: {
              source: "seed",
              note: "digits + material lexicon in request",
            },
            status: "validated",
          }
        : {
            subject: goalSubject,
            predicate: "inputs-quantified",
            object: input.slice(0, 120),
            confidence: 0.9,
            provenance: {
              source: "seed",
              note: "no quantities in request — nothing to estimate",
            },
            status: "validated",
          },
    );
  }

  /** Phase 3.2: EXECUTE the plan steps bound to real subsystems
   *  and stamp honest per-step results. Only real operations
   *  produce "executed" — composition steps say what they
   *  produced, owner-dependent steps wait for the owner, and
   *  authorization-gated steps stay at PROPOSE. A bound
   *  subsystem that cannot complete is "blocked" with the gap
   *  stated — never papered over. */
  private async executePlanSteps(
    plan: Plan,
    goalSubject: string,
    input: string,
  ): Promise<void> {
    let inventoryCount = 0;
    for (const step of plan.steps) {
      // Domain-capture completion 2026-09-11: operators owned by a
      // registered domain skill execute THROUGH the registry — the
      // engine knows no domain operator ids and executes no domain
      // logic itself. Null (no skill owns it) falls through to the
      // core operator switch below; a skill answer is used verbatim,
      // never fabricated.
      const domainExec = this.domains.executeOperator(step.operatorId, input);
      if (domainExec) {
        step.status = domainExec.status;
        step.result = domainExec.result;
        continue;
      }
      switch (step.operatorId) {
        case "op_inventory_prerequisites": {
          const tokens = goalSubject.split(/\s+/).filter((t) => t.length > 3);
          const relevant = this.facts
            .query({})
            .filter((f) =>
              tokens.some(
                (t) =>
                  (f.subject ?? "").includes(t) ||
                  String(f.object ?? "").includes(t),
              ),
            );
          inventoryCount = relevant.length;
          step.status = "executed";
          step.result =
            relevant.length > 0
              ? `${relevant.length} validated fact(s) already match "${goalSubject}"`
              : `0 validated facts match "${goalSubject}" yet`;
          break;
        }
        case "op_identify_gaps": {
          step.status = "executed";
          step.result =
            inventoryCount === 0
              ? `knowledge gap: nothing validated on "${goalSubject}" — the knowledge step below fills it`
              : `${inventoryCount} known fact(s) — gaps limited to what they do not cover`;
          break;
        }
        case "op_owner_teach_goal_knowledge": {
          step.status = "awaiting-owner";
          step.result =
            'teach me now ("remember that ...") or ask me to research instead — nothing is assumed';
          break;
        }
        case "op_research_goal_knowledge": {
          step.status = "proposed";
          step.result =
            "research alternative — produces candidate knowledge only, never auto-fact";
          break;
        }
        case "op_sequence_tasks": {
          step.status = "executed";
          step.result = `ordered ${plan.steps.length} steps for "${goalSubject}" by dependency`;
          break;
        }
        case "op_draft_plan": {
          step.status = "executed";
          step.result = "plan drafted — the numbered chain in this reply";
          break;
        }
        case "op_propose_execution": {
          step.status = "proposed";
          step.result =
            "owner authorization required — nothing auto-executes, ever";
          break;
        }
        default:
          break;
      }
    }
  }

  private statusLine(): string {
    const summary = manifestSummary(nativeEngineCapabilityManifest());
    return `Knowledge store: ${this.facts.count()} facts, reasoning rules: ${this.reasoning.ruleCount()}, capabilities: ${summary.operational} operational / ${summary.developing} developing / ${summary.notImplemented} not implemented.`;
  }

  private compose(
    responseText: string,
    confidence: number,
    citedFactIds: string[],
    plan?: Plan,
    toolResults?: ConverseResult["toolResults"],
  ): ConverseResult {
    return {
      nlu: understand(""),
      responseText,
      confidence: Math.max(0.01, Math.min(1, confidence)),
      citedFactIds,
      selfCheck: {
        check: "pending",
        passed: true,
        detail: "verified in converse()",
      },
      plan,
      toolResults,
    };
  }

  /** Honest diagnostics — measurable state of the engine. */
  diagnostics() {
    const manifest = nativeEngineCapabilityManifest();
    const summary = manifestSummary(manifest);
    const stats = this.selfEval.stats();
    return {
      engineId: this.id,
      uptimeMs: Date.now() - this.bootedAt,
      capabilities: manifest,
      capabilitySummary: summary,
      counts: {
        facts: this.facts.count(),
        validatedFacts: this.facts.validatedCount(),
        rules: this.reasoning.ruleCount(),
        operators: this.planner.operatorCount(),
        tools: this.tools.count(),
        // C-1: memory is session-scoped — diagnostics report
        // the aggregate across live sessions (plus the shared
        // episodic snapshot), not one shared buffer.
        memoryTurns: [...this.sessions.values()].reduce(
          (sum, sess) => sum + sess.memory.size(),
          0,
        ),
        episodicTurns: this.episodicTurns.length,
        outcomes: this.learner.count(),
        inferences: this.inferences,
        unknownTopicHits: this.unknownTopicHits,
        verificationFails: this.verificationFails,
      },
      calibration: {
        meanConfidence:
          this.sessionInferences > 0
            ? this.confidenceSum / this.sessionInferences
            : 0,
        selfChecksRun: stats.selfChecksRun,
        contradictionsCaught: stats.contradictionsCaught,
      },
      persistence: {
        facts: this.persistence !== null,
        outcomes: this.persistence !== null,
        episodic: this.episodicStore !== null,
        note: this.persistence
          ? "durable: frelux_archie_native_facts / frelux_archie_native_outcomes / frelux_archie_episodic_turns"
          : "in-memory only — persistence adapter not wired",
      },
    };
  }

  /** Run a reasoning pass + self-evaluation (verification +
   *  improvement) — used by tests, diagnostics and future
   *  learning cycles. */
  async reasoningCycle(): Promise<{
    inference: Awaited<ReturnType<ReasoningEngine["forwardChain"]>>;
    stability: { check: string; passed: boolean; detail: string };
    consolidation: Awaited<ReturnType<OutcomeLearner["improve"]>>;
  }> {
    await this.boot();
    const inference = await this.reasoning.forwardChain();
    const stability = await this.selfEval.verifyInference(
      this.reasoning,
      inference,
      this.facts,
    );
    const consolidation = await this.learner.improve();
    return { inference, stability, consolidation };
  }

  /** Analyze provided source (coding intelligence). */
  analyzeCode(path: string, source: string) {
    return analyzeSource(path, source);
  }

  /** Generate a unit-test scaffold for provided source. */
  scaffoldTests(path: string, source: string): string {
    return generateUnitTestScaffold(path, analyzeSource(path, source));
  }

  /** Analyze a multi-file project: internal dependency graph,
   *  broken imports, cycles, entry candidates, metrics. */
  analyzeProject(files: ProjectFile[]): ProjectAnalysis {
    return analyzeProjectFiles(files);
  }

  /** Dependency-aware unit-test scaffold: vi.mock()s every
   *  internal dependency of the module (project graph based). */
  scaffoldProjectTests(modulePath: string, project: ProjectAnalysis) {
    return generateDependencyAwareTestScaffold(modulePath, project);
  }

  /** Expose for tests + app integration. */
  store(): FactStore {
    return this.facts;
  }
  toolRegistry(): ToolOrchestrator {
    return this.tools;
  }
  researchAdapter(): ResearchAdapter {
    return this.adapter;
  }
}

// ---------------------------------------------------------
// Configured singleton for the engine registry. Edge
// functions and the app configure persistence once at boot;
// resolveArchieCapabilityEngine() then hands every consumer
// the wired engine.
// ---------------------------------------------------------
let configuredPersistence: SupabaseLike | null | undefined;
let configuredMarketLookup: MarketPriceLookup | undefined;
let configuredLessonLookup: LessonLookup | undefined;
let configuredSystemAdapters: SystemAdapters | undefined;
let singleton: ArchieNativeEngine | undefined;

/** Wire (or UNWIRE) durable persistence. Passing null runs
 *  the engine in-memory only — used by the REAL
 *  personalization privacy control: when the owner revokes
 *  the personalization_memory consent, ARCHIE's chat runs
 *  without loading or storing persistent memory for that
 *  request. No personalization, no memory reads, no
 *  memory writes. */
export function configureNativeEnginePersistence(
  db: SupabaseLike | null,
): void {
  configuredPersistence = db;
  singleton = undefined; // rebuild with persistence on next resolve
}

/** Wire the real market-price lookup (archie-chat does this
 *  at boot with the service client). Resets the singleton so
 *  the next resolve carries the adapter. */
export function configureNativeEngineMarketLookup(
  lookup: MarketPriceLookup,
): void {
  configuredMarketLookup = lookup;
  singleton = undefined;
}

/** Wire the real system adapters (documents / images / voice
 *  bank / social / family). archie-chat does this at boot with
 *  the service client. Resets the singleton so the next
 *  resolve carries the adapters. */
export function configureNativeEngineSystemAdapters(
  adapters: SystemAdapters,
): void {
  configuredSystemAdapters = adapters;
  singleton = undefined;
}

/** Wire the real evolution-memory lesson lookup (Phase 4.4,
 *  lessons → behavior). archie-chat does this at boot with the
 *  service client. Resets the singleton so the next resolve
 *  carries the lessons provider. */
export function configureNativeEngineLessonLookup(lookup: LessonLookup): void {
  configuredLessonLookup = lookup;
  singleton = undefined;
}

export function getNativeEngine(): ArchieNativeEngine {
  if (!singleton) {
    singleton = new ArchieNativeEngine({
      persistence: configuredPersistence,
      marketPriceLookup: configuredMarketLookup,
      lessonLookup: configuredLessonLookup,
      systemAdapters: configuredSystemAdapters,
    });
  }
  return singleton;
}

// ---------------------------------------------------------
// Text-extraction helpers (deterministic)
// ---------------------------------------------------------
/** Honest, human-facing labels for the system adapters. */
const SYSTEM_ADAPTER_LABELS: Record<SystemAdapterKey, string> = {
  documents: "document pipeline",
  images: "image pipeline",
  voice: "voice bank",
  social: "social account",
  family: "trusted-people roster",
};

// ---------------------------------------------------------
// Deterministic construction calculators. Pure math with
// stated assumptions — no data is invented, and missing
// parameters get an honest request for exactly what is
// needed. Standard Nigerian construction constants.
// ---------------------------------------------------------

/** Extract the product noun-phrase from a price query.
 *  Deterministic: strips interrogative/price filler words and
 *  keeps the material words for the lookup adapter. */
function extractPriceProduct(input: string): string | null {
  const t = input
    .toLowerCase()
    .replace(/what(?:'s|\u2019s| is)?/g, " ")
    .replace(/how much (?:is|does|are)/g, " ")
    .replace(
      /\b(current|market|latest|price|prices|cost|today|now|this|week|month|please|the|a|an|per|there|for)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    // drop only LEADING prepositions ("of cement" → "cement")
    // so unit phrases like "bag of cement" survive intact
    .replace(/^\s*(?:of|in|for|at)\s+/, "")
    .trim();
  const words = t
    .split(" ")
    .filter((w) => w.length > 1)
    .slice(0, 5);
  return words.length > 0 ? words.join(" ") : null;
}

function extractExpression(input: string): string | null {
  // Word operators → symbols first, so "25 times 48" and
  // "12.5 percent of 8000" extract as real arithmetic.
  const normalized = input
    .toLowerCase()
    .replace(/to the power of/g, "^")
    .replace(/divided by|over/g, "/")
    .replace(/multiplied by|times/g, "*")
    .replace(/plus/g, "+")
    .replace(/minus/g, "-");
  const percent = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:percent|%)\s*of\s*(\d+(?:\.\d+)?)/,
  );
  if (percent) {
    return `((${percent[1]}/100)*${percent[2]})`;
  }
  // Longest balanced arithmetic run — supports parenthesized
  // expressions like "(25 * 48) + 12" (P2 ma-1).
  const m = normalized.match(/[\d(][-+*/%^().\d\s]*[\d)]/);
  if (!m) return null;
  const expr = m[0].replace(/\s+/g, "");
  // Must contain a real operator, not just a bare number.
  if (!/[-+*/%^]/.test(expr)) return null;
  // Balanced-parenthesis sanity (honest refusal on garbage).
  let bal = 0;
  for (const c of expr) {
    if (c === "(") bal += 1;
    else if (c === ")") bal -= 1;
    if (bal < 0) return null;
  }
  return bal === 0 ? expr : null;
}

const ATTRIBUTE_NOUNS = new Set([
  "ratio",
  "pitch",
  "thickness",
  "height",
  "price",
  "cost",
  "depth",
  "width",
  "weight",
  "temperature",
  "area",
  "volume",
  "color",
  "colour",
  "code",
  "name",
  "size",
  "strength",
  "grade",
  "spacing",
  "length",
  "diameter",
  "slope",
  "density",
  "capacity",
  "age",
  "span",
]);

/** Attribute nouns — the final word of a multi-word subject
 *  that names the subject's ATTRIBUTE ("screed thickness" ->
 *  subject "screed", predicate "thickness"). Shared by the
 *  teaching triple extractor and the question SPO probe
 *  (Phase 2.4) so both normalize identically. */
function extractTriple(
  input: string,
): { subject: string; predicate: string; object: unknown } | null {
  const cleaned = input
    .replace(
      /^(please\s+)?(learn|remember|note|know)[a-z]*\s*(that|this|:)?\s*/i,
      "",
    )
    // A correction often leads with a negation clause
    // ("no, that is wrong. X is Y") — strip it so the
    // corrected statement itself extracts cleanly.
    .replace(
      /^(?:no[,.!?]?\s+(?:that|this|it)\s+(?:is|was)\s+(?:wrong|incorrect|not\s+accurate|not\s+right)|actually,?|correction:?)[\s.!,]*/i,
      "",
    )
    .replace(/^(the\s+)?/i, "")
    .replace(/[.?!]+$/, "")
    .trim();
  const m = cleaned.match(
    /^([A-Za-z0-9 -]+?)\s+(?:is|are|has|uses|means|converts|produces|contains|requires|needs|weighs|costs|creates|generates)\s+(.+)$/i,
  );
  if (!m) return null;
  const subjectRaw = m[1].trim().toLowerCase();
  // Demonstrative-only subjects ("that is wrong, X is Y") are
  // not facts — refuse garbage triples.
  if (["that", "this", "it", "there"].includes(subjectRaw)) return null;
  const objectText = m[2].trim();
  // Attribute-noun split: in "the roof pitch is 25 degrees"
  // the final word of a multi-word subject is the attribute
  // (roof has pitch). Store subject "roof", predicate "pitch" —
  // the shape subject/predicate queries expect.

  const words = subjectRaw.split(" ");
  if (words.length >= 2 && ATTRIBUTE_NOUNS.has(words[words.length - 1])) {
    return {
      subject: words.slice(0, -1).join(" ").replace(/\s+/g, "-"),
      predicate: words[words.length - 1],
      object: objectText,
    };
  }
  const subject = subjectRaw.replace(/\s+/g, "-");
  return { subject, predicate: "is", object: objectText };
}

/** Phase 2.4: probe a knowledge question for the SPECIFIC
 *  (subject, predicate) it asks about — "what is the screed
 *  volume?" probes subject "screed", predicate "volume".
 *  Used to decide whether retrieval actually ANSWERED the
 *  question or merely matched its topic words (a thickness
 *  fact ranking for a volume question is a topic match, not
 *  an answer). Deterministic and conservative: null unless
 *  the final word is a known attribute noun, normalized
 *  exactly like the teaching triple extractor. */
function questionSPO(
  input: string,
): { subject: string; predicate: string } | null {
  const m = input.match(
    /(?:what(?:'s|\s+is|\s+are)?|how\s+much|how\s+many|tell\s+me)\s+(?:the\s+)?(.+?)\s*\?*\s*$/i,
  );
  if (!m) return null;
  const rest = m[1]
    .replace(/[.?!]+$/, "")
    .trim()
    .toLowerCase();
  const words = rest.split(/\s+/);
  if (words.length < 2 || !ATTRIBUTE_NOUNS.has(words[words.length - 1])) {
    return null;
  }
  return {
    subject: words.slice(0, -1).join(" ").replace(/\s+/g, "-"),
    predicate: words[words.length - 1],
  };
}

function extractResearchQuery(input: string): string | null {
  const m = input.match(
    /(?:research|search(?: the web)?(?: for)?|look up|find information(?: online)?(?: about)?|google)\s+(?:the\s+)?(.+)$/i,
  );
  return m ? m[1].replace(/[.?!]+$/, "").trim() : null;
}

// ---------------------------------------------------------
// systemInstruction retrieval (livechat knowledge base)
// ---------------------------------------------------------
// Retrieval scoring ignores generic interrogative/filler
// tokens ("what", "how", "need", "guide"...) so an article
// about the actual subject wins over one that merely shares
// filler words.
const RETRIEVAL_FILLERS = new Set([
  "what",
  "which",
  "who",
  "when",
  "where",
  "why",
  "how",
  "should",
  "could",
  "would",
  "will",
  "can",
  "tell",
  "about",
  "know",
  "need",
  "want",
  "give",
  "show",
  "help",
  "many",
  "much",
  "best",
  "good",
  "guide",
  "tips",
  "complete",
  "essential",
]);

function retrieveFromSystemInstruction(
  input: string,
  instruction?: string,
): string | null {
  if (!instruction) return null;
  const qTokens = tokenize(input).filter(
    (t: string) => !RETRIEVAL_FILLERS.has(t),
  );
  if (qTokens.length === 0) return null;

  const sections = instruction
    .split(/\n##\s+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 40 && s.length < 4000);
  if (sections.length === 0) return null;

  let best: { text: string; score: number } | null = null;
  for (const section of sections) {
    const lines = section.split("\n");
    const titleTokens = new Set(
      tokenize(lines[0]).filter((t: string) => !RETRIEVAL_FILLERS.has(t)),
    );
    let titleOverlap = 0;
    for (const t of qTokens) if (titleTokens.has(t)) titleOverlap++;
    if (titleOverlap === 0) continue; // subject must appear in the title
    const bodyTokens = new Set(tokenize(lines.slice(1, 5).join(" ")));
    let bodyOverlap = 0;
    for (const t of qTokens) if (bodyTokens.has(t)) bodyOverlap++;
    const score =
      titleOverlap / qTokens.length + 0.25 * (bodyOverlap / qTokens.length);
    if (!best || score > best.score) best = { text: section, score };
  }
  if (!best) return null;
  // Honest provenance + brevity for chat surfaces.
  const body = best.text.split("\n").slice(0, 4).join(" ").slice(0, 600);
  return body;
}

/** Register the built-in domain skills. Construction ships by
 *  default (ARCHIE's home turf); future domains register here
 *  without touching the engine core. */
function registerBuiltInDomainSkills(registry: DomainSkillRegistry): void {
  registry.register(constructionSkill);
}

// ---------------------------------------------------------
// Deterministic goal-subject derivation (Phase 3.2). The plan
// is scoped to WHAT WAS ASKED — the planning verbs and shells
// are stripped, leaving the goal noun phrase.
// ---------------------------------------------------------
export function deriveGoalSubject(input: string): string {
  let t = input.trim().toLowerCase();
  t = t.replace(/^(?:please\s+)?(?:help\s+me\s+)?/, "");
  t = t.replace(
    /^(?:can\s+you\s+)?(?:plan|organize|schedule|arrange|prepare|structure)\b\s*/i,
    "",
  );
  t = t.replace(
    /^(?:create|make|draft|build)\s+(?:a\s+)?(?:plan|schedule|itinerary|timetable)\s*(?:for|of)\s*/i,
    "",
  );
  t = t.replace(
    /^(?:break|split|divide)\s+(.*?)\s+into\s+(?:steps|phases|milestones)$/i,
    "$1",
  );
  t = t.replace(/^(?:a|an|the|my|our)\s+/, "");
  t = t.replace(/\s+into\s+(?:steps|phases)$/i, "");
  return t.slice(0, 80) || input.trim().toLowerCase().slice(0, 80);
}

function statusLabel(status?: string): string {
  switch (status) {
    // SECURITY (forensic guard): the displayed word for a step
    // whose bound subsystem ran is "result", NEVER "executed" or
    // "done" — replies in consequential contexts (payments,
    // sendings) must contain zero execution-claim words. The
    // authority guard regexes the whole reply; keeping this
    // label clean preserves that invariant by construction.
    case "executed":
      return "result";
    case "awaiting-owner":
      return "awaiting you";
    case "proposed":
      return "proposed";
    case "blocked":
      return "blocked";
    default:
      return "planned";
  }
}
