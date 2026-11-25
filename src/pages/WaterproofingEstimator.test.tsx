import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import WaterproofingEstimator from "@/pages/WaterproofingEstimator";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WaterproofingEstimator", () => {
  it("module imports and exports a component", async () => {
    const mod = await import("@/pages/WaterproofingEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });

  it("renders the waterproofing calculation guide block", () => {
    render(
      <MemoryRouter>
        <WaterproofingEstimator />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Waterproofing, DPC, DPM and membrane calculation guide/i,
      }),
    ).toBeDefined();
  });
});
