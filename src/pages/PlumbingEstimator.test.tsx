import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlumbingEstimator from "./PlumbingEstimator";

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

describe("PlumbingEstimator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("module imports and exports a component", async () => {
    const mod = await import("@/pages/PlumbingEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });

  it("restores saved draft from localStorage and allows start fresh reset", async () => {
    localStorage.setItem(
      "frelux_draft_plumbing_estimator",
      JSON.stringify({
        data: {
          counts: {
            taps: "12",
            wcs: "4",
            showers: "3",
            sinks: "4",
            floor_drains: "3",
            water_storage_tanks: "2",
            pumps: "2",
          },
          runs: {
            cold_run_m: "50",
            hot_run_m: "30",
            waste_run_m: "25",
            drainage_run_m: "40",
          },
          labourMode: "lump_sum",
          labourRate: "50000",
        },
        savedAt: new Date().toISOString(),
      }),
    );

    render(
      <MemoryRouter>
        <PlumbingEstimator />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/restored your previous plumbing calculation draft/i),
      ).toBeDefined();
    });

    const startFresh = screen.getByText("Start fresh");
    expect(startFresh).toBeDefined();
    fireEvent.click(startFresh);

    await waitFor(() => {
      expect(
        screen.queryByText(/restored your previous plumbing calculation draft/i),
      ).toBeNull();
    });
  });
});
