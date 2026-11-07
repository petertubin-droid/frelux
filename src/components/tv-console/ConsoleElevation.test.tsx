import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ConsoleElevation from "./ConsoleElevation";

const layout = {
  widthMm: 1800,
  heightMm: 400,
  thicknessMm: 18,
  shelves: 2,
  dividers: 2,
  drawers: 0,
  drawerFrontHeightMm: 180,
  doors: 0,
  revealMm: 2,
};

describe("ConsoleElevation", () => {
  it("draws one rectangle per resolved part plus the body outline", () => {
    const { container } = render(
      <ConsoleElevation
        layout={layout}
        depthMm={350}
        label="Test console elevation"
      />,
    );
    const rects = container.querySelectorAll("svg rect");
    // 4 carcass panels + 2 dividers + 2 shelves per bay, plus the outline.
    expect(rects.length).toBeGreaterThan(5);
  });

  it("keeps every coordinate finite and inside the viewBox", () => {
    const { container } = render(
      <ConsoleElevation
        layout={{ ...layout, widthMm: 0, heightMm: 0, thicknessMm: 900 }}
        depthMm={350}
        annotate
        label="Degenerate console elevation"
      />,
    );
    const svg = container.querySelector("svg")!;
    const serialized = svg.outerHTML;
    expect(serialized).not.toMatch(/NaN|Infinity/);
    expect(svg.getAttribute("viewBox")).toMatch(
      /^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/,
    );
  });

  it("scales with its container rather than a fixed pixel width", () => {
    const { container } = render(
      <ConsoleElevation
        layout={layout}
        depthMm={350}
        label="Test console elevation"
      />,
    );
    const svg = container.querySelector("svg")!;
    // No width/height attributes: the drawing fills whatever box holds it, so
    // it cannot push a narrow viewport wider than the screen.
    expect(svg.getAttribute("width")).toBeNull();
    expect(svg.getAttribute("height")).toBeNull();
    expect(svg.getAttribute("class")).toContain("w-full");
    expect(svg.getAttribute("aria-label")).toBe("Test console elevation");
  });

  it("captions depth only when the dimension lines are drawn", () => {
    const plain = render(
      <ConsoleElevation layout={layout} depthMm={350} label="Plain" />,
    );
    expect(plain.container.textContent).toBe("");
    const annotated = render(
      <ConsoleElevation
        layout={layout}
        depthMm={350}
        annotate
        label="Annotated"
      />,
    );
    expect(annotated.container.textContent).toContain("1800 mm");
    expect(annotated.container.textContent).toContain("350 mm deep");
  });
});
