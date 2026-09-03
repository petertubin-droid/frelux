import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ColorSwatch from "@/components/ui/ColorSwatch";

describe("ColorSwatch", () => {
  it("renders with correct background color", () => {
    const { container } = render(<ColorSwatch hex="#FF0000" />);
    const swatch = container.querySelector("span")!;
    expect(swatch.style.backgroundColor.toLowerCase()).toBe("#ff0000");
  });

  it("returns null when hex is empty", () => {
    const { container } = render(<ColorSwatch hex="" />);
    expect(container.firstChild).toBeNull();
  });

  it("applies size classes correctly", () => {
    const sizes = ["xs", "sm", "md", "lg"] as const;
    const sizeClasses = ["h-4 w-4", "h-5 w-5", "h-7 w-7", "h-10 w-10"];
    sizes.forEach((size, i) => {
      const { container } = render(<ColorSwatch hex="#000" size={size} />);
      const swatch = container.querySelector("span")!;
      expect(swatch.className).toContain(sizeClasses[i]);
    });
  });

  it("defaults to sm size", () => {
    const { container } = render(<ColorSwatch hex="#000" />);
    expect(container.querySelector("span")!.className).toContain("h-5 w-5");
  });

  it("shows border ring when showBorder=true", () => {
    const { container } = render(<ColorSwatch hex="#000" showBorder />);
    expect(container.querySelector("span")!.className).toContain("ring-1");
  });

  it("hides border ring when showBorder=false", () => {
    const { container } = render(<ColorSwatch hex="#000" showBorder={false} />);
    expect(container.querySelector("span")!.className).not.toContain("ring-1");
  });

  it("uses name in title and aria-label when provided", () => {
    const { container } = render(<ColorSwatch hex="#FF0000" name="Fire Red" />);
    const swatch = container.querySelector("span")!;
    expect(swatch.getAttribute("title")).toBe("Fire Red");
    expect(swatch.getAttribute("aria-label")).toBe("Color: Fire Red");
  });

  it("uses hex in title and aria-label when no name", () => {
    const { container } = render(<ColorSwatch hex="#FF0000" />);
    const swatch = container.querySelector("span")!;
    expect(swatch.getAttribute("title")).toBe("#FF0000");
    expect(swatch.getAttribute("aria-label")).toBe("Color #FF0000");
  });

  it("applies custom className", () => {
    const { container } = render(
      <ColorSwatch hex="#000" className="my-swatch" />,
    );
    expect(container.querySelector("span")!.className).toContain("my-swatch");
  });
});
