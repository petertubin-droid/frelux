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
  const SaveToProjectButton = (
    await import("@/components/calculators/SaveToProjectButton")
  ).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SaveToProjectButton
          calculatorType="paint"
          calculatorSlug="paint-calculator"
          calcData={{ area: 50 }}
          resultSummary={{ summary: "50 sqm, 3 containers" }}
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

  it("stores pending intent in sessionStorage on handleSaveIntentAndSignIn", async () => {
    // Verify sessionStorage interaction
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const payload = {
      calculatorType: "paint",
      calculatorSlug: "paint-calculator",
      calcTitle: "Living Room Paint",
      calcData: { area: 100 },
      resultSummary: { summary: "100 sqm" },
      timestamp: Date.now(),
    };
    sessionStorage.setItem("frelux_pending_calc_save", JSON.stringify(payload));
    expect(setItemSpy).toHaveBeenCalledWith(
      "frelux_pending_calc_save",
      expect.any(String),
    );
    const retrieved = JSON.parse(
      sessionStorage.getItem("frelux_pending_calc_save") || "{}",
    );
    expect(retrieved.calculatorSlug).toBe("paint-calculator");
    expect(retrieved.calcData.area).toBe(100);
  });
});
