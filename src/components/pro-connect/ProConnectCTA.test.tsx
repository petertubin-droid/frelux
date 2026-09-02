import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProConnectCTA from "@/components/pro-connect/ProConnectCTA";

function renderComponent(props: { calculatorType: string; className?: string }) {
  return render(
    <MemoryRouter>
      <ProConnectCTA {...props} />
    </MemoryRouter>,
  );
}

describe("ProConnectCTA", () => {
  it("renders painter CTA for paint type", () => {
    renderComponent({ calculatorType: "paint" });
    expect(screen.getByText("Need a professional painter?")).toBeTruthy();
    expect(screen.getByText("Find Painters")).toBeTruthy();
  });

  it("renders painter CTA for painting type", () => {
    renderComponent({ calculatorType: "painting" });
    expect(screen.getByText("Need a professional painter?")).toBeTruthy();
  });

  it("renders tiler CTA for tile type", () => {
    renderComponent({ calculatorType: "tile" });
    expect(screen.getByText("Need a professional tiler?")).toBeTruthy();
    expect(screen.getByText("Find Tilers")).toBeTruthy();
  });

  it("renders screeding CTA for screeding type", () => {
    renderComponent({ calculatorType: "screeding" });
    expect(screen.getByText("Need a screeding professional?")).toBeTruthy();
  });

  it("renders POP installer CTA for pop type", () => {
    renderComponent({ calculatorType: "pop" });
    expect(screen.getByText("Need a POP installer?")).toBeTruthy();
  });

  it("renders generic CTA for finish type", () => {
    renderComponent({ calculatorType: "finish" });
    expect(
      screen.getByText("Need professionals for this project?"),
    ).toBeTruthy();
  });

  it("returns null for unknown calculator type", () => {
    const { container } = renderComponent({ calculatorType: "unknown" });
    expect(container.innerHTML).toBe("");
  });

  it("links to correct pro-connect category", () => {
    renderComponent({ calculatorType: "paint" });
    const link = screen.getByText("Find Painters").closest("a");
    expect(link?.getAttribute("href")).toContain("category=painters");
  });
});
