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
vi.mock("@/lib/queries", () => ({
  fetchPopMaterials: vi.fn().mockResolvedValue({ data: [] }),
  fetchPopWorkflows: vi.fn().mockResolvedValue({ data: [] }),
  fetchSiteSettings: vi.fn().mockResolvedValue({ data: null }),
  logAnalyticsEvent: vi.fn(),
  saveUserProject: vi.fn(),
}));

import PopCeilingCalculator from "@/pages/PopCeilingCalculator";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PopCeilingCalculator", () => {
  it("module exports something", async () => {
    const mod = await import("@/pages/PopCeilingCalculator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("renders the POP ceiling calculation guide block", async () => {
    render(
      <MemoryRouter>
        <PopCeilingCalculator />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /POP ceiling and gypsum plasterboard material calculation guide/i,
      }),
    ).toBeDefined();
  });
});
