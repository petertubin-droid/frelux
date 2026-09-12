import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  PROVIDER_INDEPENDENCE,
  PROVIDER_INDEPENDENCE_PRINCIPLE_ID,
  verifyProviderIndependenceIntegrity,
  OPENAI_SEPARATION,
  OPENAI_SEPARATION_PRINCIPLE_ID,
  verifyOpenAiSeparationIntegrity,
} from "../provider-independence";

// =========================================================
// PROVIDER INDEPENDENCE PRINCIPLE — PERMANENT ENFORCEMENT
//
// Statically verifies the Gemini Separation Rule against the
// REAL shipped sources: no Gemini API calls, SDKs, keys,
// model references, fallback logic or configuration may
// exist inside ARCHIE Core, Coding Studio, Memory, Learning,
// Evolution or PWA. Gemini lives ONLY in the FRELUX
// application layer as an explicitly-authorized fallback.
// =========================================================

const root = process.cwd();
const read = (rel: string): string => readFileSync(join(root, rel), "utf-8");

/** ARCHIE-owned sources — ZERO Gemini allowed. */
const PROTECTED_SOURCES = [
  // ARCHIE Core (Intelligence Core + chat)
  "supabase/functions/archie-core/index.ts",
  "supabase/functions/archie-core/model-runtime.ts",
  "supabase/functions/archie-chat/index.ts",
  // ARCHIE Coding Studio
  "supabase/functions/archie-studio/index.ts",
  "src/lib/archie/studio-client.ts",
  // ARCHIE AI abstraction (the engine boundary itself)
  "supabase/functions/_shared/archie-ai/runtime.ts",
  // ARCHIE PWA architecture
  "src/lib/archie/pwa-architecture.ts",
  "src/lib/archie/mobile/paid-services.ts",
  "src/lib/archie/mobile/types.ts",
];

/** Matches real Gemini wiring only — API endpoints, keys,
 *  model ids and factory calls. Honest prose mentions of the
 *  rule itself (e.g. "Gemini must NOT be part") are allowed. */
const WIRING = [
  /generativelanguage\.googleapis\.com/i,
  /GOOGLE_AI_API_KEY/,
  /gemini-\d|\bGemini\s?\d/i,
  /createGemini/i,
  /GEMINI_ADAPTER/,
  /ARCHIE_DEV_ADAPTER/,
];

describe("Provider Independence Principle — permanent rule is encoded", () => {
  it("exists as a core ARCHIE principle module with the verbatim rule", () => {
    expect(PROVIDER_INDEPENDENCE_PRINCIPLE_ID).toBe("provider_independence");
    expect(PROVIDER_INDEPENDENCE.rule).toContain(
      "ARCHIE is an independent intelligence system",
    );
    expect(PROVIDER_INDEPENDENCE.geminiScope).toContain(
      "ONLY to the FRELUX application",
    );
    expect(PROVIDER_INDEPENDENCE.studioWorkflow).toEqual([
      "Owner instruction",
      "ARCHIE reasoning",
      "code generation",
      "sandbox",
      "testing",
      "verification",
      "live preview",
      "Owner review",
    ]);
    expect(PROVIDER_INDEPENDENCE.protectedSubsystems).toEqual([
      "ARCHIE Core",
      "ARCHIE Coding Studio",
      "ARCHIE Memory",
      "ARCHIE Learning",
      "ARCHIE Evolution",
      "ARCHIE PWA",
    ]);
  });

  it("never delegates normal work to Gemini automatically — the two allowed conditions are stated", () => {
    expect(PROVIDER_INDEPENDENCE.allowedConditions).toHaveLength(2);
    expect(PROVIDER_INDEPENDENCE.prohibitions.join(" ")).toContain(
      "never automatically delegate normal work to Gemini",
    );
    expect(PROVIDER_INDEPENDENCE.prohibitions.join(" ")).toContain(
      "treated as external assistance",
    );
  });

  it("integrity verification passes", () => {
    const integrity = verifyProviderIndependenceIntegrity();
    expect(integrity.encoded).toBe(true);
    expect(integrity.studioWorkflowIndependent).toBe(true);
    expect(integrity.geminiFreluxOnly).toBe(true);
    expect(integrity.protectedSubsystems).toHaveLength(6);
  });

  it("is persisted in ARCHIE's durable core-principles store (seed migration)", () => {
    const migration = read(
      "supabase/migrations/20260912100001_archie_provider_independence.sql",
    );
    expect(migration).toContain("provider_independence");
    expect(migration).toContain("ON CONFLICT (principle_id) DO NOTHING");
  });

  it("is registered in the ARCHIE capability catalog", () => {
    const catalog = read("src/lib/archie/core-capabilities.ts");
    expect(catalog).toContain("PROVIDER_INDEPENDENCE");
    expect(catalog).toContain("provider-independence");
  });
});

