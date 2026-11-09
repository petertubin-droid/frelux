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

  it("draws the screen and the panelled wall when the room is given", () => {
    const bare = render(
      <ConsoleElevation layout={layout} depthMm={350} label="Bare" />,
    );
    const bareRects = bare.container.querySelectorAll("svg rect").length;

    const dressed = render(
      <ConsoleElevation
        layout={layout}
        depthMm={350}
        label="Media wall"
        context={{
          tvInches: 65,
          wallTreatment: "fluted",
          wallPanelHeightMm: 1600,
          mounting: "floating",
          ledProfileMetres: 1.8,
        }}
      />,
    );
    // Screen + wall band + flutes are additional rectangles.
    const dressedRects = dressed.container.querySelectorAll("svg rect").length;
    expect(dressedRects).toBeGreaterThan(bareRects + 10);
    // The LED line is drawn, and nothing renders as NaN.
    expect(
      dressed.container.querySelectorAll("svg line").length,
    ).toBeGreaterThan(0);
    expect(dressed.container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("shows a plinth or legs where the unit meets the floor", () => {
    const plinth = render(
      <ConsoleElevation
        layout={layout}
        depthMm={350}
        label="Plinth"
        context={{ mounting: "plinth" }}
      />,
    );
    const legs = render(
      <ConsoleElevation
        layout={layout}
        depthMm={350}
        label="Legs"
        context={{ mounting: "legs" }}
      />,
    );
    // A plinth is one recessed rectangle; an 1800 mm unit stands on two legs,
    // so the leg version carries exactly one more rectangle than the plinth.
    const plinthRects = plinth.container.querySelectorAll("svg rect").length;
    const legsRects = legs.container.querySelectorAll("svg rect").length;
    expect(legsRects).toBe(plinthRects + 1);
    expect(legs.container.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});
