import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/ai-credit-gate", () => ({
  spendAiCredits: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/queries", () => ({
  saveAdvancedEstimate: vi.fn().mockResolvedValue({ data: null, error: null }),
  fetchAdvancedEstimates: vi.fn().mockResolvedValue({ data: [], error: null }),
  deleteAdvancedEstimate: vi
    .fn()
    .mockResolvedValue({ data: null, error: null }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderCalc() {
  const { AdvancedCalculator } =
    await import("@/components/rewarded/AdvancedCalculator");
  return render(
    <MemoryRouter>
      <AdvancedCalculator
        contextSummary="Area: 50 sqm, Paint: 3 containers"
        clientHash="test-hash-123"
      />
    </MemoryRouter>,
  );
}

describe("AdvancedCalculator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderCalc();
    expect(container.innerHTML).not.toBe("");
  });
});
