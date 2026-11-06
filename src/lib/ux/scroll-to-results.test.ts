import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RESULTS_SCROLL_OFFSET_PX,
  prefersReducedMotion,
  resultsScrollTop,
  scrollToResults,
} from "./scroll-to-results";

const rect = (top: number) => ({ top }) as unknown as DOMRect;

describe("resultsScrollTop", () => {
  it("lands on the element top, clear of the floating header", () => {
    // Element sits 1200px down the page while the reader has scrolled 400px.
    expect(resultsScrollTop(800, 400)).toBe(
      800 + 400 - RESULTS_SCROLL_OFFSET_PX,
    );
  });

  it("never returns a negative position", () => {
    expect(resultsScrollTop(10, 0)).toBe(0);
  });

  it("survives a missing layout figure", () => {
    expect(resultsScrollTop(Number.NaN, 0)).toBe(0);
  });
});

describe("scrollToResults", () => {
  afterEach(() => vi.restoreAllMocks());

  it("scrolls the window to the start of the result", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const element = { getBoundingClientRect: () => rect(500) } as HTMLElement;

    expect(scrollToResults(element, { behavior: "auto" })).toBe(true);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: "auto" });
  });

  it("reports that it did nothing when there is no result yet", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    expect(scrollToResults(null)).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe("prefersReducedMotion", () => {
  it("follows the reader's operating system setting", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });
});
