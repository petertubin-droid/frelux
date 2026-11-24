import { describe, it, expect, vi } from "vitest";

vi.mock("./supabase", () => {
  class MockFunctionsHttpError extends Error {
    context: { json: () => Promise<unknown> };
    constructor(body: unknown) {
      super("Edge Function returned a non-2xx status code");
      this.name = "FunctionsHttpError";
      this.context = {
        json: async () => body,
      };
    }
  }

  return {
    supabase: {
      functions: {
        invoke: vi.fn().mockImplementation((name: string) => {
          if (name === "ai-color-preview") {
            return Promise.resolve({
              data: null,
              error: new MockFunctionsHttpError({
                error: "Sign in to use FRELUX AI.",
                code: "AUTH_REQUIRED",
              }),
            });
          }
          return Promise.resolve({
            data: null,
            error: new MockFunctionsHttpError({
              error: "AI service not configured",
              code: "NO_API_KEY",
            }),
          });
        }),
      },
    },
    isSupabaseConfigured: true,
    getFunctionErrorMessage: async (err: any) => {
      if (err?.context) {
        const body = await err.context.json();
        if (body?.error) return body.error;
      }
      return err?.message || "Something went wrong";
    },
  };
});

const {
  aiColorPreview,
  aiProjectReview,
  aiProjectOptimize,
  aiProjectExplain,
  aiProjectQa,
} = await import("./ai-project");

describe("ai-project client with error extraction", () => {
  it("aiColorPreview extracts friendly error message instead of raw non-2xx status", async () => {
    await expect(
      aiColorPreview({ targetColors: [{ name: "Red", hex: "#FF0000" }] }),
    ).rejects.toThrow("Sign in to use FRELUX AI.");
  });

  it("aiProjectReview extracts friendly error message instead of raw non-2xx status", async () => {
    await expect(aiProjectReview({} as unknown as never)).rejects.toThrow(
      "AI service not configured",
    );
  });
});
