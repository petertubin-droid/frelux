import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/ai-credit-gate", () => ({
  spendAiCredits: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderCalc() {
  const { AdvancedCalculator } = await import("@/components/rewarded/AdvancedCalculator");
  return render(
    <MemoryRouter>
      <AdvancedCalculator contextSummary="Area: 50 sqm, Paint: 3 containers" />
    </MemoryRouter>,
  );
}

describe("AdvancedCalculator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderCalc();
    expect(container.innerHTML).not.toBe("");
  });
});
