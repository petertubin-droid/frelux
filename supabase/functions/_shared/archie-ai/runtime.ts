// =========================================================
// FRELUX ARCHIE, AI INFERENCE ABSTRACTION (SHARED)
// supabase/functions/_shared/archie-ai/runtime.ts
//
// THE ARCHIE AI LAYER. Provider-independent by design:
//
//   ARCHIE APPLICATION
//     → ARCHIE INTELLIGENCE CORE   (orchestration, tools,
//                                   validation, policy)
//     → ARCHIE AI INFERENCE LAYER  (this module: the single
//                                   boundary between ARCHIE
//                                   and any model)
//     → ARCHIE MODEL RUNTIME       (ARCHIE's own model/inference
//                                   implementation — the target
//                                   primary engine)
//
// HARD RULES:
//   * Gemini/OpenAI/any external provider is NEVER ARCHIE's
//     brain. External providers may only exist behind optional
//     ADAPTERS, explicitly labeled as external development
//     services during ARCHIE's independence roadmap.
//   * The ARCHIE-native runtime is an IMPLEMENTATION
//     BOUNDARY: when its capabilities are not implemented it
//     reports `operational: false` — it never pretends, and no
//     adapter is silently presented as ARCHIE.
//   * ARCHIE Knowledge, Learning, Memory and Tools are
//     ARCHIE-owned application data (Supabase, RLS-guarded).
//     Nothing is trapped inside a provider conversation.
//
// CAPABILITY BOUNDARIES RESERVED (roadmap surface — do not
// fake any of these until genuinely implemented):
//   model-loading, inference, tokenization, context-handling,
//   multimodal-processing, embeddings, retrieval, memory,
//   tool-calling, structured-output, model-versioning,
//   evaluation, training/fine-tuning, deployment, monitoring.
// =========================================================

// ---------------------------------------------------------
// 1. Generic, provider-neutral inference contract
// ---------------------------------------------------------
export type ArchieCapability =
  | "model-loading"
  | "inference"
  | "tokenization"
  | "context-handling"
  | "multimodal-processing"
  | "embeddings"
  | "retrieval"
  | "memory"
  | "tool-calling"
  | "structured-output"
  | "model-versioning"
  | "evaluation"
  | "training-fine-tuning"
  | "deployment"
  | "monitoring";

export interface ArchieToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ArchieToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ArchieToolResult {
  name: string;
  output: unknown;
}

export interface ArchieInferencePart {
  text?: string;
  toolCall?: ArchieToolCall;
  toolResult?: ArchieToolResult;
}

export interface ArchieInferenceTurn {
  role: "owner" | "archie";
  parts: ArchieInferencePart[];
}

export interface ArchieInferenceRequest {
  /** Conversation turns, provider-neutral. */
  turns: ArchieInferenceTurn[];
  /** ARCHIE's own tool registry, passed through this layer. */
  tools: ArchieToolSpec[];
  systemInstruction: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export type ArchieEnginePath = "archie-native" | "external-adapter";

/** Honest engine identity attached to every inference result. */
export interface ArchieEngineInfo {
  path: ArchieEnginePath;
  /** Adapter name when path === "external-adapter". */
  adapter?: string;
  /** Human-readable, honest provenance line. */
  note: string;
}

export interface ArchieInferenceResult {
  parts: ArchieInferencePart[];
  engine: ArchieEngineInfo;
}

// ---------------------------------------------------------
// 2. The runtime interface every engine must implement
// ---------------------------------------------------------
export interface ArchieRuntime {
  id: string;
  kind: "archie-native" | "external-adapter";
  label: string;
  /** True only when genuinely implemented and operational. */
  isOperational(): boolean;
  /** Implemented capabilities. Report honestly, never aspirationally. */
  capabilities(): ArchieCapability[];
  generate(req: ArchieInferenceRequest): Promise<ArchieInferenceResult>;
}

export class ArchieRuntimeNotImplementedError extends Error {
  capability: ArchieCapability;
  constructor(capability: ArchieCapability) {
    super(
      `ARCHIE-native runtime capability "${capability}" is an implementation boundary and is not implemented yet. ` +
        "No external provider is substituted for ARCHIE silently.",
    );
    this.capability = capability;
    this.name = "ArchieRuntimeNotImplementedError";
  }
}

// ---------------------------------------------------------
// 3. ARCHIE MODEL RUNTIME (the future primary engine)
//
// This is where ARCHIE's OWN model lives: model loading,
// tokenization, inference, multimodal processing, embeddings,
// retrieval, memory and training. Until those are genuinely
// built, this runtime reports operational: false. It is the
// roadmap stages 5-13 of ARCHIE independence, NOT a Gemini
// wrapper.
// ---------------------------------------------------------
export class ArchieModelRuntime implements ArchieRuntime {
  readonly id = "archie-model-runtime";
  readonly kind = "archie-native" as const;
  readonly label =
    "ARCHIE Model Runtime (own inference — implementation boundary)";

