import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
// The calculator page is subscription-gated; page tests exercise the
// engineering logic, not the paywall, so render children directly.
vi.mock("@/components/subscription/SubscriptionGate", () => ({
  SubscriptionGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/StructuralCalculator")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("StructuralCalculator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows the per-code capacity check on the beam tab after design", async () => {
    await renderPage();
    // Beam tab auto-designs on mount; the authoritative capacity card must
    // appear next to the legacy estimator output with a utilization row.
    expect(
      (await screen.findAllByText(/capacity check/i)).length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByText(/Flexural utilization/i),
    ).toBeInTheDocument();
  });

  it("re-runs the capacity check on the slab tab with a per-metre strip", async () => {
    await renderPage();
    const slabButton = (await screen.findAllByRole("button")).find((b) =>
      b.textContent?.includes("Slab Design"),
    );
    expect(slabButton).toBeTruthy();
    fireEvent.click(slabButton!);
    expect(
      (await screen.findAllByText(/capacity check/i)).length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByText(/Flexural utilization/i),
    ).toBeInTheDocument();
  });
});
