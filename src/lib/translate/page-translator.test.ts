import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyPageTranslation,
  resetTranslationState,
  setPageLanguage,
} from "@/lib/translate/page-translator";

/**
 * These cover the loop that made translated pages feel heavy: the translator
 * observed the DOM it writes to, so every string it set queued another full
 * pass. Decorative churn (pulses, hover states, router transitions) did the
 * same. A page left open re-translated itself for as long as it was visible.
 */

function setBody(html: string) {
  document.body.innerHTML = html;
}

/** Google's shape: [ [ [translated, original, ...], ... ], ... ] */
function respond(lines: string[]) {
  return {
    ok: true,
    // data[0] is the array of sentence parts; part[0] is the translated text.
    json: async () => [lines.map((line) => [line, line, null, null])],
  } as unknown as Response;
}

describe("page translator", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetTranslationState();
    localStorage.clear();
    setBody(
      `<main><h1>Paint calculator</h1><p>Enter your room size</p></main>`,
    );
    fetchSpy = vi.fn(async (url: string) => {
      const q = decodeURIComponent(String(url).split("&q=")[1] ?? "");
      return respond(q.split("\n").map((line) => `${line} FR`));
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    resetTranslationState();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("translates the page once, not once per string it writes", async () => {
    vi.useFakeTimers();
    await vi.runAllTimersAsync();

    const ok = await applyPageTranslation("fr");
    expect(ok).toBe(true);
    expect(document.querySelector("h1")?.textContent).toBe(
      "Paint calculator FR",
    );
    expect(document.querySelector("p")?.textContent).toBe(
      "Enter your room size FR",
    );

    const writes = fetchSpy.mock.calls.length;
    expect(writes).toBeGreaterThan(0);

    // Let the observer's own writes settle, then let any queued pass fire.
    await vi.advanceTimersByTimeAsync(2_000);

    // The page did not translate itself again.
    expect(fetchSpy.mock.calls.length).toBe(writes);
    expect(document.querySelector("h1")?.textContent).toBe(
      "Paint calculator FR",
    );
  });

  it("ignores decorative DOM churn with no new words", async () => {
    vi.useFakeTimers();
    await vi.runAllTimersAsync();

    await applyPageTranslation("fr");
    const baseline = fetchSpy.mock.calls.length;

    // An animated badge swapping in an empty node, then an icon only element:
    // neither carries untranslated words.
    const badge = document.createElement("span");
    document.querySelector("main")?.appendChild(badge);
    badge.textContent = "";
    const icon = document.createElement("div");
    icon.className = "pointer-events-none";
    document.querySelector("main")?.appendChild(icon);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(fetchSpy.mock.calls.length).toBe(baseline);
  });

  it("still translates content that appears after the first pass", async () => {
    vi.useFakeTimers();
    await vi.runAllTimersAsync();

    await applyPageTranslation("fr");

    const section = document.createElement("section");
    section.textContent = "Saved estimates";
    document.querySelector("main")?.appendChild(section);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(section.textContent).toBe("Saved estimates FR");
  });

  it("returns the page to English without retranslating it", async () => {
    vi.useFakeTimers();
    await vi.runAllTimersAsync();

    await applyPageTranslation("fr");
    await setPageLanguage("en");

    expect(document.querySelector("h1")?.textContent).toBe("Paint calculator");
    expect(document.querySelector("p")?.textContent).toBe(
      "Enter your room size",
    );
  });

  it("never machine-translates the admin console", async () => {
    vi.useFakeTimers();
    await vi.runAllTimersAsync();

    const original = window.location.pathname;
    window.history.replaceState({}, "", "/admin/overview");
    try {
      const ok = await setPageLanguage("fr");
      expect(ok).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState({}, "", original || "/");
    }
  });
});
