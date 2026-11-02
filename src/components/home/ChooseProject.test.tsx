import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChooseProject from "@/components/home/ChooseProject";

function renderComponent() {
  return render(
    <MemoryRouter>
      <ChooseProject />
    </MemoryRouter>,
  );
}

describe("ChooseProject", () => {
  it("renders the eight capability pillar cards", () => {
    renderComponent();
    expect(screen.getByText("Painting")).toBeTruthy();
    expect(screen.getByText("Tiles")).toBeTruthy();
    expect(screen.getByText("Screeding")).toBeTruthy();
    expect(screen.getByText("Build-to-Roof Estimator")).toBeTruthy();
    expect(screen.getByText("BOQ Generator")).toBeTruthy();
    expect(screen.getByText("AI Photo Estimator")).toBeTruthy();
    expect(screen.getByText("Smart Calculator")).toBeTruthy();
    expect(screen.getByText("Solar PV Estimator")).toBeTruthy();
  });

  it("renders project descriptions", () => {
    renderComponent();
    expect(screen.getByText(/Calculate paint quantities/)).toBeTruthy();
    expect(screen.getByText(/Estimate tile count/)).toBeTruthy();
    expect(screen.getByText(/foundation to roof/)).toBeTruthy();
    expect(screen.getByText(/plain language/)).toBeTruthy();
  });

  it("renders links to correct routes", () => {
    renderComponent();
    const paintLink = screen.getByText("Painting").closest("a");
    expect(paintLink?.getAttribute("href")).toBe("/paint-calculator");
    const tileLink = screen.getByText("Tiles").closest("a");
    expect(tileLink?.getAttribute("href")).toBe("/tile-calculator");
    const btrLink = screen.getByText("Build-to-Roof Estimator").closest("a");
    expect(btrLink?.getAttribute("href")).toBe("/build-to-roof-estimator");
    const aiLink = screen.getByText("AI Photo Estimator").closest("a");
    expect(aiLink?.getAttribute("href")).toBe("/image-estimator");
    const boqLink = screen.getByText("BOQ Generator").closest("a");
    expect(boqLink?.getAttribute("href")).toBe("/boq-generator");
    const solarLink = screen.getByText("Solar PV Estimator").closest("a");
    expect(solarLink?.getAttribute("href")).toBe("/solar-pv-estimator");
  });
});
