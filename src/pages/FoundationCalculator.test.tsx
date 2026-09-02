import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/components/calculators/SaveToProjectButton", () => ({
  default: (props: any) => null,
}));

beforeEach(() => { vi.clearAllMocks(); });

async function renderPage() {
  const Comp = (await import("@/pages/FoundationCalculator")).default;
  return render(<MemoryRouter><ToastProvider><Comp /></ToastProvider></MemoryRouter>);
}

describe("FoundationCalculator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("does not crash when result is null (SaveToProjectButton guard)", async () => {
    // On initial render, result is null - the guard should prevent accessing result.shape
    const { container } = await renderPage();
    expect(container).toBeTruthy();
    // Should not contain "Save to Project Workspace" when no result
    expect(container.textContent).not.toContain("Save to Project Workspace");
  });
});
