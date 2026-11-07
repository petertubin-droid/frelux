import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ branding: null }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

import Logo, { LogoMark } from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";

describe("Logo", () => {
  it("renders with default full variant", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("renders mark variant without text", () => {
    const { container } = render(<Logo variant="mark" />);
    expect(container.querySelector("img")).toBeTruthy();
    expect(screen.queryByText("FRELUX")).toBeNull();
  });

  it("uses light text for dark backgrounds", () => {
    const { container } = render(<Logo light />);
    expect(container.querySelector("img")).toBeTruthy();
    expect(container.querySelector(".text-white")).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(<Logo className="custom-class" />);
    expect(container.querySelector(".custom-class")).toBeTruthy();
  });

  it("renders brand name from siteConfig when no branding", () => {
    render(<Logo />);
    expect(screen.getByText("FRELUX")).toBeTruthy();
  });

  it("renders tagline text", () => {
    render(<Logo />);
    expect(screen.getByText("Smart Calc")).toBeTruthy();
  });

  it("pairs the mark height with the type scale of each size", () => {
    // The artwork is wider than it is tall, so the type scale sets its height
    // and the width follows the crop's own aspect ratio.
    for (const [size, edge] of [
      ["sm", "20px"],
      ["md", "22px"],
      ["lg", "28px"],
    ] as const) {
      const { container } = render(<Logo size={size} />);
      const img = container.querySelector("img") as HTMLImageElement | null;
      expect(img?.style.height, size).toBe(edge);
      expect(img?.style.width, size).toBe("auto");
      expect(img?.getAttribute("width")).toBe("512");
      expect(img?.getAttribute("height")).toBe("315");
    }
  });

  it("keeps the descriptor at or above eleven pixels", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      const { container } = render(<Logo size={size} />);
      const descriptor = container.querySelector(
        ".uppercase",
      ) as HTMLElement | null;
      expect(descriptor, size).toBeTruthy();
      const className = descriptor!.className;
      // 10px small caps were below the size where the label stays readable.
      expect(className, size).not.toMatch(/text-\[(?:[0-9]|10)px\]/);
      expect(className, size).toMatch(/text-\[1[1-9]px\]/);
    }
  });

  it("does not animate or shadow the mark", () => {
    const { container } = render(<Logo />);
    const html = container.innerHTML;
    // A logo that scales on hover reads as a button; hover belongs to the link.
    expect(html).not.toContain("scale-");
    expect(html).not.toContain("drop-shadow");
  });

  it("names itself once, from one element", () => {
    render(<Logo />);
    const named = screen.queryAllByRole("img");
    expect(named).toHaveLength(1);
    // The mark image is decorative: the lockup names itself once, not twice.
    expect(named[0].tagName).toBe("SPAN");
    expect(named[0].getAttribute("aria-label")).toBe(siteConfig.name);
  });

  it("drops the name where a wrapping link already carries it", () => {
    render(<Logo decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it("never renders the long SEO tagline in the lockup", () => {
    render(<Logo />);
    expect(
      screen.queryByText(/Every Trade\. Every Cost\. One Platform\./),
    ).toBeNull();
  });
});

describe("LogoMark", () => {
  it("renders an img element", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("uses the one transparent master on both surfaces", () => {
    for (const variant of ["light", "dark"] as const) {
      const { container } = render(<LogoMark variant={variant} />);
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "/brand/frelux-mark.png",
      );
    }
  });

  it("accepts className", () => {
    const { container } = render(<LogoMark className="my-mark" />);
    expect(container.querySelector(".my-mark")).toBeTruthy();
  });
});
