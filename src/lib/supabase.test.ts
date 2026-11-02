import { describe, it, expect } from "vitest";
import { isSupabaseConfigured, getFunctionErrorMessage } from "./supabase";

describe("supabase", () => {
  it("isSupabaseConfigured is a boolean", () => {
    expect(typeof isSupabaseConfigured).toBe("boolean");
  });

  it("getFunctionErrorMessage returns message from Error", async () => {
    const err = new Error("Test error message");
    const msg = await getFunctionErrorMessage(err);
    expect(msg).toBe("Test error message");
  });

  it("getFunctionErrorMessage returns generic message for non-Error", async () => {
    const msg = await getFunctionErrorMessage("something weird");
    expect(msg).toBe("Something went wrong. Please try again.");
  });
});
