import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock achievements
vi.mock("@/lib/achievements", () => ({
  trackShare: vi.fn(),
}));

// Mock window.open
const mockOpen = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  global.window.open = mockOpen;
});

describe("share utilities", () => {
  it("shareTextOnWhatsApp opens wa.me link", async () => {
    const { shareTextOnWhatsApp } = await import("@/lib/share");
    shareTextOnWhatsApp("Hello world");
    expect(mockOpen).toHaveBeenCalled();
    const url = mockOpen.mock.calls[0][0] as string;
    expect(url).toContain("wa.me");
    expect(url).toContain("Hello%20world");
  });

  it("sharePaintCalcOnWhatsApp encodes message", async () => {
    const { sharePaintCalcOnWhatsApp } = await import("@/lib/share");
    const mockResult = {
      paintableArea: 100,
      adjustedLiters: 15,
      totalRecommendedLiters: 18,
      recommendedContainers: [{ count: 4, size: 4, label: "4 L" }],
    };
    const mockInput = {
      projectType: "room",
      coats: 2,
      wasteMargin: 10,
    };
    sharePaintCalcOnWhatsApp({
      result: mockResult as never,
      input: mockInput as never,
      paintTypeName: "Premium",
    });
    expect(mockOpen).toHaveBeenCalled();
    const url = mockOpen.mock.calls[0][0] as string;
    expect(url).toContain("wa.me");
    expect(url).toContain("FRELUX");
  });

  it("shareCostEstimateOnWhatsApp encodes message", async () => {
    const { shareCostEstimateOnWhatsApp } = await import("@/lib/share");
    const mockResult = {
      paintCost: 50000,
      primerCost: 5000,
      laborCost: 20000,
      total: 75000,
      currencySymbol: "₦",
    };
    const mockInput = {
      projectType: "room",
      paintableArea: 100,
    };
    shareCostEstimateOnWhatsApp({
      result: mockResult as never,
      input: mockInput as never,
      paintTypeName: "Premium",
    });
    expect(mockOpen).toHaveBeenCalled();
    const url = mockOpen.mock.calls[0][0] as string;
    expect(url).toContain("wa.me");
  });
});
