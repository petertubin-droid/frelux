import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
// Entitlement now comes from the server, so the gate is driven by a flag rather
// than a local write. Locked by default; the print test opts in.
let printUnlocked = false;
vi.mock("@/lib/documents/document-access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/documents/document-access")>();
  return {
    ...actual,
    isDocumentPrintUnlocked: () => printUnlocked,
    // canPrintDocument closes over the module's own isDocumentPrintUnlocked, so
    // it has to be stubbed too for the flag to reach the gate.
    canPrintDocument: () => printUnlocked,
  };
});

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import Printables from "@/pages/Printables";

describe("Printables", () => {
  beforeEach(() => {
    // Each test starts locked; the print test opts in explicitly.
    printUnlocked = false;
  });

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
    expect(
      screen.getByRole("dialog", { name: /Document Print Access/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Subscription or One-Time Print Pass Required/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pay-and-print-button")).toBeInTheDocument();
  });

  it("sets body data-printing for the chosen sheet and cleans up after print when unlocked", () => {
    // A verified server pass exists for this document
    printUnlocked = true;

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

  it("does not print from the pay button without a verified payment", async () => {
    // A pass can only be issued by the server after the gateway confirms a
    // payment. With no reference there is nothing to verify, so the document
    // must stay locked and the modal must say so rather than unlocking itself.
    const printSpy = vi.fn();
    window.print = printSpy;

    render(
      <MemoryRouter>
        <Printables />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("print-btn-quote-comparison"));
    fireEvent.click(screen.getByTestId("pay-and-print-button"));

    // The dialog stays open and the document stays locked: no local unlock.
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /Document Print Access/i }),
      ).toBeInTheDocument();
    });
    expect(printSpy).not.toHaveBeenCalled();
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
