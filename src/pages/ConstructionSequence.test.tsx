import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user" },
    isAdmin: true,
    isPaid: true,
    loading: false,
  })),
}));

vi.mock("@/components/subscription/SubscriptionGate", () => ({
  SubscriptionGate: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
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
  const Comp = (await import("@/pages/ConstructionSequence")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ConstructionSequence", () => {
  it("renders without crashing and displays DAG parallel metrics", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
    expect(screen.getByText(/Parallel duration/i)).toBeDefined();
    expect(screen.getByText(/Sequential duration/i)).toBeDefined();
    expect(screen.getByText(/Peak concurrency/i)).toBeDefined();
  });

  it("switches between DAG Graph, Parallel Waves, and Step List views", async () => {
    await renderPage();

    const dagBtn = screen.getByRole("button", { name: /DAG Network Graph/i });
    const wavesBtn = screen.getByRole("button", {
      name: /Parallel Execution Waves/i,
    });
    const listBtn = screen.getByRole("button", {
      name: /Sequential Step List/i,
    });

    expect(dagBtn).toBeDefined();
    expect(wavesBtn).toBeDefined();
    expect(listBtn).toBeDefined();

    // Switch to Waves view
    fireEvent.click(wavesBtn);
    expect(screen.getByText(/Parallel execution waves:/i)).toBeDefined();

    // Switch to List view
    fireEvent.click(listBtn);
    expect(screen.getByText(/Construction Stages/i)).toBeDefined();
    expect(screen.getByText(/Quality Gates/i)).toBeDefined();

    // Switch back to DAG view
    fireEvent.click(dagBtn);
    expect(screen.getByText(/Interactive DAG Network Graph/i)).toBeDefined();
  });

  it("advances simulation wave when Step Wave is clicked", async () => {
    await renderPage();
    const stepBtn = screen.getByRole("button", { name: /Step wave/i });
    expect(stepBtn).toBeDefined();

    fireEvent.click(stepBtn);
    expect(screen.getByText(/1 of/i)).toBeDefined();
  });
});
