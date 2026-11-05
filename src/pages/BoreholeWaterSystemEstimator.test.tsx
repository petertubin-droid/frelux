import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/tools/BoreholeWaterSystemAnimation", () => ({
  default: () => null,
}));

import BoreholeWaterSystemEstimator from "@/pages/BoreholeWaterSystemEstimator";
import { publishEntitlement, resetEntitlement } from "@/lib/entitlement-store";

const norm = (value?: string | null) => (value ?? "").replace(/\u00a0/g, " ");
const hasText = (needle: string) =>
  screen.queryAllByText((_, node) => norm(node?.textContent).includes(needle))
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
    expect(hasText("iron tank stand")).toBe(true);
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
  it("answers the long tail questions on the page itself", () => {
    renderPage();
    expect(hasText("Borehole, pump and tank stand questions")).toBe(true);
    expect(hasText("What pump horsepower (HP) do I need")).toBe(true);
    expect(hasText("How many lengths of casing pipe")).toBe(true);
  });

  it("names the pump horsepower output in the hydraulic card", () => {
    renderPage();
    expect(hasText("Pump horsepower (HP)")).toBe(true);
  });

  it("offers the directory hand off without inventing professionals", async () => {
    renderPage();
    expect(hasText("Need a professional to drill or plumb this?")).toBe(true);
    expect(await screen.findByText(/Nobody is listed in NG/i)).toBeTruthy();
  });
});

describe("BoreholeWaterSystemEstimator subscription gate", () => {
  afterEach(() => {
    resetEntitlement();
  });

  it("cuts the takeoff and the CSV export for a free visitor", () => {
    publishEntitlement({ isPaid: false, isAdmin: false });
    renderPage();
    expect(hasText("more lines on a plan")).toBe(true);
    const csv = screen.getByRole("button", {
      name: /Download Full Engineering Takeoff CSV/i,
    }) as HTMLButtonElement;
    expect(csv.disabled).toBe(true);
    expect(hasText("CSV export is part of a plan")).toBe(true);
  });

  it("shows the whole takeoff and the export to a paying visitor", () => {
    publishEntitlement({ isPaid: true, isAdmin: false });
    renderPage();
    expect(hasText("more lines on a plan")).toBe(false);
    const csv = screen.getByRole("button", {
      name: /Download Full Engineering Takeoff CSV/i,
    }) as HTMLButtonElement;
    expect(csv.disabled).toBe(false);
  });
});
