import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderButton() {
  const SaveToProjectButton = (await import("@/components/calculators/SaveToProjectButton")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SaveToProjectButton
          calculatorType="paint"
          calculatorSlug="paint-calculator"
          calcData={{ area: 50 }}
          calcSummary="50 sqm, 3 containers"
        />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("SaveToProjectButton", () => {
  it("renders without crashing", async () => {
    const { container } = await renderButton();
    expect(container.innerHTML).not.toBe("");
  });
});
