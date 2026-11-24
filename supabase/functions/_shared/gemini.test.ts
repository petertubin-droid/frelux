import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cleanJsonFence,
  getGeminiApiKey,
  callGeminiApi,
  GEMINI_MODELS,
} from "./gemini.ts";

describe("gemini helper", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("cleans markdown json code fences", () => {
    const raw = '```json\n{"foo":"bar"}\n```';
    expect(cleanJsonFence(raw)).toBe('{"foo":"bar"}');

    const rawWithoutLang = '```\n{"foo":"bar"}\n```';
    expect(cleanJsonFence(rawWithoutLang)).toBe('{"foo":"bar"}');

    const clean = '{"foo":"bar"}';
    expect(cleanJsonFence(clean)).toBe('{"foo":"bar"}');
  });

  it("resolves GEMINI_API_KEY or GOOGLE_AI_API_KEY from Deno.env", () => {
    (globalThis as any).Deno = {
      env: {
        get: (k: string) => {
          if (k === "GEMINI_API_KEY") return "gemini-secret-123";
          return undefined;
        },
      },
    };
    expect(getGeminiApiKey()).toBe("gemini-secret-123");

    (globalThis as any).Deno = {
      env: {
        get: (k: string) => {
          if (k === "GOOGLE_AI_API_KEY") return "google-secret-456";
          return undefined;
        },
      },
    };
    expect(getGeminiApiKey()).toBe("google-secret-456");
  });

  it("falls back to next model on 404", async () => {
    (globalThis as any).Deno = {
      env: {
        get: (k: string) => (k === "GEMINI_API_KEY" ? "test-key" : undefined),
      },
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("models/gemini-2.5-flash is not found", { status: 404 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: '{"hello":"world"}' }] } },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await callGeminiApi({
      contents: [{ parts: [{ text: "ping" }] }],
    });

    expect(result.text).toBe('{"hello":"world"}');
    expect(result.model).toBe("gemini-2.0-flash");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
