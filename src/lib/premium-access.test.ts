import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: null, error: null }),
          ),
        })),
      })),
    })),
  },
}));

import { isPremiumEnabled, invalidatePremiumCache } from "./premium-access";

describe("premium-access", () => {
  beforeEach(() => {
    invalidatePremiumCache();
  });

  it("returns false when no data in DB", async () => {
    const result = await isPremiumEnabled();
    expect(result).toBe(false);
  });

  it("invalidatePremiumCache clears cache", () => {
    invalidatePremiumCache();
    // Calling again should not throw
    expect(() => invalidatePremiumCache()).not.toThrow();
  });

  it("isPremiumEnabled returns a boolean", async () => {
    const result = await isPremiumEnabled();
    expect(typeof result).toBe("boolean");
  });
});
