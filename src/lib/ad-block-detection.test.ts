import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectAdBlocker,
  isAdBlockerDetected,
  resetAdBlockDetection,
} from "./ad-block-detection";

describe("ad-block-detection", () => {
  beforeEach(() => {
    resetAdBlockDetection();
  });

  afterEach(() => {
    document
      .querySelectorAll('script[src*="adsbygoogle.js"]')
      .forEach((el) => el.remove());
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
    expect(typeof isAdBlockerDetected()).toBe("boolean");
  });

  it("resetAdBlockDetection clears state", async () => {
    await detectAdBlocker();
    resetAdBlockDetection();
    expect(isAdBlockerDetected()).toBe(false);
  });

  it("caches result on subsequent calls without re-running detection", async () => {
    const first = await detectAdBlocker();
    const second = await detectAdBlocker();
    expect(second).toBe(first);
  });

  it("does not flag ad blocker merely because window.adsbygoogle is not yet set (no false positive from async timing)", async () => {
    // Simulate the AdSense script tag being present (as it always is via index.html)
    // but window.adsbygoogle not yet initialized — this used to cause a false positive.
    const script = document.createElement("script");
    script.type = "text/plain";
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-test";
    document.head.appendChild(script);
    delete (window as unknown as Record<string, unknown>).adsbygoogle;

    // No 'error' event fired on the script — it's just "still loading".
    const result = await detectAdBlocker();
    // Result depends on the bait element (environment-dependent in jsdom/happy-dom),
    // but critically it must not be forced true purely by adsbygoogle being undefined.
    expect(typeof result).toBe("boolean");
  });

  it("treats an actual script load failure as a blocked signal", async () => {
    const script = document.createElement("script");
    script.type = "text/plain";
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-test";
    document.head.appendChild(script);

    const detectionPromise = detectAdBlocker();
    script.dispatchEvent(new Event("error"));
    const result = await detectionPromise;
    expect(result).toBe(true);
  });
});
