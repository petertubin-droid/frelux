import { describe, it, expect, vi } from "vitest";

vi.mock("./supabase", () => ({
  supabase: {
    functions: {
      invoke: vi
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: "Not configured" },
        }),
    },
  },
  isSupabaseConfigured: false,
}));

const { aiProjectReview, aiProjectOptimize, aiProjectExplain, aiProjectQa } =
  await import("./ai-project");

describe("ai-project (supabase not configured)", () => {
  it("aiProjectReview throws when not configured", async () => {
    await expect(aiProjectReview({} as unknown as never)).rejects.toThrow();
  });

  it("aiProjectOptimize throws when not configured", async () => {
    await expect(
      aiProjectOptimize({} as unknown as never, "reduce cost"),
    ).rejects.toThrow();
  });

  it("aiProjectExplain throws when not configured", async () => {
    await expect(aiProjectExplain({} as unknown as never)).rejects.toThrow();
  });

  it("aiProjectQa throws when not configured", async () => {
    await expect(
      aiProjectQa({} as unknown as never, "what is this?"),
    ).rejects.toThrow();
  });
});
