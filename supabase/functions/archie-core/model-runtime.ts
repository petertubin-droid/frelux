// =========================================================
// FRELUX ARCHIE STAGE 2 — ARCHIE AI ABSTRACTION / MODEL RUNTIME
//
// ARCHIE INTELLIGENCE CORE
//   → ARCHIE AI ABSTRACTION  (this module)
//     → MODEL RUNTIME (replaceable)
//
// The runtime registry tries ARCHIE's own model first. Until
// ARCHIE's independently trained model exists, an ISOLATED
// external adapter serves inference. The adapter is a temporary
// replaceable part, never ARCHIE's identity:
//
//   * ARCHIE is never described as "Gemini-powered" — responses
//     report runtime + adapter separately, and the adapter id
//     never appears as ARCHIE's brain (spec §§1, 11, 12, 39).
//   * Swapping in ARCHIE's own model (or any other runtime)
//     requires no change to the Intelligence Core above this
//     module — only a new runtime registered here.
//   * ARCHIE_OWN_MODEL is registered NOW with honest status
//     NOT_YET_AVAILABLE (spec §40): it refuses with a clear
//     error, it never fakes inference.
// =========================================================

// ---------------------------------------------------------
// Contract (mirrors src/lib/archie/ai-abstraction.ts)
// ---------------------------------------------------------
export interface RuntimePart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface InferenceRequest {
  parts: RuntimePart[];
  schema?: Record<string, unknown>;
  systemPrompt?: string;
}

export interface InferenceResult {
  /** Parsed JSON or { reply } from the runtime. */
  data: Record<string, unknown>;
  runtimeId: string;
  adapterId: string;
  model: string;
}

export interface ModelRuntime {
  id: string;
  kind: "ARCHIE_NATIVE" | "EXTERNAL_ADAPTER";
  label: string;
  /** Honest availability — never simulated (spec §40). */
  available(): boolean;
  generate(req: InferenceRequest): Promise<InferenceResult>;
}

// ---------------------------------------------------------
// ARCHIE OWN MODEL — the future primary runtime.
// Registered but honestly NOT YET AVAILABLE: no independent
// foundation model exists yet, so this runtime refuses rather
// than pretending (spec §§10, 40).
// ---------------------------------------------------------
const archieOwnModel: ModelRuntime = {
  id: "ARCHIE_OWN_MODEL",
  kind: "ARCHIE_NATIVE",
  label: "ARCHIE own model (registered, not yet available)",
  available: () => false,
  async generate() {
    throw new Error(
      "ARCHIE_OWN_MODEL is registered but not yet available — the independent ARCHIE model is still being built.",
    );
  },
};

// ---------------------------------------------------------
// ISOLATED EXTERNAL ADAPTER (temporary).
// Wraps the existing FRELUX provider usage behind the
// abstraction so it can be replaced without touching the
// Intelligence Core. This adapter is a PART, not ARCHIE.
// ---------------------------------------------------------
const GEMINI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-2.0-flash";

const geminiAdapter: ModelRuntime = {
  id: "GEMINI_ADAPTER",
  kind: "EXTERNAL_ADAPTER",
  label: "Isolated external inference adapter (temporary, replaceable)",
  available: () => !!GEMINI_KEY,
  async generate(req: InferenceRequest): Promise<InferenceResult> {
    if (!GEMINI_KEY) throw new Error("No inference runtime is configured.");
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: req.parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        ...(req.schema
          ? { responseMimeType: "application/json", responseSchema: req.schema }
          : {}),
      },
      ...(req.systemPrompt
        ? { systemInstruction: { parts: [{ text: req.systemPrompt }] } }
        : {}),
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Inference runtime error (${res.status}). ARCHIE's active runtime is not responding correctly.`,
      );
    }
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Inference runtime returned no content.");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: text };
    }
    return {
      data: parsed,
      runtimeId: "ARCHIE_INTELLIGENCE_CORE",
      adapterId: "GEMINI_ADAPTER",
      model: GEMINI_MODEL,
    };
  },
};

// ---------------------------------------------------------
// Registry — ARCHIE-native first, adapter fallback.
// Registration order is the preference order (spec §42).
// ---------------------------------------------------------
const RUNTIME_REGISTRY: ModelRuntime[] = [archieOwnModel, geminiAdapter];

export function listRuntimes(): Array<
  Pick<ModelRuntime, "id" | "kind" | "label" | "available"> & {
    status: "ACTIVE" | "NOT_YET_AVAILABLE";
  }
> {
  return RUNTIME_REGISTRY.map((r) => ({
    id: r.id,
    kind: r.kind,
    label: r.label,
    available: r.available,
    status: r.available() ? "ACTIVE" : "NOT_YET_AVAILABLE",
  }));
}

/** Resolve the active runtime: first available by preference. */
export function resolveRuntime(): ModelRuntime {
  for (const r of RUNTIME_REGISTRY) {
    if (r.available()) return r;
  }
  throw new Error(
    "No inference runtime is available. ARCHIE's own model is not yet built and no adapter is configured.",
  );
}

/** One inference call through the abstraction. */
export async function infer(req: InferenceRequest): Promise<InferenceResult> {
  return resolveRuntime().generate(req);
}
