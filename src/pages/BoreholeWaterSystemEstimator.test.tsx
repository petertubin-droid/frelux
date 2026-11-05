import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/tools/BoreholeWaterSystemAnimation", () => ({
  default: () => null,
}));

import BoreholeWaterSystemEstimator from "@/pages/BoreholeWaterSystemEstimator";

const norm = (value?: string | null) => (value ?? "").replace(/\u00a0/g, " ");
const hasText = (needle: string) =>
  screen.getAllByText((_, node) => norm(node?.textContent).includes(needle))
    .length > 0;

const renderPage = () =>
  render(
    <MemoryRouter>
      <BoreholeWaterSystemEstimator />
    </MemoryRouter>,
  );

describe("BoreholeWaterSystemEstimator tank stand", () => {
  it("shows the stand under the tank it sized", () => {
    renderPage();
    expect(hasText("Tank Stand")).toBe(true);
    expect(hasText("Loaded mass")).toBe(true);
    expect(hasText("Footing pads")).toBe(true);
    expect(hasText("Bearing pressure")).toBe(true);
  });

  it("quotes blockwork piers by default and switches structure on request", () => {
    renderPage();
    const blockwork = screen.getByRole("button", { name: "Blockwork" });
    expect(blockwork.getAttribute("aria-pressed")).toBe("true");
    expect(hasText("Blocks")).toBe(true);
    expect(hasText("Cement")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Steel" }));
    expect(
      screen
        .getByRole("button", { name: "Steel" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(hasText("Anchor bolts")).toBe(true);
  });

  it("keeps the engineer caveat visible", () => {
    renderPage();
    expect(
      hasText("must be checked by a licensed engineer before it carries water"),
    ).toBe(true);
  });

  it("lets the builder set the market, the ground and the pier count", () => {
    renderPage();
    expect(screen.getByLabelText("Ground type")).toBeDefined();
    expect(screen.getByLabelText("Tested soil bearing capacity")).toBeDefined();
    expect(screen.getByLabelText("Stand market")).toBeDefined();

    const four = screen.getByRole("button", { name: "4" });
    expect(four.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "6" }));
    expect(
      screen.getByRole("button", { name: "6" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("merges the stand quantities into the bill of quantities", () => {
    renderPage();
    expect(hasText("Tank stand piers")).toBe(true);
    expect(hasText("Pad footing concrete")).toBe(true);
    expect(hasText("Platform ring beam concrete")).toBe(true);
  });

  it("shows the tank size it is standing on, and the wind safety factor", () => {
    renderPage();
    expect(hasText("Tank shell")).toBe(true);
    expect(hasText("Platform")).toBe(true);
    expect(hasText("Wind safety")).toBe(true);
  });
});
