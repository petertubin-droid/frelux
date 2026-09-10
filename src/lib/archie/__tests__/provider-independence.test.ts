import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  PROVIDER_INDEPENDENCE,
  PROVIDER_INDEPENDENCE_PRINCIPLE_ID,
  verifyProviderIndependenceIntegrity,
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
      "supabase/migrations/20260912100000_archie_provider_independence.sql",
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
