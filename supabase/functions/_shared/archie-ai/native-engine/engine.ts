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
import { understand } from "./nlu.ts";
import { ContextMemory, rankFacts } from "./memory.ts";
import { FactStore } from "./knowledge.ts";
import { DEFAULT_RULES, ReasoningEngine } from "./reasoning.ts";
import { DEFAULT_OPERATORS, Planner } from "./planning.ts";
import { ToolOrchestrator, registerBuiltInTools } from "./tools.ts";
import {
  ResearchPipeline,
  type ResearchAdapter,
  DuckDuckGoLiteAdapter,
} from "./webresearch.ts";
import { analyzeSource, generateUnitTestScaffold } from "./coding.ts";
import { SelfEvaluator } from "./selfeval.ts";
import { OutcomeLearner, type OutcomePersistence } from "./learning.ts";
import { SupabasePersistence, type SupabaseLike } from "./persistence.ts";
import type { Fact, Plan } from "./types.ts";

/** Foundational knowledge seeded at engine construction —
 *  real reference facts in ARCHIE's home domain. */
const SEED_FACTS: Array<
  Pick<Fact, "subject" | "predicate" | "object" | "confidence">
> = [
  {
    subject: "cement",
    predicate: "bag-mass",
    object: "50 kg",
    confidence: 0.95,
  },
  {
    subject: "screeding",
    predicate: "definition",
    object:
      "a thin layer (typically 25–75 mm) of cement-sand mix applied over a structural slab to level, smooth or raise the floor",
    confidence: 0.9,
  },
  {
    subject: "concrete",
    predicate: "curing",
    object:
      "keeping concrete moist and at suitable temperature so hydration continues and strength develops, typically for at least 7 days",
    confidence: 0.9,
  },
  {
    subject: "portland-cement",
    predicate: "definition",
    object:
      "a hydraulic binder made by grinding clinker (calcium silicates) with gypsum; reacts with water and hardens",
    confidence: 0.85,
  },
  {
    subject: "mortar",
    predicate: "definition",
    object:
      "a workable paste of cement, sand and water used to bind masonry units",
    confidence: 0.85,
  },
  {
    subject: "archie",
    predicate: "identity",
    object:
      "ARCHIE, the FRELUX project's native intelligence system, running its own independent inference engine with no external AI provider",
    confidence: 0.99,
  },
];

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

export class ArchieNativeEngine implements ArchieRuntime {
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
  private adapter: ResearchAdapter;
  private marketPriceLookup: MarketPriceLookup | null;
  private systemAdapters: SystemAdapters;
  private persistence: SupabasePersistence | null;
  private bootedAt = Date.now();
  private inferences = 0;
  private confidenceSum = 0;
  private booted = false;

