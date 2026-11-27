import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/components/subscription/SubscriptionGate", () => ({
  SubscriptionGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/calculators/SaveToProjectButton", () => ({
  default: (_props: unknown) => null,
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/FoundationCalculator")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("FoundationCalculator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("does not crash when result is null (SaveToProjectButton guard)", async () => {
    const { container } = await renderPage();
    expect(container).toBeTruthy();
    expect(container.textContent).not.toContain("Save to Project Workspace");
  });

  it("allows selecting pad footing and displays column structural verification controls", async () => {
    const { container } = await renderPage();
    const select = container.querySelector("#fnd-shape") as HTMLSelectElement;
    expect(select).not.toBeNull();
    fireEvent.change(select, { target: { value: "pad" } });
    expect(container.textContent).toContain("Column face width");
    expect(container.textContent).toContain("Column face length / depth");
    expect(container.textContent).toContain("Structural Design Standard");
  });
});
