import { afterEach, describe, expect, it, vi } from "vitest";
import { isForwardStepLabel, scrollToPageTop } from "@/lib/ux/scroll-to-top";

afterEach(() => vi.restoreAllMocks());

describe("scroll-to-top helpers", () => {
  it("scrolls to the top smoothly by default", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    expect(scrollToPageTop()).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("recognizes forward workflow labels without matching pagination", () => {
    expect(isForwardStepLabel(" Continue to Cost Estimate ")).toBe(true);
    expect(isForwardStepLabel("Next Phase")).toBe(true);
    expect(isForwardStepLabel("Next page")).toBe(true);
    expect(isForwardStepLabel("Previous")).toBe(false);
    expect(isForwardStepLabel("Calculate")).toBe(false);
  });
});