  constructor(options?: {
    persistence?: SupabaseLike;
    researchAdapter?: ResearchAdapter;
    marketPriceLookup?: MarketPriceLookup;
    systemAdapters?: SystemAdapters;
  }) {
    this.marketPriceLookup = options?.marketPriceLookup ?? null;
    this.systemAdapters = options?.systemAdapters ?? {};
    this.persistence = options?.persistence
      ? new SupabasePersistence(options.persistence)
      : null;
    this.adapter = options?.researchAdapter ?? new DuckDuckGoLiteAdapter();
    this.facts = new FactStore(this.persistence ?? undefined);
    this.reasoning = new ReasoningEngine(this.facts, DEFAULT_RULES);
    this.planner = new Planner(this.facts, DEFAULT_OPERATORS);
    this.learner = new OutcomeLearner(
      this.facts,
      this.persistence ?? undefined,
    );
    this.research = new ResearchPipeline(this.facts, this.adapter);
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
    for (const seed of SEED_FACTS) {
      const exists = this.facts
        .query({ subject: seed.subject, predicate: seed.predicate })
        .some((f) => JSON.stringify(f.object) === JSON.stringify(seed.object));
      if (!exists) {
        await this.facts.assert({
          ...seed,
          provenance: {
            source: "seed",
            note: "foundational knowledge seeded at engine construction",
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
      object: `${DEFAULT_RULES.length} reasoning rules registered`,
      confidence: 0.9,
      provenance: { source: "seed", note: "reasoning rule library loaded" },
      status: "validated",
    });
    await this.learner.hydrate();
    return { hydratedFacts, seededFacts };
  }

  isOperational(): boolean {
    return true; // genuinely implemented — see capabilities()
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
    const text = lastOwner
      ? lastOwner.parts
          .map((p: ArchieInferencePart) => p.text ?? "")
          .join(" ")
          .trim()
      : "";
    const result = await this.converse(text, req.turns);
    return {
      parts: [{ text: result.responseText }],
      engine: {
        path: "archie-native",
        note: "Generated by ARCHIE's own Native Intelligence Engine — no external AI provider involved.",
      },
      finishReason: "COMPLETE",
    };
  }

  /** One full conversational inference pass. */
  async converse(
    input: string,
    history?: ArchieInferenceTurn[],
  ): Promise<ConverseResult> {
    await this.boot();
    this.inferences += 1;
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

    const outcome = await this.route(
      nlu,
      input,
      ranked,
      context.salientTurns.length,
    );
    this.confidenceSum += outcome.confidence;

    const selfCheck = this.selfEval.verifyResponse(
      outcome.citedFactIds,
      this.facts,
      false,
    );
    this.memory.addTurn("archie", outcome.responseText);

    // Learning: this exchange is a recorded outcome; the
    // knowledge used contributes to it.
    await this.learner.record({
      kind: "success",
      task: `${nlu.intent}: ${input.slice(0, 80)}`,
      contributing: outcome.citedFactIds,
    });

    return { ...outcome, nlu, selfCheck };
  }

  /** Intent routing — the intelligence core of a turn. */
  private async route(
    nlu: ReturnType<typeof understand>,
    input: string,
    ranked: Fact[],
    memoryDepth: number,
  ): Promise<ConverseResult> {
    const cite = (facts: Fact[]) => facts.map((f) => f.id);

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
        const identity = this.facts
          .about("archie")
          .filter((f) => f.predicate === "identity");
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
        const text = invocation.ok
          ? `${expression} = ${String(invocation.output)} (computed deterministically in-engine)`
          : `I could not compute that: ${invocation.error}. My arithmetic is honest — it reports errors rather than guessing.`;
        return this.compose(text, nlu.confidence, [], undefined, [invocation]);
      }

      case "knowledge_query":
      case "howto_guidance": {
        const validated = ranked
          .filter((f) => f.status !== "uncertain")
          .slice(0, 3);
        if (validated.length === 0) {
          const plan = await this.planFor("researched");
          return this.compose(
            `I do not have validated knowledge on that yet. My knowledge store holds ${this.facts.count()} facts — none matched. ` +
              `I can research it on the open web (cross-checked, stored as candidate knowledge for validation) or you can teach me directly; both are real options. ${plan.executable ? `Research plan is ready (${plan.steps.length} steps).` : ""}`,
            nlu.confidence * 0.5,
            [],
            plan,
          );
        }
        const parts = validated.map(
          (f) =>
            `${f.subject} ${f.predicate.replace(/-/g, " ")}: ${String(f.object)} ` +
            `[confidence ${(f.confidence * 100).toFixed(0)}%, ${f.provenance.source}]`,
        );
        return this.compose(
          `From my validated knowledge:\n${parts.join("\n")}` +
            (nlu.intent === "howto_guidance"
              ? `\nIf you need deeper steps than this, say so — I will plan the work and report any capability gaps honestly.`
              : ""),
          nlu.confidence * Math.min(1, validated[0].confidence + 0.3),
          cite(validated),
        );
      }

      case "teaching": {
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
        const related = rankFacts(input, this.facts.list(), 3);
        for (const fact of related) {
          fact.status = "uncertain";
        }
        await this.learner.record({
          kind: "correction",
          task: `correction on: ${input.slice(0, 80)}`,
          contributing: related.map((f) => f.id),
        });
        const triple = extractTriple(input);
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
          return this.compose(
            `Correction processed. ${related.length} related fact(s) moved to uncertain, and the corrected knowledge is retained. I do not silently keep wrong facts.`,
            nlu.confidence,
            [fact.id],
          );
        }
        return this.compose(
          `Correction processed. ${related.length} related fact(s) moved to uncertain pending re-teaching. Tell me the correct fact and I will retain it.`,
          nlu.confidence,
          related.map((f) => f.id),
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
        const text =
          report.hits.length > 0
            ? `Research completed for "${query}". ${report.hits.length} public source(s) found; ${report.storedKnowledge} finding(s) stored as low-confidence candidate knowledge pending validation.\nTop results:\n` +
              report.hits
                .slice(0, 3)
                .map((h) => `- ${h.title} (${h.url})`)
                .join("\n") +
              `\nNothing here is accepted as fact yet — validate findings before I treat them as knowledge.`
            : `Research ran but returned no results: ${report.note}. I report that honestly rather than inventing sources.`;
        return this.compose(text, nlu.confidence, []);
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
        const product = extractPriceProduct(input);
        if (!product) {
          return this.compose(
            "Ask me about a specific material — for example 'what is the price of cement' — and I will answer from real observed market data, never from a guess.",
            nlu.confidence,
            [],
          );
        }
        if (!this.marketPriceLookup) {
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
        return this.compose(constructionEstimate(input), nlu.confidence, []);
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
        outcomes: this.learner.count(),
        inferences: this.inferences,
      },
      calibration: {
        meanConfidence:
          this.inferences > 0 ? this.confidenceSum / this.inferences : 0,
        selfChecksRun: stats.selfChecksRun,
        contradictionsCaught: stats.contradictionsCaught,
      },
      persistence: {
        facts: this.persistence !== null,
        outcomes: this.persistence !== null,
        note: this.persistence
          ? "durable: frelux_archie_native_facts / frelux_archie_native_outcomes"
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
let configuredPersistence: SupabaseLike | undefined;
let configuredMarketLookup: MarketPriceLookup | undefined;
let configuredSystemAdapters: SystemAdapters | undefined;
let singleton: ArchieNativeEngine | undefined;

export function configureNativeEnginePersistence(db: SupabaseLike): void {
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

/** Parse decimal numbers from free text. */
function parseNumbers(input: string): number[] {
  return (input.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** Feet→meters when the query is in imperial units. */
const isFeet = (input: string): boolean =>
  /\b(?:feet|foot|ft\b|ft\.|['’])/i.test(input);

const FT_TO_M = 0.3048;
/** Effective face area of a standard 450x225mm block including
 *  a 10mm mortar joint: 0.46 x 0.235 = 0.1081 m2. */
const BLOCK_FACE_M2 = 0.1081;
/** Smooth-plaster paint coverage per litre per coat. */
const PAINT_M2_PER_LITRE = 10;
/** 1:2:4 concrete: dry volume factor, mix sum, cement density. */
const DRY_VOLUME_FACTOR = 1.54;
const MIX_SUM = 7;
const CEMENT_KG_PER_M3 = 1440;
const CEMENT_KG_PER_BAG = 50;

/** Deterministic construction estimate with honest assumptions.
 *  Returns the fully-composed answer string. */
export function constructionEstimate(input: string): string {
  const nums = parseNumbers(input);
  const feet = isFeet(input);
  const meters = nums.map((n) => (feet ? n * FT_TO_M : n));

  const wantsBlocks = /\b(?:blocks?|bricks?)\b/i.test(input);
  const wantsPaint = /\bpaint\b/i.test(input);
  const wantsCement = /\bcement\b/i.test(input) && !wantsBlocks && !wantsPaint;

  if (wantsBlocks) {
    if (meters.length < 2) {
      return `To estimate blocks I need the wall length and height — for example "how many blocks for a 6 by 3 meter wall". I will not guess dimensions.`;
    }
    const [l, h] = meters;
    const area = l * h;
    const base = area / BLOCK_FACE_M2;
    const withWaste = Math.ceil(base * 1.05);
    return (
      `For a ${feet ? `${nums[0]} ft x ${nums[1]} ft` : `${nums[0]} x ${nums[1]} m`} wall (${area.toFixed(2)} m2): approximately ${withWaste} blocks. ` +
      `Assumptions: standard 450x225mm block with 10mm mortar joints (0.1081 m2 face), plus 5% breakage/waste allowance. This is a deterministic estimate — verify on site before ordering.`
    );
  }

  if (wantsPaint) {
    if (meters.length < 1) {
      return `To estimate paint I need the surface area — for example "how much paint for a 4 by 5 meter wall". I will not guess dimensions.`;
    }
    const area = meters.length >= 2 ? meters[0] * meters[1] : meters[0];
    const litres = Math.ceil((area / PAINT_M2_PER_LITRE) * 2);
    return (
      `For ${area.toFixed(2)} m2 of surface: approximately ${litres} litres for two coats. ` +
      `Assumptions: smooth plaster at ~10 m2 per litre per coat, 2 coats. Rough or textured surfaces need more — this is a deterministic estimate, not a guess.`
    );
  }

  if (wantsCement) {
    if (meters.length < 1) {
      return `To estimate cement I need the concrete volume — for example "how many bags of cement for 2 cubic meters of concrete". I will not guess volumes.`;
    }
    const volume = meters[0];
    const bags = Math.ceil(
      ((volume * DRY_VOLUME_FACTOR) / MIX_SUM) *
        (CEMENT_KG_PER_M3 / CEMENT_KG_PER_BAG) *
        1.05,
    );
    return (
      `For ${volume} cubic meter(s) of concrete: approximately ${bags} x 50kg bags of cement. ` +
      `Assumptions: 1:2:4 mix (dry volume factor 1.54, cement at 1440 kg/m3), plus 5% waste. This is a deterministic estimate — verify with your engineer for structural work.`
    );
  }

  return `I can calculate three construction estimates deterministically: blocks for a wall ("how many blocks for a 6 by 3 meter wall"), paint for an area ("how much paint for 20 square meters"), and cement bags for a concrete volume ("how many bags of cement for 2 cubic meters"). Give me the numbers and I will compute — never guess.`;
}

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
  const m = normalized.match(
    /(-?\d+(?:\.\d+)?(?:\s*[-+*/%^×x÷]\s*\(?-?\d+(?:\.\d+)?\)?)+)/,
  );
  if (!m) return null;
  return m[1].replace(/\s+/g, "");
}

function extractTriple(
  input: string,
): { subject: string; predicate: string; object: unknown } | null {
  const cleaned = input
    .replace(
      /^(please\s+)?(learn|remember|note|know)[a-z]*\s*(that|this|:)?\s*/i,
      "",
    )
    .replace(/^(the\s+)?/i, "")
    .replace(/[.?!]+$/, "")
    .trim();
  const m = cleaned.match(
    /^([A-Za-z0-9 -]+?)\s+(?:is|are|has|uses|means)\s+(.+)$/i,
  );
  if (!m) return null;
  const subjectRaw = m[1].trim().toLowerCase();
  // Demonstrative-only subjects ("that is wrong, X is Y") are
  // not facts — refuse garbage triples.
  if (["that", "this", "it", "there"].includes(subjectRaw)) return null;
  const subject = subjectRaw.replace(/\s+/g, "-");
  const objectText = m[2].trim();
  return { subject, predicate: "is", object: objectText };
}

function extractResearchQuery(input: string): string | null {
  const m = input.match(
    /(?:research|search(?: the web)?(?: for)?|look up|find information(?: online)?(?: about)?|google)\s+(?:the\s+)?(.+)$/i,
  );
  return m ? m[1].replace(/[.?!]+$/, "").trim() : null;
}
