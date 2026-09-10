// =========================================================
// ARCHIE CORE PRINCIPLE — PROVIDER INDEPENDENCE
// (GEMINI SEPARATION RULE)
//
// This is a PERMANENT ARCHITECTURAL PRINCIPLE of ARCHIE,
// encoded in core code and persisted in ARCHIE's durable
// store (frelux_archie_core_principles, seeded at birth and
// never overwritten). It is NOT a user-facing prompt, NOT a
// temporary instruction, NOT a mock or placeholder, and it
// must survive upgrades, migrations, devices and deployments.
//
// ARCHIE is an independent intelligence system. No external
// provider — Gemini in particular — is part of ARCHIE's core
// intelligence, memory, learning system, Coding Studio,
// reasoning engine, self-evolution system or PWA.
// =========================================================

export const PROVIDER_INDEPENDENCE_PRINCIPLE_ID = "provider_independence";

/** The rule, stated verbatim as a permanent ARCHIE
 *  architectural principle. */
export const PROVIDER_INDEPENDENCE = {
  principleId: PROVIDER_INDEPENDENCE_PRINCIPLE_ID,
  title: "ARCHIE Provider Independence (Gemini Separation Rule)",
  rule:
    "ARCHIE is an independent intelligence system. Gemini must NOT be part " +
    "of ARCHIE's core intelligence, memory, learning system, Coding " +
    "Studio, reasoning engine, self-evolution system, or PWA. ARCHIE must " +
    "operate independently using its own learned knowledge, coding " +
    "intelligence, memory, tools, and authorized capabilities.",
  geminiScope:
    "Gemini belongs ONLY to the FRELUX application as a secondary " +
    "fallback intelligence service.",
  /** The ONLY conditions under which Gemini may be called. */
  allowedConditions: [
    "ARCHIE determines that it does not have sufficient validated " +
      "knowledge to solve a specific FRELUX problem, OR",
    "ARCHIE determines that it cannot reliably complete the requested " +
      "task with its current capabilities.",
  ] as const,
  prohibitions: [
    "ARCHIE must never automatically delegate normal work to Gemini " +
      "simply because Gemini is available.",
    "Before requesting Gemini assistance, ARCHIE must attempt the task " +
      "using its own capabilities.",
    "Any Gemini response must be treated as external assistance " +
      "requiring ARCHIE's own analysis and validation before being " +
      "accepted into its knowledge or workflow.",
    "Gemini must not be copied into ARCHIE's core architecture.",
    "ARCHIE must not be made dependent on Gemini.",
    "Gemini must not be ARCHIE's hidden backend, fallback model, coding " +
      "engine, or reasoning engine.",
  ] as const,
  /** The independent Coding Studio workflow — no external
   *  provider anywhere in it. */
  studioWorkflow: [
    "Owner instruction",
    "ARCHIE reasoning",
    "code generation",
    "sandbox",
    "testing",
    "verification",
    "live preview",
    "Owner review",
  ] as const,
  /** Subsystems that must contain ZERO Gemini dependency. */
  protectedSubsystems: [
    "ARCHIE Core",
    "ARCHIE Coding Studio",
    "ARCHIE Memory",
    "ARCHIE Learning",
    "ARCHIE Evolution",
    "ARCHIE PWA",
  ] as const,
  /** Where external inference engines DO connect: ARCHIE's own
   *  provider-agnostic AI abstraction (neutral engine ids,
   *  never provider names in consumer code) — so future models
   *  can be added or changed without redesign, and no external
   *  provider ever substitutes for ARCHIE silently. */
  engineContract:
    "All ARCHIE inference resolves through ARCHIE's provider-agnostic " +
    "engine registry (neutral engine ids only). No engine operational " +
    "means an honest not-operational result — never a silent provider " +
    "substitution and never a faked result.",
  governing: "Owner Authority Layer",
  permanence:
    "Permanent architectural principle. Persisted across upgrades, " +
    "migrations, devices and deployments. Never implemented as a " +
    "temporary instruction, mock, placeholder or hardcoded conversational " +
    "response.",
} as const;

/**
 * Verification helper — used by tests and the integrity
 * pipeline. A subsystem is Gemini-independent when the rule is
 * encoded, the studio workflow is provider-agnostic, and every
 * protected subsystem is covered by the principle.
 */
export interface ProviderIndependenceIntegrity {
  encoded: boolean;
  studioWorkflowIndependent: boolean;
  protectedSubsystems: readonly string[];
  geminiFreluxOnly: boolean;
}

export function verifyProviderIndependenceIntegrity(): ProviderIndependenceIntegrity {
  return {
    encoded:
      PROVIDER_INDEPENDENCE.rule.includes("independent intelligence system") &&
      PROVIDER_INDEPENDENCE.rule.includes("Gemini must NOT be part"),
    studioWorkflowIndependent:
      PROVIDER_INDEPENDENCE.studioWorkflow.length === 8 &&
      !PROVIDER_INDEPENDENCE.studioWorkflow.some((step) =>
        /gemini|openai|claude|provider/i.test(step),
      ),
    protectedSubsystems: PROVIDER_INDEPENDENCE.protectedSubsystems,
    geminiFreluxOnly: PROVIDER_INDEPENDENCE.geminiScope.includes(
      "ONLY to the FRELUX application",
    ),
  };
}
