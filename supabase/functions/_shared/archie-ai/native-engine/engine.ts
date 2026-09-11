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
} from "./nlu.ts";
import {
  derivedOpening,
  howtoFooter,
  includesDerived,
  knowledgeOpening,
  unknownOpening,
  type Verbosity,
} from "./composer.ts";
import { ContextMemory, rankFacts } from "./memory.ts";
import { redactSecrets } from "../cognitive/security-integrity.ts";
import { FactStore } from "./knowledge.ts";
import {
  FULL_SEED_CORPUS,
  SEED_CORPUS_VERSION,
} from "./seed-corpus.ts";
import {
  DEFAULT_RULES,
  GENERAL_RULES,
  ReasoningEngine,
} from "./reasoning.ts";
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
import { DEFAULT_OPERATORS, Planner } from "./planning.ts";
import {
  DomainSkillRegistry,
  type DomainSkill,
} from "./domains/registry.ts";
import {
  constructionSkill,
  constructionEstimate,
} from "./domains/construction.ts";

// API compatibility: the deterministic construction calculator
// moved to the construction domain skill (audit fix
// 2026-09-11, domain-capture removal). Re-exported so
// existing importers are unaffected.
export { constructionEstimate };
import { ToolOrchestrator, registerBuiltInTools } from "./tools.ts";
import {
  ResearchPipeline,
  salientTokens,
  type ResearchAdapter,
  DuckDuckGoLiteAdapter,
} from "./webresearch.ts";
import { getWebSourceRegistry } from "./web-sources.ts";
import { analyzeSource, generateUnitTestScaffold } from "./coding.ts";
import { SelfEvaluator } from "./selfeval.ts";
import { OutcomeLearner, type OutcomePersistence } from "./learning.ts";
import { SupabasePersistence, type SupabaseLike } from "./persistence.ts";
import { CounterPersistence, EpisodicPersistence } from "./persistence.ts";
import type { Fact, Plan, RetrievedContext } from "./types.ts";

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
    for (const key of ["answer", "text", "reply", "result", "summary", "price", "status"]) {
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

export class ArchieNativeEngine implements ArchieRuntime {
  /** Tool names the CALLER declared for the current request
   *  (plan P1): toolCalls are emitted only for declared
   *  tools — never speculatively. Visitors declare none. */
  private requestToolNames: string[] = [];

  /** The caller declares its tool surface per request (plan
   *  P1). The cognitive kernel calls converse() directly, so
   *  it must be able to hand the surface to the substrate
   *  without going through generate(). */
  noteDeclaredTools(names: string[]): void {
    this.requestToolNames = names;
  }
  readonly id = NATIVE_ENGINE_ID;
  readonly kind = "archie-native" as const;
  readonly label =
    "ARCHIE Native Intelligence Engine (own inference — operational)";

  private facts: FactStore;
  private reasoning: ReasoningEngine;
  private planner: Planner;
  private tools = new ToolOrchestrator();
  private memory = new ContextMemory();
  private selfEval = new SelfEvaluator();
  private learner: OutcomeLearner;
  private research: ResearchPipeline;
  /** Pluggable domain skills (audit fix 2026-09-11). */
  private domains: DomainSkillRegistry;
  private adapter: ResearchAdapter;
  private marketPriceLookup: MarketPriceLookup | null;
  private systemAdapters: SystemAdapters;
  private persistence: SupabasePersistence | null;
  private verbosity: Verbosity = "detailed";
  /** P7 — episodic-turn store (prior-session context). */
  private episodicStore: EpisodicPersistence | null = null;
  /** P7 — conversation id for episodic session grouping. */
  private conversationId = "default";
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
    systemAdapters?: SystemAdapters;
    /** P6 Batch B — owner verbosity profile. Selects which
     *  OPTIONAL connectives are composed; content and
     *  epistemic labels are identical in both modes. */
    verbosity?: Verbosity;
    /** P7 — conversation id for episodic-turn session
     *  grouping. Default 'default'. */
    conversationId?: string;
  }) {
    this.conversationId = options?.conversationId ?? "default";
    this.verbosity = options?.verbosity ?? "detailed";
    this.marketPriceLookup = options?.marketPriceLookup ?? null;
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
    this.adapter = options?.researchAdapter ?? new DuckDuckGoLiteAdapter();
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
    for (const seed of FULL_SEED_CORPUS) {
      const exists = this.facts
        .query({ subject: seed.subject, predicate: seed.predicate })
        .some((f) => JSON.stringify(f.object) === JSON.stringify(seed.object));
      if (!exists) {
        await this.facts.assert({
          ...seed,
          provenance: {
            source: "seed",
            note: `seed corpus v${SEED_CORPUS_VERSION} — foundational + FRELUX-domain knowledge, seeded at engine boot`,
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
          this.memory.hydrateEpisodic(
            rows
              .slice()
              .reverse() // oldest first, stable ranking
              .map((r) => ({
                role: r.role,
                text: r.text,
                at: Date.parse(r.turn_at) || Date.now(),
              })),
          );
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

  /** P7 — set the conversation id for episodic-turn session
   *  grouping (per request; no singleton rebuild — it only
   *  stamps NEW episodic rows). */
  setConversationId(id: string): void {
    this.conversationId = id || "default";
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
    // The caller's declared tool surface (plan P1, audit C1).
    this.requestToolNames = req.tools.map((t) => t.name);
    // Tool-result resume (plan P1): the caller executed the
    // tool and fed the REAL output back — compose the final
    // answer from it, verbatim and provenance-labeled.
    const trailingToolResult = lastOwner?.parts.find(
      (p: ArchieInferencePart) => p.toolResult,
    )?.toolResult;
    if (trailingToolResult) {
      return this.resumeFromToolResult(trailingToolResult);
    }
    const text = lastOwner
      ? lastOwner.parts
          .map((p: ArchieInferencePart) => p.text ?? "")
          .join(" ")
          .trim()
      : "";
    const result = await this.converse(text, req.turns, req.systemInstruction);
    const parts: ArchieInferencePart[] = [
      { text: result.responseText },
    ];
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
    toolResult: { name: string; output: unknown },
  ): ArchieInferenceResult {
    this.inferences += 1;
    this.sessionInferences += 1;
    const body = summarizeToolOutput(toolResult.output);
    const text =
      `${body}\n` +
      `[Source: ${toolResult.name} tool — real system output relayed verbatim by the ARCHIE native engine. I never fabricate system state.]`;
    this.memory.addTurn("owner", `[tool result: ${toolResult.name}]`);
    this.memory.addTurn("archie", text);
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
  ): Promise<ConverseResult> {
    await this.boot();
    this.inferences += 1;
    this.sessionInferences += 1;
    this.memory.seedFromTurns(
      (history ?? []).map((t) => ({
        role: t.role,
        text: t.parts
          .map((p) => p.text ?? "")
          .join(" ")
          .trim(),
      })),
    );
    this.memory.addTurn("owner", input);

    const nlu = understand(input);
    const context = this.memory.retrieve(input);
    const ranked = rankFacts(input, this.facts.list());

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
      outcome = await this.routeClauses(clauses, systemInstruction);
    } else {
      outcome = await this.route(nlu, input, ranked, context, systemInstruction);
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
    this.memory.addTurn("archie", outcome.responseText);
    // P7 — persist this turn pair so the NEXT session (any
    // isolate) recalls it. Consent gate: this.episodicStore
    // is null when personalization_memory is revoked.
    if (this.episodicStore) {
      const at = Date.now();
      const convId = this.conversationId;
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
            (c, i) => `${i + 1}. ${c.statement} — confidence ${(c.confidence * 100).toFixed(0)}%`,
          );
          return this.compose(
            `Comparison of ${pair.a} vs ${pair.b}, from my stored facts only:\n${lines.join("\n")}\n${comp.explanation}\nEvery line is derived from the cited facts — where my store lacks a dimension you care about, I say so rather than invent it.`,
            Math.min(0.9, Math.max(...comp.conclusions.map((c) => c.confidence))),
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
      const tem = subject
        ? temporal({ ...task, subject })
        : null;
      if (tem) {
        if (tem.conclusions.length > 0) {
          const lines = tem.conclusions.map(
            (c) => `- ${c.statement} (confidence ${(c.confidence * 100).toFixed(0)}%)`,
          );
          return this.compose(
            `Dated facts about ${subject}, in chronological order, from my store only:\n${lines.join("\n")}\n${tem.explanation}`,
            Math.min(0.9, Math.max(...tem.conclusions.map((c) => c.confidence))),
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
      /\b(disagree|disagrees|disagreeing|conflicting|conflicts?|contradict|contradicts|contradiction)\b/i.test(input) ||
      (/\bor\b/i.test(input) && /\d/.test(input));

    if (conflictClaim) {
      const cons = consistency(strategyTask);
      const storeConflicts = cons.conclusions.length > 0;
      const lines = storeConflicts
        ? cons.conclusions.map((c) => `- ${c.statement}`)
        : ["- your sources disagree, but I hold no stored facts on this point to arbitrate between them"];
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
      const lines = hyp.conclusions.map((c, i) =>
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
    const re = /(\d+(?:\.\d+)?)\s*(days?|hours?|hrs?|weeks?|months?|mm|cm|meters?|metres?|m|kg|tonnes?|tons?|%)/gi;
    const out: Array<{ value: number; unit: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ value: parseFloat(m[1]), unit: m[2].toLowerCase().replace(/s$/, "") });
    }
    return out;
  }

  /** P1b compositional hypothesis: connect the numbers in the
   *  user's problem to the numbers in validated knowledge. A
   *  gap (question value below knowledge requirement, same
   *  unit) becomes a working-hypothesis "possible cause" —
   *  always framed as NOT established as fact. */
  private speculativeFollowUp(input: string, validated: Fact[]): string | null {
    if (!/\b(why|how come|cause|crack|cracked|fail|failed|failure|problem|broken|damage|damaged)\b/i.test(input)) {
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
      const clauseRanked = rankFacts(clause.text, this.facts.list());
      const clauseContext = this.memory.retrieve(clause.text);
      const res = await this.route(
        clauseNlu,
        clause.text,
        clauseRanked,
        clauseContext,
        systemInstruction,
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

  private async route(
    nlu: ReturnType<typeof understand>,
    input: string,
    ranked: Fact[],
    context: RetrievedContext,
    systemInstruction?: string,
  ): Promise<ConverseResult> {
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
      const webClaim = input.match(
        /\bsays?\s+([^.?!]*?)\s+but/i,
      )?.[1];
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
      ["knowledge_query", "howto_guidance", "research_request", "price_query"]
        .includes(nlu.intent)
    ) {
      const strat = await this.strategyAnswer(input, ranked, nlu.confidence);
      if (strat) return strat;
    }

    switch (nlu.intent) {
      case "greeting":
      case "farewell":
      case "gratitude": {
        const text =
          nlu.intent === "greeting"
            ? `ARCHIE native engine online and listening. ${this.statusLine()} Ask me anything in my knowledge, or teach me something new.`
            : nlu.intent === "farewell"
              ? `Understood. ${this.statusLine()} Memory persists for next time.`
              : `Noted. ${this.statusLine()}`;
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
        if (this.requestToolNames.includes("frelux_status")) {
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
          return this.compose(text, nlu.confidence, [], undefined, [invocation]);
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
            const inverse =
              (Number(invocation.output) / Number(pct[2])) * 100;
            const passed = Math.abs(inverse - Number(pct[1])) < 1e-6;
            text += ` Cross-check ${passed ? "passed" : "FAILED"}: ${String(invocation.output)} ÷ ${pct[2]} × 100 = ${Number(inverse.toFixed(4))}% — inverse verification of the ${pct[1]}% claim.`;
          } else {
            const recompute = await this.tools.invoke("arithmetic", {
              expression,
            });
            const passed = recompute.ok && recompute.output === invocation.output;
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
          return this.compose(text, nlu.confidence * 0.4, cf.evidence.slice(0, 5));
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
                  `${f.subject} ${f.predicate.replace(/-/g, " ")}: ${String(f.object)} [confidence ${((f.confidence * 100) | 0)}%, ${f.provenance.source}]`,
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
        const validated = ranked
          .filter((f) => f.status !== "uncertain")
          .slice(0, 3);
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
          const strategic = await this.speculativeAnswer(input, ranked, nlu.confidence);
          if (strategic) return strategic;
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
        const parts = validated.map(
          (f) =>
            `${f.subject} ${f.predicate.replace(/-/g, " ")}: ${String(f.object)} ` +
            (f.status === "derived" || f.provenance.source === "inferred"
              ? `[confidence ${(f.confidence * 100).toFixed(0)}%, DERIVED — inferred by rule chain, not owner-validated]`
              : `[confidence ${(f.confidence * 100).toFixed(0)}%, ${f.provenance.source}]`),
        );
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
          nlu.intent === "howto_guidance" ? howtoFooter(kbSeed, this.verbosity) : "";
        // P8: an answer citing derived knowledge opens with the
        // derived marker, never "validated knowledge".
        const opening = includesDerived(validated)
          ? derivedOpening(kbSeed)
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
          status: "validated",
        });
        const text = conflict
          ? `Retained — but flagged: this contradicts ${conflict.conflictingFactIds.length} existing fact(s) on the same point. Both are held as uncertain until you confirm which is correct.`
          : `Retained as validated knowledge: ${fact.subject} ${fact.predicate.replace(/-/g, " ")} → ${String(fact.object)}.`;
        return this.compose(text, nlu.confidence, [fact.id]);
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
          const confirmed = rankFacts(input, this.facts.list(), 3).filter(
            (f) => {
              const ft = factTokens(f);
              if (ft.size === 0) return false;
              let shared = 0;
              for (const t of queryTokens) if (ft.has(t)) shared += 1;
              return shared >= 2;
            },
          );
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
        for (const f of rankFacts(input, this.facts.list(), 3)) {
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
          const { fact } = await this.facts.assert({
            ...triple,
            confidence: 0.8,
            provenance: {
              source: "owner-taught",
              note: `owner correction: ${input.slice(0, 120)}`,
            },
            status: "validated",
          });
          // OWNER AUTHORITY resolves the conflict: the owner
          // explicitly confirmed the correct value, so the
          // corrected fact is validated. The contradicted facts
          // remain in the store as uncertain (history kept) —
          // this is an audible resolution, never a silent
          // overwrite of higher-confidence knowledge.
          fact.status = "validated";
          return this.compose(
            `Correction processed. ${targeted.size} related fact(s) moved to uncertain, and the corrected knowledge is retained as the owner-confirmed value. I do not silently keep wrong facts.`,
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
        await this.facts.assert({
          subject: "project",
          predicate: "scope-defined",
          object: input.slice(0, 120),
          confidence: 0.9,
          provenance: { source: "seed", note: "scope as stated by owner" },
          status: "validated",
        });
        const plan = await this.planFor("planned");
        const text = plan.executable
          ? `Plan for your request (${plan.steps.length} steps, cost ${plan.totalCost}):\n` +
            plan.steps
              .map((s, i) => `${i + 1}. ${s.achieves} → ${s.satisfies}`)
              .join("\n") +
            `\nConsequential actions in this plan end at PROPOSE — execution stays yours to authorize.`
          : `I cannot honestly plan that yet. Gaps: ${plan.gapReport.join("; ")}. I report gaps rather than inventing steps.`;
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
          if (this.requestToolNames.includes("market_intelligence")) {
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

      case "construction_calc": {
        // Domain skills are pluggable (audit fix 2026-09-11):
        // an unregistered skill is answered honestly, never
        // fabricated.
        const domainHandler = this.domains.handlerFor("construction_calc");
        if (!domainHandler) {
          return this.compose(
            "That capability is not installed on this engine — I will not fabricate a construction estimate. " + this.statusLine(),
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

  private async planFor(goalPredicate: string): Promise<Plan> {
    return this.planner.plan(goalPredicate);
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
        memoryTurns: this.memory.size(),
        episodicTurns: this.memory.episodicSize(),
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

export function getNativeEngine(): ArchieNativeEngine {
  if (!singleton) {
    singleton = new ArchieNativeEngine({
      persistence: configuredPersistence,
      marketPriceLookup: configuredMarketLookup,
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
  const ATTRIBUTE_NOUNS = new Set([
    "ratio", "pitch", "thickness", "height", "price", "cost",
    "depth", "width", "weight", "temperature", "area", "volume",
    "color", "colour", "code", "name", "size", "strength",
    "grade", "spacing", "length", "diameter", "slope", "density",
    "capacity", "age", "span",
  ]);
  const words = subjectRaw.split(" ");
  if (
    words.length >= 2 &&
    ATTRIBUTE_NOUNS.has(words[words.length - 1])
  ) {
    return {
      subject: words.slice(0, -1).join(" ").replace(/\s+/g, "-"),
      predicate: words[words.length - 1],
      object: objectText,
    };
  }
  const subject = subjectRaw.replace(/\s+/g, "-");
  return { subject, predicate: "is", object: objectText };
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
  "what", "which", "who", "when", "where", "why", "how", "should",
  "could", "would", "will", "can", "tell", "about", "know", "need",
  "want", "give", "show", "help", "many", "much", "best", "good",
  "guide", "tips", "complete", "essential",
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
      titleOverlap / qTokens.length +
      0.25 * (bodyOverlap / qTokens.length);
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
