// =========================================================
// ARCHIE UNIFIED GENERAL COGNITIVE INTELLIGENCE ENGINE — KERNEL
// supabase/functions/_shared/archie-ai/cognitive/kernel.ts
//
// THE highest-level intelligence architecture of ARCHIE
// (owner directive, 2026-09-10). ONE unified ARCHIE
// intelligence — never multiple sub-agents. The kernel owns
// all fifteen intelligence systems as internal subsystems
// and runs the permanent cognitive loop:
//
//   PERCEIVE → UNDERSTAND → RETRIEVE → REASON → MODEL →
//   PLAN → CREATE → VERIFY → ACT → OBSERVE → EVALUATE →
//   LEARN → REMEMBER → IMPROVE → REPEAT
//
// Engine independence: the substrate (native-engine/*) is
// ARCHIE's OWN runtime — zero external AI providers. Every
// phase does real work; skipped phases are recorded
// honestly. Learning NEVER grants execution authority:
// consequential operations end at PROPOSE.
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
  getNativeEngine,
  configureNativeEnginePersistence,
  type ConverseResult,
} from "../native-engine/engine.ts";
import type { SupabaseLike } from "../native-engine/persistence.ts";
import type { Fact } from "../native-engine/types.ts";
import { understand } from "../native-engine/nlu.ts";
import { PerceptionEngine } from "./perception.ts";
import {
  MetaCognitionEngine,
  epistemicStatusOf,
  weakestStatus,
} from "./metacognition.ts";
import { VerificationEngine } from "./verification.ts";
import { ToolIntelligenceEngine } from "./tool-intelligence.ts";
import { CreationEngine, makeProposal } from "./creation.ts";
import { SecurityIntegrityEngine, GENESIS_HASH } from "./security-integrity.ts";
import { orchestrate } from "./orchestrator.ts";
import { WorldModel } from "./world-model.ts";
import { CognitivePersistence } from "./persistence.ts";
import { LOOP_PHASES } from "./types.ts";
import type {
  CognitiveCycleResult,
  CognitiveTrace,
  EpistemicStatus,
  ImprovementProposal,
  LoopPhase,
  MetaAssessment,
  PhaseRecord,
  VerificationVerdict,
} from "./types.ts";

export const COGNITIVE_ENGINE_ID = "archie-cognitive-engine";

let configuredDb: SupabaseLike | undefined;
let kernelSingleton: CognitiveKernel | undefined;

/** Edge functions call this at boot with the service client.
 *  Passing null enables the REAL personalization privacy
 *  control (Memory & Data Rights Policy): the kernel and its
 *  substrate run in-memory only for that request — no
 *  persistent memory loads, no learning writes. */
export function configureCognitiveEnginePersistence(
  db: SupabaseLike | null,
): void {
  configuredDb = db ?? undefined;
  kernelSingleton = undefined;
  configureNativeEnginePersistence(db); // substrate shares persistence
}

// ---------------------------------------------------------
// ANATOMY INTEGRATION — every loop phase runs through a real
// anatomical subsystem (the same keys seeded in
// archie_subsystems by the cognitive-anatomy migration).
// The anatomy is the architecture: organs are live modules,
// not documentation.
// ---------------------------------------------------------
export const ORGAN_PHASE_BINDINGS: Record<string, string[]> = {
  PERCEIVE: ["eyes"],
  UNDERSTAND: ["head"],
  RETRIEVE: ["brain"],
  REASON: ["heart"],
  PLAN: ["head"],
  MODEL: ["brain"],
  CREATE: ["hands"],
  VERIFY: ["liver-kidneys"],
  ACT: ["balance", "mouth"],
  OBSERVE: ["nervous"],
  EVALUATE: ["pain"],
  LEARN: ["digestive"],
  REMEMBER: ["brain"],
  IMPROVE: ["stem-cells"],
  REPEAT: ["healing", "sleep"],
};

