import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReinforcementEstimator from "./ReinforcementEstimator";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

describe("ReinforcementEstimator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("module imports and exports a component", async () => {
    const mod = await import("@/pages/ReinforcementEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });

  it("restores saved draft from localStorage and allows start fresh reset", async () => {
    localStorage.setItem(
      "frelux_draft_reinforcement_estimator",
      JSON.stringify({
        data: {
          lens: {
            len_12mm_m: "120",
            len_16mm_m: "240",
            len_20mm_m: "60",
            len_25mm_m: "",
          },
          labourMode: "per_tonne",
          labourRate: "45000",
        },
        savedAt: new Date().toISOString(),
      }),
    );

    render(
      <MemoryRouter>
        <ReinforcementEstimator />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/restored your previous reinforcement calculation draft/i),
      ).toBeDefined();
    });

    const startFresh = screen.getByText("Start fresh");
    expect(startFresh).toBeDefined();
    fireEvent.click(startFresh);

    await waitFor(() => {
      expect(
        screen.queryByText(/restored your previous reinforcement calculation draft/i),
      ).toBeNull();
    });
  });
});
