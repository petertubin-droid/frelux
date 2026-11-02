import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandBackdrop from "@/components/ui/BrandBackdrop";

describe("BrandBackdrop", () => {
  it.each(["hero", "footer", "page"] as const)(
    "renders the architectural image decoratively (%s)",
    (variant) => {
      const { container } = render(<BrandBackdrop variant={variant} />);
      const layer = container.firstChild as HTMLElement;
      expect(layer.getAttribute("aria-hidden")).toBe("true");
      expect(layer.className).toContain("pointer-events-none");
      const img = layer.querySelector("img");
      expect(img?.getAttribute("src")).toBe("/assets/entry/entry-bg.jpg");
      expect(img?.getAttribute("alt")).toBe("");
    },
  );

  it("loads the hero image eagerly and other variants lazily", () => {
    const { rerender } = render(<BrandBackdrop variant="hero" />);
    expect(document.querySelector("img[loading='eager']")).not.toBeNull();
    rerender(<BrandBackdrop variant="footer" />);
    expect(document.querySelector("img[loading='lazy']")).not.toBeNull();
  });

  it("shows glows for hero and footer but not page", () => {
    const { container, rerender } = render(<BrandBackdrop variant="hero" />);
    expect(container.querySelectorAll(".blur-3xl").length).toBe(2);
    rerender(<BrandBackdrop variant="footer" />);
    expect(container.querySelectorAll(".blur-3xl").length).toBe(2);
    rerender(<BrandBackdrop variant="page" />);
    expect(container.querySelectorAll(".blur-3xl").length).toBe(0);
  });
});
