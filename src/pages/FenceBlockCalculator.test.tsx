import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import FenceBlockCalculator from "@/pages/FenceBlockCalculator";

const renderPage = () =>
  render(
    <MemoryRouter>
      <FenceBlockCalculator />
    </MemoryRouter>,
  );

describe("FenceBlockCalculator page", () => {
  it("opens with one page heading and the three inputs", () => {
    renderPage();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent ?? "").toContain("Coach");
    expect(screen.getByText("Land size")).toBeDefined();
    expect(screen.getByLabelText(/Coaches high/)).toBeDefined();
    expect(screen.getByText("Block size")).toBeDefined();
  });

  it("calculates a full plot, five coaches high, in 9 inch blocks", () => {
    renderPage();
    expect(screen.getByText("What to buy")).toBeDefined();
    expect(
      screen.getAllByText((_, node) =>
        Boolean(node?.textContent?.includes("sharp sand")),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("states its assumptions instead of hiding them", () => {
    renderPage();
    expect(screen.getByText("How this was worked out")).toBeDefined();
    expect(
      screen.getByText(/Prices, tax and labour come from the price book/i),
    ).toBeDefined();
  });

  it("answers the long tail questions the page targets", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /How many 6 inch blocks do I need for a 1 plot fence/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /How many bags of cement will plaster a fence wall/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /How many trips of sand does a fence need/i,
      }),
    ).toBeDefined();
  });

  it("switches the block list with the market instead of hiding the choice", () => {
    renderPage();
    const market = screen.getByLabelText("Market") as HTMLSelectElement;
    // Both controls used to write the block: the market select set us-cmu while
    // the radios stayed on the two Nigerian blocks, so no radio was checked.
    expect(screen.getByRole("radio", { name: /9 inch block/i })).toBeDefined();
    fireEvent.change(market, { target: { value: "US" } });
    const cmu = screen.getByRole("radio", { name: /CMU/i }) as HTMLInputElement;
    expect(cmu.checked).toBe(true);
    expect(screen.queryByRole("radio", { name: /9 inch block/i })).toBeNull();
  });

  it("asks for the gate and the foundation it used to ignore", () => {
    renderPage();
    expect(screen.getByLabelText(/Gate width/)).toBeDefined();
    expect(screen.getByLabelText(/Gate height/)).toBeDefined();
    expect(screen.getByLabelText(/Courses below ground/)).toBeDefined();
    expect(screen.getByText(/strip footing concrete/)).toBeDefined();
  });
});
