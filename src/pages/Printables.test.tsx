import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import Printables from "@/pages/Printables";

describe("Printables", () => {
  it("renders all three sheet cards", () => {
    render(
      <MemoryRouter>
        <Printables />
      </MemoryRouter>,
    );
    expect(
      screen.getAllByText("Quote Comparison Sheet").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Paint Project Schedule").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Material Shopping Checklist").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("sets body data-printing for the chosen sheet and cleans up after print", () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    const afterPrintHandlers: EventListener[] = [];
    const origAdd = window.addEventListener;
    window.addEventListener = vi.fn((type: string, listener: EventListener) => {
      if (type === "afterprint") afterPrintHandlers.push(listener);
      return () => undefined;
    });
    try {
      render(
        <MemoryRouter>
          <Printables />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getAllByText("Print")[0]);
      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(document.body.dataset.printing).toBe("quote-comparison");
      afterPrintHandlers.forEach((h) => h(new Event("afterprint")));
      expect(document.body.dataset.printing).toBeUndefined();
    } finally {
      window.addEventListener = origAdd;
    }
  });

  it("opens and closes a preview dialog", () => {
    render(
      <MemoryRouter>
        <Printables />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Preview Paint Project Schedule/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /Preview: Paint Project Schedule/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close preview"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