describe("Provider Independence Principle — zero Gemini wiring in protected subsystems", () => {
  for (const src of PROTECTED_SOURCES) {
    it(`${src} contains no Gemini wiring`, () => {
      expect(existsSync(join(root, src))).toBe(true);
      const source = read(src);
      for (const pattern of WIRING) {
        // Filter out honest rule statements inside comments:
        // extract only code lines (strip // comments) for wiring checks.
        const codeOnly = source
          .split("\n")
          .filter((l) => !l.trim().startsWith("//"))
          .join("\n");
        expect(codeOnly).not.toMatch(pattern);
      }
    });
  }

  it("ARCHIE Evolution/learning-core modules contain no Gemini wiring", () => {
    const evolutionModules = [
      "src/lib/archie/engineering-objective.ts",
      "src/lib/archie/core-orchestrator.ts",
      "src/lib/archie/change-pipeline.ts",
      "src/lib/archie/ai-abstraction.ts",
    ];
    for (const m of evolutionModules) {
      const codeOnly = read(m)
        .split("\n")
        .filter((l) => !l.trim().startsWith("//"))
        .join("\n");
      for (const pattern of WIRING) {
        expect(codeOnly).not.toMatch(pattern);
      }
    }
  });
});

describe("Provider Independence Principle — FRELUX fallback boundary is explicit", () => {
  it("Gemini usage in FRELUX application services is allowed and clearly labeled as external", () => {
    // archie-extract is the FRELUX multimodal extraction service
    // (image estimator) — the explicitly-authorized FRELUX
    // fallback. It must label results as external and never
    // auto-promote knowledge.
    const extract = read("supabase/functions/archie-extract/index.ts");
    expect(extract).toContain("extraction only");
    expect(extract).toContain("NEVER promotes knowledge");
  });

  it("ARCHIE inference resolves through the provider-agnostic engine registry, not providers", () => {
    const shared = read("supabase/functions/_shared/archie-ai/runtime.ts");
    expect(shared).toContain("resolveArchieCapabilityEngine");
    expect(shared).toContain("CAPABILITY_ENGINE_REGISTRY");
    // and the registry contains no provider-named factory
    const codeOnly = shared
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(codeOnly).not.toMatch(/gemini|openai|claude|anthropic/i);
  });
});

// =========================================================
// OPENAI SEPARATION RULE — PERMANENT ENFORCEMENT
//
// Statically verifies the OpenAI Separation Rule against the
// REAL shipped sources: no OpenAI API call, key, model or SDK
// may exist inside ARCHIE's core intelligence, memory,
// learning, Coding Studio, reasoning, ears/voice system or
// PWA. ARCHIE's voice features run on the owner's voice bank
// (deterministic math) and native on-device recognition.
// OpenAI lives ONLY in the FRELUX application layer as an
// explicitly-authorized fallback — same conditions as Gemini.
// =========================================================

/** ARCHIE-owned sources — ZERO OpenAI allowed. */
const OPENAI_PROTECTED_SOURCES = [
  // ARCHIE Core (Intelligence Core + chat)
  "supabase/functions/archie-core/index.ts",
  "supabase/functions/archie-core/model-runtime.ts",
  "supabase/functions/archie-chat/index.ts",
  // ARCHIE Coding Studio
  "supabase/functions/archie-studio/index.ts",
  "src/lib/archie/studio-client.ts",
  // ARCHIE AI abstraction (the engine boundary itself)
  "supabase/functions/_shared/archie-ai/runtime.ts",
  // ARCHIE EARS / VOICE — the whole native pipeline
  "supabase/functions/archie-ears/index.ts",
  "supabase/functions/_shared/archie-ai/native-engine/ears.ts",
  "src/lib/archie/ears.ts",
  "src/lib/archie/mobile/voice-profile.ts",
  // ARCHIE status (no provider key may gate subsystem status)
  "supabase/functions/archie-status/index.ts",
  // ARCHIE PWA architecture
  "src/lib/archie/pwa-architecture.ts",
  "src/lib/archie/mobile/paid-services.ts",
  "src/lib/archie/mobile/types.ts",
];

/** Honest rule statements that may mention OpenAI by name —
 *  e.g. the verbatim OpenAI Separation Rule and honesty
 *  declarations ("ARCHIE is never described as ... -powered").
 *  These lines are not wiring and are dropped before matching. */
const OPENAI_HONEST_PROSE =
  /never described as|must not be part|must NOT be part|separation rule|never faked|no openai|no cloud ai|never uses openai|independent intelligence/i;