  isOperational(): boolean {
    // ARCHIE's own model is not trained/served yet. Honest, not fake.
    return false;
  }

  capabilities(): ArchieCapability[] {
    // None implemented yet. Each entry lands here only when real.
    return [];
  }

  async generate(): Promise<ArchieInferenceResult> {
    throw new ArchieRuntimeNotImplementedError("inference");
  }
}

// ---------------------------------------------------------
// 4. EXTERNAL ADAPTERS (optional, development only)
//
// An external provider may assist during development,
// experimentation, evaluation or training. It is an external
// service. It is NOT ARCHIE, not ARCHIE's brain, not
// ARCHIE's knowledge core, and never the permanent inference
// engine. Adapters are opt-in via explicit configuration and
// every result they produce is labeled with its true origin.
// ---------------------------------------------------------
export function createGeminiDevAdapter(opts: {
  apiKey: string;
  model?: string;
}): ArchieRuntime {
  const model = opts.model ?? "gemini-2.0-flash";
  return {
    id: "external-gemini-dev-adapter",
    kind: "external-adapter",
    label:
      "External development adapter (Google Gemini) — an external service, not ARCHIE",
    isOperational: () => true,
    capabilities: () => [
      "inference",
      "tool-calling",
      "multimodal-processing",
      "context-handling",
    ],
    async generate(
      req: ArchieInferenceRequest,
    ): Promise<ArchieInferenceResult> {
      // Map provider-neutral ARCHIE turns → Gemini contents.
      const contents = req.turns.map((t) => ({
        role: t.role === "owner" ? "user" : "model",
        parts: t.parts.map((p) => {
          if (p.text !== undefined) return { text: p.text };
          if (p.toolCall) {
            return {
              functionCall: { name: p.toolCall.name, args: p.toolCall.args },
            };
          }
          if (p.toolResult) {
            return {
              functionResponse: {
                name: p.toolResult.name,
                response: p.toolResult.output,
              },
            };
          }
          return { text: "" };
        }),
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.systemInstruction }] },
            contents,
            tools: req.tools.length
              ? [{ functionDeclarations: req.tools }]
              : undefined,
            generationConfig: {
              temperature: req.temperature ?? 0.4,
              maxOutputTokens: req.maxOutputTokens ?? 2048,
            },
          }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) {
        const msg =
          (body as { error?: { message?: string } })?.error?.message ??
          `HTTP ${res.status}`;
        throw new Error(`External development adapter error: ${msg}`);
      }
      const parts = (body?.candidates?.[0]?.content?.parts ?? []) as {
        text?: string;
        functionCall?: { name: string; args?: Record<string, unknown> };
      }[];
      return {
        parts: parts.map((p) => ({
          text: p.text,
          toolCall: p.functionCall
            ? { name: p.functionCall.name, args: p.functionCall.args ?? {} }
            : undefined,
        })),
        engine: {
          path: "external-adapter",
          adapter: "gemini",
          note: "Generated by an external development adapter (Google Gemini). This is an external service, not ARCHIE's own inference.",
        },
      };
    },
  };
}

// ---------------------------------------------------------
// 5. Runtime resolution — ARCHIE-native first, always
//
// Resolution order:
//   1. ARCHIE Model Runtime when operational (the target).
//   2. Explicitly enabled external development adapter
//      (opt-in via ARCHIE_DEV_ADAPTER) — labeled as external.
//   3. Nothing. The caller reports an honest not-operational
//      state. ARCHIE never silently substitutes a provider.
// ---------------------------------------------------------
export function resolveArchieRuntime(env: {
  devAdapter?: string;
  geminiKey?: string;
}): { runtime: ArchieRuntime | null; engine: ArchieEngineInfo } {
  // 1. ARCHIE-native (not implemented yet — honest boundary)
  const native = new ArchieModelRuntime();
  if (native.isOperational()) {
    return {
      runtime: native,
      engine: {
        path: "archie-native",
        note: "Generated by ARCHIE's own model runtime.",
      },
    };
  }

  // 2. Optional external development adapter
  if (env.devAdapter === "gemini" && env.geminiKey) {
    const adapter = createGeminiDevAdapter({ apiKey: env.geminiKey });
    return {
      runtime: adapter,
      engine: {
        path: "external-adapter",
        adapter: "gemini",
        note: "External development adapter enabled during ARCHIE's independence roadmap. Not ARCHIE's own inference.",
      },
    };
  }

  // 3. Honest not-operational state
  return {
    runtime: null,
    engine: {
      path: "archie-native",
      note: "ARCHIE's own model runtime is an implementation boundary. No engine is operational.",
    },
  };
}
