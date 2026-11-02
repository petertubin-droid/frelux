import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";

describe("PremiumBadge", () => {
  it("renders a crown icon by default", () => {
    const { container } = render(<PremiumBadge />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("applies size classes correctly", () => {
    const sizes = ["xs", "sm", "md", "lg"] as const;
    const sizeClasses = ["h-3 w-3", "h-4 w-4", "h-6 w-6", "h-10 w-10"];
    sizes.forEach((size, i) => {
      const { container } = render(<PremiumBadge size={size} />);
      const svg = container.querySelector("svg")!;
      expect(svg.className).toContain(sizeClasses[i]);
    });
  });

  it("defaults to sm size", () => {
    const { container } = render(<PremiumBadge />);
    const svg = container.querySelector("svg")!;
    expect(svg.className).toContain("h-4 w-4");
  });

  it("applies glow ring when glow=true", () => {
    const { container } = render(<PremiumBadge glow />);
    const wrapper = container.querySelector("span")!;
    expect(wrapper.className).toContain("ring-1");
    expect(wrapper.className).toContain("ring-amber-500/30");
    expect(wrapper.className).toContain("bg-amber-500/10");
  });

  it("does not apply glow ring when glow=false", () => {
    const { container } = render(<PremiumBadge glow={false} />);
    const wrapper = container.querySelector("span")!;
    expect(wrapper.className).not.toContain("ring-amber");
  });

  it("renders minimal variant with inline-flex", () => {
    const { container } = render(<PremiumBadge minimal />);
    const wrapper = container.querySelector("span")!;
    expect(wrapper.className).toContain("inline-flex");
    expect(wrapper.className).toContain("gap-1");
  });

  it("uses amber color for crown", () => {
    const { container } = render(<PremiumBadge />);
    const svg = container.querySelector("svg")!;
    expect(svg.className).toContain("text-amber-500");
  });

  it("fills the crown icon", () => {
    const { container } = render(<PremiumBadge />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("fill")).toBe("currentColor");
  });

  it("applies custom className", () => {
    const { container } = render(<PremiumBadge className="my-custom" />);
    const wrapper = container.querySelector("span")!;
    expect(wrapper.className).toContain("my-custom");
  });
});
