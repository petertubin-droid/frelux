import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";

function renderComponent(compact = false) {
  return render(
    <MemoryRouter>
      <RelatedToolsLinks compact={compact} />
    </MemoryRouter>,
  );
}

describe("RelatedToolsLinks", () => {
  it("renders Build-to-Roof Estimator link in full mode", () => {
    renderComponent(false);
    expect(screen.getByText("Build-to-Roof Estimator")).toBeTruthy();
  });

  it("renders AI Photo Estimator link in full mode", () => {
    renderComponent(false);
    expect(screen.getByText("AI Photo Estimator")).toBeTruthy();
  });

  it("renders descriptions in full mode", () => {
    renderComponent(false);
    expect(
      screen.getByText(
        "Estimate a full building project from foundation to roof.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Upload a photo and get an AI-powered estimate."),
    ).toBeTruthy();
  });

  it("renders both links in compact mode", () => {
    renderComponent(true);
    const buildLinks = screen.getAllByText("Build-to-Roof Estimator");
    const photoLinks = screen.getAllByText("AI Photo Estimator");
    expect(buildLinks.length).toBeGreaterThanOrEqual(1);
    expect(photoLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("links point to correct routes", () => {
    renderComponent(false);
    const buildLink = screen.getByText("Build-to-Roof Estimator").closest("a");
    const photoLink = screen.getByText("AI Photo Estimator").closest("a");
    expect(buildLink?.getAttribute("href")).toBe("/build-to-roof-estimator");
    expect(photoLink?.getAttribute("href")).toBe("/image-estimator");
  });
});
