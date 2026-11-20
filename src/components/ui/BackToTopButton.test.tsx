import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import BackToTopButton from "@/components/ui/BackToTopButton";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BackToTopButton", () => {
  it("appears after scrolling down and returns the page to the top", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 600,
    });
    render(<BackToTopButton />);
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole("button", { name: "Back to top" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("stays hidden near the top of a page", () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    render(<BackToTopButton />);
    fireEvent.scroll(window);
    expect(screen.queryByRole("button", { name: "Back to top" })).toBeNull();
  });
});
