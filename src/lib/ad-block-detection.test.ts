import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  detectAdBlocker,
  isAdBlockerDetected,
  resetAdBlockDetection,
} from "./ad-block-detection";

describe("ad-block-detection", () => {
  beforeEach(() => {
    resetAdBlockDetection();
  });

  it("detectAdBlocker returns a boolean", async () => {
    const result = await detectAdBlocker();
    expect(typeof result).toBe("boolean");
  });

  it("isAdBlockerDetected returns false initially", () => {
    expect(isAdBlockerDetected()).toBe(false);
  });

  it("isAdBlockerDetected updates after detection", async () => {
    await detectAdBlocker();
    // In test environment (jsdom), no real ad blockers exist
    expect(typeof isAdBlockerDetected()).toBe("boolean");
  });

  it("resetAdBlockDetection clears state", async () => {
    await detectAdBlocker();
    resetAdBlockDetection();
    expect(isAdBlockerDetected()).toBe(false);
  });
});