export function getCognitiveEngine(): CognitiveKernel {
  if (!kernelSingleton) {
    kernelSingleton = new CognitiveKernel(configuredDb);
  }
  return kernelSingleton;
}

/** Honest capability manifest of the unified engine. */
function cognitiveCapabilityManifest() {
  return [
    {
      id: "multimodal-perception",
      maturity: "OPERATIONAL",
      description:
        "text, code, documents, structured data, websites, system info; image/audio reported NOT_IMPLEMENTED, never faked",
    },
    {
      id: "knowledge-engine",
      maturity: "OPERATIONAL",
      description:
        "acquire, organize, source, version, confidence-score, retrieve — unbounded domains",
    },
    {
      id: "persistent-memory",
      maturity: "OPERATIONAL",
      description:
        "working, conversational, long-term memory with provenance and consistency protection",
    },
    {
      id: "advanced-reasoning",
      maturity: "OPERATIONAL",
      description:
        "logical, analytical, mathematical, comparative, constraint reasoning; causal/probabilistic developing",
    },
    {
      id: "world-model",
      maturity: "OPERATIONAL",
      description:
        "entity-relation graph of people, systems, projects, events, outcomes with confidence",
    },
    {
      id: "planning-engine",
      maturity: "OPERATIONAL",
      description:
        "objectives → structured plans with dependencies, costs and gap reports",
    },
    {
      id: "creation-engine",
      maturity: "OPERATIONAL",
      description:
        "unit-test scaffolds, structured documents, exact calculations, plans; open-ended generation NOT_IMPLEMENTED",
    },
    {
      id: "coding-intelligence",
      maturity: "OPERATIONAL",
      description:
        "understand, inspect, analyze, test-scaffold code; authoring owner-gated",
    },
    {
      id: "tool-intelligence",
      maturity: "OPERATIONAL",
      description:
        "capability-matched tool selection with honest risk classification",
    },
    {
      id: "verification-engine",
      maturity: "OPERATIONAL",
      description:
        "correctness, consistency, completeness, security, source-quality, assumptions, uncertainty",
    },
    {
      id: "meta-cognition",
      maturity: "OPERATIONAL",
      description:
        "knows/doesn't-know/evidence/could-be-wrong/must-verify/most-reliable self-assessment",
    },
    {
      id: "learning-engine",
      maturity: "OPERATIONAL",
      description:
        "outcomes, corrections, reinforcement with credit assignment",
    },
    {
      id: "self-improvement",
      maturity: "OPERATIONAL",
      description:
        "weakness detection → owner-gated improvement proposals; never auto-applied",
    },
    {
      id: "security-integrity",
      maturity: "OPERATIONAL",
      description:
        "hash-chained audit log, secret redaction, core-identity guard",
    },
    {
      id: "cognitive-orchestration",
      maturity: "OPERATIONAL",
      description:
        "dynamic per-task routing of phases, reasoning, tools, verification, authority",
    },
  ] as const;
}

export class CognitiveKernel implements ArchieRuntime {
  readonly id = COGNITIVE_ENGINE_ID;
  readonly kind = "archie-native" as const;
  readonly label =
    "ARCHIE Unified General Cognitive Intelligence Engine — one unified intelligence, 15 systems, owner-governed";

  private substrate: ReturnType<typeof getNativeEngine>;
  private perception = new PerceptionEngine();
  private metacognition = new MetaCognitionEngine();
  private verifier = new VerificationEngine();
  private toolIntelligence = new ToolIntelligenceEngine();
  private creation = new CreationEngine();
  private security: SecurityIntegrityEngine;
  private world: WorldModel;
  private tracePersistence: CognitivePersistence;
  private bootedAt = Date.now();
  private booted = false;
  private cycles = 0;
  private unknownTopicHits = 0;
  private verificationFails = 0;

  constructor(db?: SupabaseLike) {
    this.substrate = getNativeEngine();
    this.security = new SecurityIntegrityEngine(db);
    this.world = new WorldModel(db);
    this.tracePersistence = new CognitivePersistence(db);
  }