/** Matches real OpenAI wiring only — API endpoints, keys,
 *  model ids and provider calls. Honest prose mentions of the
 *  rule itself (e.g. "no OpenAI key") are allowed. */
const OPENAI_WIRING = [
  /api\.openai\.com/i,
  /OPENAI_API_KEY/,
  /gpt-[354]/i,
  /whisper-[\d.]/i,
  /tts-[\d.]/i,
  /openai/i, // in code (non-comment) — even a string like "OPENAI" is wiring
];

describe("OpenAI Separation Rule — permanent principle is encoded", () => {
  it("exists as a core ARCHIE principle module with the verbatim rule", () => {
    expect(OPENAI_SEPARATION.principleId).toBe(OPENAI_SEPARATION_PRINCIPLE_ID);
    expect(OPENAI_SEPARATION.rule).toContain("independent intelligence system");
    expect(OPENAI_SEPARATION.rule).toContain("OpenAI must NOT be part");
    expect(OPENAI_SEPARATION.openaiScope).toContain(
      "ONLY to the FRELUX application",
    );
  });

  it("voices ARCHIE through the owner's voice bank and native recognition — never a provider", () => {
    expect(OPENAI_SEPARATION.voiceIndependence).toContain("voice bank");
    expect(OPENAI_SEPARATION.voiceIndependence).toContain(
      "native on-device speech recognition",
    );
    expect(OPENAI_SEPARATION.voiceIndependence).toContain("no cloud AI");
    for (const p of OPENAI_SEPARATION.prohibitions) {
      expect(p).not.toContain("may use OpenAI");
    }
  });

  it("integrity verification passes", () => {
    const integrity = verifyOpenAiSeparationIntegrity();
    expect(integrity.encoded).toBe(true);
    expect(integrity.voiceBankNative).toBe(true);
    expect(integrity.openaiFreluxOnly).toBe(true);
    expect(integrity.protectedSubsystems).toContain("ARCHIE Ears / Voice");
  });

  it("is persisted in ARCHIE's durable core-principles store (seed migration)", () => {
    const migration = read(
      "supabase/migrations/20260913110000_archie_openai_separation.sql",
    );
    expect(migration).toContain("openai_separation");
    expect(migration).toContain("ON CONFLICT (principle_id) DO NOTHING");
  });

  it("the ears anatomy is bound to the native pipeline (migration)", () => {
    const migration = read(
      "supabase/migrations/20260913120000_archie_ears_native.sql",
    );
    expect(migration).toContain("native on-device speech recognition");
    expect(migration).toContain("frelux_archie_voice_samples");
    expect(migration).not.toMatch(/whisper|OPENAI_API_KEY/);
  });
});

describe("OpenAI Separation Rule — zero OpenAI wiring in protected subsystems", () => {
  for (const src of OPENAI_PROTECTED_SOURCES) {
    it(`${src} contains no OpenAI wiring`, () => {
      expect(existsSync(join(root, src))).toBe(true);
      const source = read(src);
      // Filter out honest rule statements inside comments:
      // strip // comments (full-line and trailing) for wiring checks.
      const codeOnly = source
        .replace(/\/\*[\s\S]*?\*\//g, " ") // /* */ block comments
        .split("\n")
        .map((l) => l.replace(/\/\/.*$/, ""))
        .filter((l) => !OPENAI_HONEST_PROSE.test(l))
        .join("\n");
      for (const pattern of OPENAI_WIRING) {
        expect(codeOnly).not.toMatch(pattern);
      }
    });
  }

  it("the learning/evolution core contains no OpenAI wiring", () => {
    const modules = [
      "src/lib/archie/engineering-objective.ts",
      "src/lib/archie/core-orchestrator.ts",
      "src/lib/archie/change-pipeline.ts",
      "src/lib/archie/ai-abstraction.ts",
    ];
    for (const m of modules) {
      const codeOnly = read(m)
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .split("\n")
        .map((l) => l.replace(/\/\/.*$/, ""))
        .filter((l) => !OPENAI_HONEST_PROSE.test(l))
        .join("\n");
      for (const pattern of OPENAI_WIRING) {
        expect(codeOnly).not.toMatch(pattern);
      }
    }
  });

  it("ARCHIE ingestion labels external provenance honestly — never silently claims OpenAI", () => {
    const validate = read("supabase/functions/archie-ingestion/validate.ts");
    expect(validate).toContain('"UNSPECIFIED"');
    const codeOnly = validate
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, ""))
      .filter((l) => !OPENAI_HONEST_PROSE.test(l))
      .join("\n");
    expect(codeOnly).not.toMatch(/\bOPENAI\b/);
  });
});
