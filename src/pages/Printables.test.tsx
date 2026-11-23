import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { recordPrintPassUnlock } from "@/lib/documents/document-access";

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import Printables from "@/pages/Printables";

describe("Printables", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it("keeps each template table reachable in a keyboard-scrollable region", () => {
    const { container } = render(
      <MemoryRouter>
        <Printables />
      </MemoryRouter>,
    );
    const regions = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[role="region"][aria-label^="Scrollable "]',
      ),
    );

    expect(regions.map((region) => region.getAttribute("aria-label"))).toEqual([
      "Scrollable quote comparison template",
      "Scrollable paint schedule template",
      "Scrollable material checklist template",
    ]);
    for (const region of regions) {
      expect(region.tabIndex).toBe(0);
      expect(region.className).toContain("overflow-x-auto");
      expect(region.querySelector("table")?.className).toContain(
        "print:min-w-0",
      );
    }
  });

  it("prompts the $1.09 print paywall when non-subscribed user clicks print", () => {
    render(
      <MemoryRouter>
        <Printables />
      </MemoryRouter>,
    );
    // Non-subscribed user clicks print on sheet
    const btn = screen.getByTestId("print-btn-quote-comparison");
    fireEvent.click(btn);

    // Should open the print paywall dialog
    expect(screen.getByRole("dialog", { name: /Document Print Access/i })).toBeInTheDocument();
    expect(screen.getByText(/Subscription or One-Time Print Pass Required/i)).toBeInTheDocument();
    expect(screen.getByTestId("pay-and-print-button")).toBeInTheDocument();
  });

  it("sets body data-printing for the chosen sheet and cleans up after print when unlocked", () => {
    // Unlock document with a one-time print pass
    recordPrintPassUnlock({
      documentId: "quote-comparison",
      currency: "USD",
      amount: 1.09,
    });

    const printSpy = vi.fn();
    window.print = printSpy;
    const afterPrintHandlers: EventListener[] = [];
    const origAdd = window.addEventListener;
    const addSpy = vi.fn((...args: unknown[]) => {
      if (args[0] === "afterprint")
        afterPrintHandlers.push(args[1] as EventListener);
      return () => undefined;
    });
    window.addEventListener =
      addSpy as unknown as typeof window.addEventListener;
    try {
      render(
        <MemoryRouter>
          <Printables />
        </MemoryRouter>,
      );
      const btn = screen.getByTestId("print-btn-quote-comparison");
      fireEvent.click(btn);
      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(document.body.dataset.printing).toBe("quote-comparison");
      afterPrintHandlers.forEach((h) => h(new Event("afterprint")));
      expect(document.body.dataset.printing).toBeUndefined();
    } finally {
      window.addEventListener = origAdd;
    }
  });

  it("allows paying $1.09 one-time print pass in modal to trigger print", async () => {
    const printSpy = vi.fn();
    window.print = printSpy;

    render(
      <MemoryRouter>
        <Printables />
      </MemoryRouter>,
    );

    const btn = screen.getByTestId("print-btn-quote-comparison");
    fireEvent.click(btn);

    // Click pay and print
    const payBtn = screen.getByTestId("pay-and-print-button");
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(printSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("renders screen protection wrapper and security status", () => {
    render(
      <MemoryRouter>
        <Printables />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("screen-protection-wrapper")).toBeInTheDocument();
    expect(screen.getByText(/Protected Document View/i)).toBeInTheDocument();
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