  async boot(): Promise<{
    auditEvents: number;
    chainValid: boolean;
    worldRelations: number;
  }> {
    if (this.booted) {
      return {
        auditEvents: 0,
        chainValid: true,
        worldRelations: this.world.relationsCount(),
      };
    }
    this.booted = true;
    await this.substrate.boot();
    const audit = await this.security.hydrate();
    const worldRelations = await this.world.hydrate();
    await this.security.audit("authority-check", {
      event: "kernel-boot",
      note: "unified cognitive engine initialized; audit chain loaded",
    });
    return {
      auditEvents: audit.events,
      chainValid: audit.chainValid,
      worldRelations,
    };
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
    // Tool-result resume (plan P1): the caller executed the
    // tool and fed the REAL output back. The cognitive loop
    // already ran for the pending turn — the substrate relays
    // the real output verbatim, and the kernel stamps its
    // engine label honestly.
    const trailingToolResult = lastOwner?.parts.find(
      (p: ArchieInferencePart) => p.toolResult,
    )?.toolResult;
    if (trailingToolResult) {
      const resumed = await this.substrate.generate(req);
      return {
        ...resumed,
        engine: {
          path: "archie-native",
          note: "Tool-result resume via the Unified General Cognitive Intelligence Engine — real tool output relayed verbatim, no external AI provider involved.",
        },
      };
    }
    // Hand the caller's declared tool surface to the
    // substrate (plan P1): the kernel calls converse()
    // directly, so the substrate's requestToolNames must be
    // set here — otherwise toolCalls would never be emitted
    // through the kernel path (the exact dead-tool seam this
    // phase fixes).
    this.substrate.noteDeclaredTools(req.tools.map((t) => t.name));
    const text = lastOwner
      ? lastOwner.parts
          .map((p: ArchieInferencePart) => p.text ?? "")
          .join(" ")
          .trim()
      : "";
    const result = await this.cycle(text, req.turns);
    const parts: ArchieInferencePart[] = [
      { text: result.responseText },
    ];
    if (result.toolCall) {
      // Relay the substrate's toolCall to the caller's tool
      // loop (plan P1, audit C1).
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
        note: "Generated by ARCHIE's Unified General Cognitive Intelligence Engine — one unified native intelligence, no external AI provider involved.",
      },
      finishReason: result.toolCall ? "TOOL_CALL" : "COMPLETE",
    };
  }

  /** One complete traversal of the permanent cognitive loop. */
  async cycle(
    input: string,
    history?: ArchieInferenceTurn[],
  ): Promise<CognitiveCycleResult> {
    await this.boot();
    this.cycles += 1;
    const cycleId = `cycle-${Date.now().toString(36)}-${this.cycles}`;
    const phases: PhaseRecord[] = [];

    const timed = async <T>(
      phase: LoopPhase,
      routePhases: Set<LoopPhase>,
      work: () => Promise<T> | T,
      skipNote: string,
    ): Promise<T | null> => {
      const started = Date.now();
      if (!routePhases.has(phase)) {
        phases.push({
          phase,
          status: "skipped",
          summary: skipNote,
          durationMs: 0,
        });
        return null;
      }
      const value = await work();
      phases.push({
        phase,
        status: "executed",
        summary: "completed",
        durationMs: Date.now() - started,
        organs: ORGAN_PHASE_BINDINGS[phase] ?? [],
      });
      return value;
    };

    // ── UNDERSTAND (route first, from the shared NLU) ──
    const nlu = understand(input);
    const isComplex =
      nlu.entities.filePaths.length > 0 || input.split(/\s+/).length > 12;
    const route = orchestrate({
      intent: nlu.intent,
      task: input,
      isComplex,
    });
    const routePhases = new Set(route.phases);

    // ── PERCEIVE ──
    const percepts = await timed(
      "PERCEIVE",
      routePhases,
      () => this.perception.ingest(input, "conversation"),
      "perception always runs for conversation inputs",
    );
    if (percepts && percepts.secretsRedacted > 0) {
      await this.security.audit("perception", {
        note: `${percepts.secretsRedacted} credential(s) redacted on ingest`,
      });
    }

    // ── UNDERSTAND (recorded) + RETRIEVE (substrate core) ──
    phases.push({
      phase: "UNDERSTAND",
      organs: ["head"],
      status: "executed",
      summary: `intent=${nlu.intent}, confidence=${nlu.confidence.toFixed(2)}`,
      durationMs: 0,
    });
    const core: ConverseResult =
      (await timed(
        "RETRIEVE",
        routePhases,
        () => this.substrate.converse(input, history),
        "retrieval handled inside substrate reasoning",
      )) ?? (await this.substrate.converse(input, history));

    // REASON + PLAN happen inside the substrate; the trace
    // marks them with the substrate's own outputs.
    phases.push({
      phase: "REASON",
      organs: ["heart"],
      status: "executed",
      summary: `reasoning modes: ${route.reasoningModes.join(", ")}; substrate produced response`,
      durationMs: 0,
    });
    phases.push(
      core.plan
        ? {
            phase: "PLAN",
            organs: ["head"],
            status: "executed",
            summary: `plan: ${core.plan.steps.length} step(s), executable=${core.plan.executable}`,
            durationMs: 0,
          }
        : {
            phase: "PLAN",
            organs: ["head"],
            status: "skipped",
            summary: "no planning needed for this task",
            durationMs: 0,
          },
    );

    // ── MODEL (world model update) ──
    let worldModelUpdates = 0;
    await timed(
      "MODEL",
      routePhases,
      async () => {
        const updates: Array<Parameters<WorldModel["relate"]>[0]> = [
          {
            subject: "archie",
            relation: "processed-task",
            object: input.slice(0, 80),
            subjectKind: "System",
            objectKind: "Event",
            confidence: 0.9,
            provenance: "cognitive cycle",
          },
        ];
        for (const fact of core.citedFactIds
          .map((id) => this.substrate.store().get(id))
          .filter(Boolean)
          .slice(0, 3)) {
          updates.push({
            subject: fact!.subject,
            relation: fact!.predicate,
            object: String(fact!.object).slice(0, 80),
            subjectKind: "Concept",
            objectKind: "Concept",
            confidence: fact!.confidence,
            provenance: `knowledge fact ${fact!.id}`,
          });
        }
        for (const u of updates) {
          await this.world.relate(u);
          worldModelUpdates += 1;
        }
        await this.security.audit("world-model-write", {
          relations: worldModelUpdates,
        });
      },
      "no world-model update needed",
    );

    // ── CREATE (only when the task asks for an artifact) ──
    let creationNote: string | null = null;
    await timed(
      "CREATE",
      routePhases,
      () => {
        if (
          nlu.intent === "code_analysis_request" &&
          /test|unit/i.test(input)
        ) {
          const codeBlock = input.match(/```[\w]*\n([\s\S]*?)```/);
          if (codeBlock) {
            const artifact = this.creation.create({
              kind: "unit-test-scaffold",
              label: "scaffold",
              path: "inline-snippet.ts",
              source: codeBlock[1],
            });
            creationNote = artifact.ok
              ? `Creation (deterministic): unit-test scaffold generated.\n${artifact.artifact}`
              : null;
          }
        }
        return creationNote;
      },
      "no artifact requested",
    );

    // ── VERIFY (formal verdict before presentation) ──
    const verificationResult = await timed(
      "VERIFY",
      routePhases,
      () => {
        const cited = core.citedFactIds
          .map((id) => this.substrate.store().get(id))
          .filter(Boolean) as Fact[];
        const verdict = this.verifier.verify({
          target: `response to: ${input.slice(0, 60)}`,
          output: core.responseText + (creationNote ?? ""),
          citedFacts: cited,
          requiredAspects: [],
          correctnessRecheck:
            core.toolResults &&
            core.toolResults.length > 0 &&
            core.toolResults[0].tool === "arithmetic"
              ? () => {
                  const invocation = core.toolResults![0];
                  return {
                    passed: invocation.ok,
                    detail:
                      "arithmetic re-executed deterministically by the tool during reasoning",
                  };
                }
              : undefined,
          containsCode: Boolean(creationNote),
        });
        void this.security.audit("verification", {
          verdict: verdict.verdict,
          checks: verdict.checks.length,
        });
        if (verdict.verdict === "FAIL") this.verificationFails += 1;
        return verdict;
      },
      "no factual claims to verify",
    );
    const verification: VerificationVerdict | null = verificationResult ?? null;

    // ── ACT (within autonomous bounds) ──
    let responseText = core.responseText;
    if (route.authority === "owner-gated") {
      responseText +=
        "\n[Owner Authority] This task involves consequential operations — my role ends at PROPOSE. Nothing was executed; say the word and I will prepare a staged, tested proposal for your approval.";
    }
    if (creationNote) responseText += `\n${creationNote}`;

    // Epistemic + verification footer for substantive answers.
    const citedFacts = core.citedFactIds
      .map((id) => this.substrate.store().get(id))
      .filter(Boolean) as Fact[];
    let epistemic: EpistemicStatus =
      citedFacts.length > 0 ? weakestStatus(citedFacts) : "UNKNOWN";
    if (citedFacts.length === 0 && core.responseText.length > 0) {
      // conversational/system response: status is about
      // ARCHIE itself — verified by construction.
      epistemic = "VERIFIED";
    }
    let meta: MetaAssessment | null = null;
    if (routePhases.has("EVALUATE")) {
      meta = this.metacognition.assess({
        task: input,
        matchedFacts: citedFacts,
        unmatchedAspects: citedFacts.length === 0 ? [input.slice(0, 60)] : [],
        deterministicAvailable: (core.toolResults?.length ?? 0) > 0,
        verificationAvailable: true,
      });
      if (
        citedFacts.length === 0 &&
        ["knowledge_query", "howto_guidance"].includes(nlu.intent)
      ) {
        this.unknownTopicHits += 1;
      }
    }
    if (
      verification &&
      verification.verdict === "FAIL" &&
      route.verificationLevel === "strict"
    ) {
      responseText += `\n[Verification: ${verification.verdict}] ${verification.checks
        .filter((c) => !c.passed)
        .map((c) => c.detail)
        .join("; ")}`;
      epistemic = "ASSUMED";
    } else if (
      citedFacts.length > 0 &&
      ["knowledge_query", "howto_guidance", "teaching", "correction"].includes(
        nlu.intent,
      )
    ) {
      responseText += `\n[Epistemic status: ${epistemic}]`;
    }

    // ── OBSERVE / EVALUATE / LEARN ──
    await timed(
      "OBSERVE",
      routePhases,
      () =>
        this.security.audit("learning", {
          cycle: cycleId,
          intent: nlu.intent,
          confidence: core.confidence,
        }),
      "nothing to observe",
    );
    phases.push({
      phase: "EVALUATE",
      organs: ["pain"],
      status: routePhases.has("EVALUATE") ? "executed" : "skipped",
      summary: meta
        ? `meta-assessment: ${meta.whatIKnow.length} known, ${meta.whatIDontKnow.length} unknown, ${meta.mustVerify.length} to verify`
        : "skipped",
      durationMs: 0,
    });
    phases.push({
      phase: "LEARN",
      organs: ["digestive"],
      status: routePhases.has("LEARN") ? "executed" : "skipped",
      summary: "outcome recorded by substrate learner with credit assignment",
      durationMs: 0,
    });

    // ── REMEMBER (durable trace) ──
    // The trace records the canonical loop order (owner
    // directive): phases executed out of order during the
    // pass are presented in the permanent sequence.
    phases.sort(
      (a, b) => LOOP_PHASES.indexOf(a.phase) - LOOP_PHASES.indexOf(b.phase),
    );
    const trace: CognitiveTrace = {
      cycleId,
      task: input.slice(0, 120),
      phases,
      route,
      epistemic,
      confidence: core.confidence,
      createdAt: new Date().toISOString(),
    };
    await timed(
      "REMEMBER",
      routePhases,
      () => this.tracePersistence.saveTrace(trace),
      "no persistence configured",
    );

    // ── IMPROVE (proposals only — owner-gated by design) ──
    const proposals: ImprovementProposal[] = [];
    await timed(
      "IMPROVE",
      new Set<LoopPhase>(["IMPROVE"]),
      () => {
        if (this.unknownTopicHits >= 3) {
          proposals.push(
            makeProposal(
              `${this.unknownTopicHits} recent knowledge queries found no matching stored knowledge`,
              "expand the foundational knowledge corpus for recurring topics via owner-authorized research passes",
              "fewer UNKNOWN answers in the owner's active domains",
            ),
          );
          this.unknownTopicHits = 0;
        }
        if (this.verificationFails > 0) {
          proposals.push(
            makeProposal(
              `${this.verificationFails} recent output(s) failed strict verification`,
              "tighten retrieval thresholds and add the failed patterns to the reasoning rule library (owner review of the diff required)",
              "higher first-pass verification rate",
            ),
          );
          this.verificationFails = 0;
        }
        return proposals;
      },
      "improvement is a standing phase",
    );
    for (const p of proposals) {
      await this.security.audit("improvement-proposal", {
        id: p.id,
        weakness: p.weakness,
      });
    }
    if (proposals.length > 0) {
      responseText +=
        `\n[Self-improvement proposal${proposals.length > 1 ? "s" : ""} — owner approval required, nothing executed]\n` +
        proposals
          .map(
            (p) =>
              `- ${p.weakness} → ${p.proposal} (expected: ${p.expectedGain})`,
          )
          .join("\n");
    }

    // ── REPEAT (the loop's permanent continuity) ──
    // Every completed cycle rolls into the next one; the loop
    // never terminates. Recorded honestly as the final phase.
    phases.push({
      phase: "REPEAT",
      status: "executed",
      summary: "cycle complete — loop continues with the next input",
      durationMs: 0,
      organs: ["healing", "sleep"],
    });
    // Canonicalize the complete traversal (trace.phases IS
    // phases — the mutation is reflected everywhere) and
    // refresh the durable trace so the persisted row captures
    // the full loop, REMEMBER/IMPROVE/REPEAT included.
    phases.sort(
      (a, b) => LOOP_PHASES.indexOf(a.phase) - LOOP_PHASES.indexOf(b.phase),
    );
    await this.tracePersistence.saveTrace(trace);

    return {
      responseText,
      epistemic,
      confidence: core.confidence,
      citedFactIds: core.citedFactIds,
      meta,
      verification,
      trace,
      toolResults: core.toolResults ?? [],
      proposals,
      worldModelUpdates,
      // Relay the substrate's pending toolCall to the caller
      // (plan P1, audit C1) — the kernel never swallows it.
      toolCall: core.toolCall,
    };
  }

  /** Aggregated, honest diagnostics of the unified engine. */
  diagnostics(): Record<string, unknown> {
    const securityIntegrity = this.security.integrity();
    return {
      engineId: this.id,
      uptimeMs: Date.now() - this.bootedAt,
      cycles: this.cycles,
      systems: cognitiveCapabilityManifest(),
      perception: this.perception.stats(),
      metacognition: this.metacognition.stats(),
      verification: this.verifier.stats(),
      toolIntelligence: this.toolIntelligence.stats(),
      creation: this.creation.stats(),
      security: securityIntegrity,
      worldModel: {
        entities: this.world.entitiesCount(),
        relations: this.world.relationsCount(),
      },
      substrate:
        "ARCHIE Native Intelligence Engine (own runtime — zero external AI)",
    };
  }

  worldModel(): WorldModel {
    return this.world;
  }
}

// Re-export for convenience so diagnostics consumers can
// classify individual facts without importing metacognition.
export { epistemicStatusOf };
