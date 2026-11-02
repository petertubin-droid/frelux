import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isSupabaseConfigured,
  getFunctionErrorMessage,
} from "@/lib/supabase-lazy";

// Mock the dynamic import of @supabase/supabase-js
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
  FunctionsHttpError: class FunctionsHttpError extends Error {
    context: Response;
    constructor(context: Response) {
      super("Edge Function returned a non-2xx status code");
      this.name = "FunctionsHttpError";
      this.context = context;
    }
  },
}));

beforeEach(() => {
  vi.resetModules();
});

describe("isSupabaseConfigured", () => {
  it("returns a boolean value", () => {
    expect(typeof isSupabaseConfigured).toBe("boolean");
  });
});

describe("getFunctionErrorMessage", () => {
  it("extracts error message from FunctionsHttpError with JSON body", async () => {
    const { FunctionsHttpError } = await import("@supabase/supabase-js");
    const fakeResponse = new Response(
      JSON.stringify({ error: "Rate limit exceeded" }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
    const err = new FunctionsHttpError(fakeResponse);

    const msg = await getFunctionErrorMessage(err);
    expect(msg).toBe("Rate limit exceeded");
  });

  it("returns the error.message for generic Errors", async () => {
    const err = new Error("Network failure");
    const msg = await getFunctionErrorMessage(err);
    expect(msg).toBe("Network failure");
  });

  it("returns a generic message for non-Error values", async () => {
    const msg = await getFunctionErrorMessage("something weird");
    expect(msg).toBe("Something went wrong. Please try again.");
  });

  it("handles FunctionsHttpError with non-JSON body gracefully", async () => {
    const { FunctionsHttpError } = await import("@supabase/supabase-js");
    const fakeResponse = new Response("Internal Server Error", {
      status: 500,
    });
    const err = new FunctionsHttpError(fakeResponse);

    const msg = await getFunctionErrorMessage(err);
    // Falls through to the generic Error.message
    expect(msg).toContain("Edge Function returned a non-2xx status code");
  });
});
