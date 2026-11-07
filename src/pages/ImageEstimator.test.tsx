import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { EstimateResultView } from "@/pages/ImageEstimator";
import type { BuildToRoofResult } from "@/types/build-to-roof";

vi.mock("@/components/calculators/SaveToProjectButton", () => ({
  default: () => null,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
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

describe("ImageEstimator", () => {
  it("module exports something", async () => {
    const mod = await import("@/pages/ImageEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("shows the complete source photo before any estimate totals", () => {
    const estimate = {
      project_name: "Test building",
      location: "Lagos",
      building_type: "bungalow",
      total_floor_area: 120,
      confidence: "moderate",
      stages: [],
      materials_total: 100,
      labour_total: 50,
      contingency: 15,
      grand_total: 165,
      limitations: [],
    } as unknown as BuildToRoofResult;
    const { container } = render(
      <EstimateResultView
        estimate={estimate}
        analysis={null}
        buildingPhoto="data:image/jpeg;base64,full-image"
        savedId={null}
        onEdit={() => {}}
        isPaid={false}
        pdfGateOpen={false}
        pdfUnlocked={false}
        setPdfGateOpen={() => {}}
        setPdfUnlocked={() => {}}
      />,
    );

    const photoPanel = container.querySelector(
      '[data-testid="estimate-source-photo"]',
    );
    const photo = photoPanel?.querySelector("img");
    const total = container.querySelector('[data-testid="estimate-total"]');
    expect(photo).toHaveAttribute("src", "data:image/jpeg;base64,full-image");
    expect(photo).toHaveClass("object-contain");
    expect(
      Boolean(
        photoPanel &&
          total &&
          (photoPanel.compareDocumentPosition(total) &
            Node.DOCUMENT_POSITION_FOLLOWING),
      ),
    ).toBe(true);
  });
});


describe("describeVisionFailure", () => {
  it("never claims the service is undeployed", async () => {
    const { describeVisionFailure } = await import("@/pages/ImageEstimator");
    for (const body of [
      null,
      { code: "AI_BUSY" },
      { code: "INTERNAL_ERROR", error: "Gemini API error: 400" },
    ]) {
      expect(describeVisionFailure(body)).not.toMatch(/not yet deployed/i);
    }
  });

  it("maps known codes to actionable messages", async () => {
    const { describeVisionFailure } = await import("@/pages/ImageEstimator");
    expect(describeVisionFailure({ code: "AI_BUSY" })).toMatch(/busy/i);
    expect(describeVisionFailure({ code: "USAGE_LIMIT_REACHED" })).toMatch(
      /tomorrow/i,
    );
    expect(describeVisionFailure({ code: "NO_API_KEY" })).toMatch(
      /not configured/i,
    );
    expect(describeVisionFailure(null)).toMatch(/reach/i);
  });

  it("passes through the refusal reasons for unpriced markets and unusable photos", async () => {
    const { describeVisionFailure } = await import("@/pages/ImageEstimator");
    expect(
      describeVisionFailure({
        code: "PRICE_NOT_DETERMINED",
        error:
          "Photo estimation cannot price this market: only the Nigerian price book is configured here.",
      }),
    ).toMatch(/only the Nigerian price book/i);
    expect(
      describeVisionFailure({
        code: "NO_USABLE_DIMENSIONS",
        error: "The photo did not give a usable building dimension.",
      }),
    ).toMatch(/usable building dimension/i);
  });
});
