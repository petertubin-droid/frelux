// =========================================================
// _shared/gemini.ts — Centralized Google Gemini caller & model resolver
//
// Handles:
// 1. Unified API key resolution (GEMINI_API_KEY or GOOGLE_AI_API_KEY).
// 2. Safe fallback across active Gemini models when a model returns 404.
// 3. Markdown code fence stripping so JSON parsers receive valid JSON.
// =========================================================

export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-3.6-flash",
] as const;

export function getGeminiApiKey(): string {
  return (
    Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY") || ""
  );
}

export function cleanJsonFence(text: string): string {
  let clean = text.trim();
  const fence = String.fromCharCode(96, 96, 96);
  if (clean.startsWith(fence)) {
    const lines = clean.split("\n");
    lines.shift();
    if (lines.length > 0 && lines[lines.length - 1].trim().startsWith(fence)) {
      lines.pop();
    }
    clean = lines.join("\n").trim();
  }
  return clean;
}

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface CallGeminiOptions {
  apiKey?: string;
  contents: Array<{ parts: GeminiContentPart[] }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    thinkingConfig?: { thinkingBudget?: number };
  };
  preferredModel?: string;
  timeoutMs?: number;
}

export async function callGeminiApi(
  options: CallGeminiOptions,
): Promise<{ text: string; model: string }> {
  const apiKey = options.apiKey || getGeminiApiKey();
  if (!apiKey) {
    throw new Error("NO_API_KEY: AI service not configured with an API key");
  }

  const configuredPreferred =
    options.preferredModel || Deno.env.get("GEMINI_MODEL") || undefined;

  const candidateModels: string[] = [];
  if (configuredPreferred) {
    candidateModels.push(configuredPreferred);
  }
  for (const m of GEMINI_MODELS) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  const body = {
    contents: options.contents,
    generationConfig: options.generationConfig ?? {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const timeoutMs = options.timeoutMs ?? 30_000;
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (
          res.status === 404 ||
          errText.includes("not found") ||
          errText.includes("is not supported")
        ) {
          lastError = new Error(`MODEL_NOT_FOUND:${model}`);
          continue;
        }
        let code = "PROVIDER_ERROR";
        if (res.status === 429) code = "RATE_LIMITED";
        else if (
          res.status === 400 ||
          res.status === 401 ||
          res.status === 403
        ) {
          code = "AUTH_ERROR";
        }
        throw new Error(`${code}:${res.status}:${errText.slice(0, 300)}`);
      }

      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("EMPTY_RESPONSE: No content returned by AI provider");
      }

      return { text, model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (
        lastError.message.includes("MODEL_NOT_FOUND") ||
        lastError.message.includes("404")
      ) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("ALL_MODELS_FAILED: No Gemini model succeeded");
}
