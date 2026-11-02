import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RelatedCalculators from "@/components/ui/RelatedCalculators";

function renderComponent(props?: {
  links?: { label: string; description: string; to: string }[];
  title?: string;
}) {
  const defaultLinks = [
    { label: "Paint Calculator", description: "Calculate paint", to: "/paint-calculator" },
    { label: "Tile Calculator", description: "Calculate tiles", to: "/tile-calculator" },
    { label: "Cost Estimator", description: "Estimate costs", to: "/cost-estimator" },
  ];
  return render(
    <MemoryRouter>
      <RelatedCalculators links={props?.links ?? defaultLinks} title={props?.title} />
    </MemoryRouter>,
  );
}

describe("RelatedCalculators", () => {
  it("renders default title", () => {
    renderComponent();
    expect(screen.getByText("Related Calculators")).toBeTruthy();
  });

  it("renders custom title", () => {
    renderComponent({ title: "You might also like" });
    expect(screen.getByText("You might also like")).toBeTruthy();
  });

  it("renders all links", () => {
    renderComponent();
    expect(screen.getByText("Paint Calculator")).toBeTruthy();
    expect(screen.getByText("Tile Calculator")).toBeTruthy();
    expect(screen.getByText("Cost Estimator")).toBeTruthy();
  });

  it("renders descriptions", () => {
    renderComponent();
    expect(screen.getByText("Calculate paint")).toBeTruthy();
    expect(screen.getByText("Calculate tiles")).toBeTruthy();
  });

  it("renders 'Open' label for each link", () => {
    renderComponent();
    const openLabels = screen.getAllByText("Open");
    expect(openLabels.length).toBe(3);
  });

  it("returns null when links array is empty", () => {
    const { container } = render(
      <MemoryRouter>
        <RelatedCalculators links={[]} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
  });
});
