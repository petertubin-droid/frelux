import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import AdminMacroTracker from "./AdminMacroTracker";

function renderPage() {
  return render(
    <ToastProvider>
      <AdminMacroTracker />
    </ToastProvider>,
  );
}

describe("AdminMacroTracker Page", () => {
  it("renders System A Fluctuation Filter and simulation sandbox", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /The Fluctuation Filter \(Macro Tracker\)/,
      }),
    ).toBeDefined();
    expect(screen.getByText("System A")).toBeDefined();
    expect(screen.getByText("Simulate Economic Shocks")).toBeDefined();

    await waitFor(() => {
      expect(
        screen.getByText(/Central Bank & Commodity Baseline Feeds \(Kenya\)/i),
      ).toBeDefined();
    });
  });

  it("switches markets via chips and updates heading", async () => {
    renderPage();

    const ngChip = screen.getByText("NG");
    fireEvent.click(ngChip);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Central Bank & Commodity Baseline Feeds \(Nigeria\)/i,
        ),
      ).toBeDefined();
    });
  });

  it("renders Add Indicator and Add Rule buttons", async () => {
    renderPage();

    expect(screen.getByText("Add Indicator")).toBeDefined();
    expect(screen.getByText("Add Rule")).toBeDefined();
  });
});
