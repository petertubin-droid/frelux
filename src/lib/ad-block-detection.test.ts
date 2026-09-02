import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectAdBlocker } from "@/lib/ad-block-detection";

describe("detectAdBlocker", () => {
  beforeEach(() => {
    // Reset module state by re-importing
    vi.resetModules();
  });

  it("returns a boolean promise", async () => {
    vi.resetModules();
    const mod = await import("@/lib/ad-block-detection");
    const result = await mod.detectAdBlocker();
    expect(typeof result).toBe("boolean");
  });

  it("returns false when no ad blocker is present", async () => {
    vi.resetModules();
    const mod = await import("@/lib/ad-block-detection");
    const result = await mod.detectAdBlocker();
    // In test environment, no ad blocker CSS rules are applied
    expect(result).toBe(false);
  });

  it("caches result on subsequent calls", async () => {
    vi.resetModules();
    const mod = await import("@/lib/ad-block-detection");
    const r1 = await mod.detectAdBlocker();
    const r2 = await mod.detectAdBlocker();
    expect(r1).toBe(r2);
  });

  it("cleans up bait element after detection", async () => {
    vi.resetModules();
    const mod = await import("@/lib/ad-block-detection");
    await mod.detectAdBlocker();
    const bait = document.querySelector(
      ".adsbox.ad.ads.adsbygoogle.ad-placement",
    );
    expect(bait).toBeNull();
  });
});
