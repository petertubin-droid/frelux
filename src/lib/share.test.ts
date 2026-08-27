import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock achievements tracker
vi.mock("@/lib/achievements", () => ({
  trackShare: vi.fn(() => []),
}));

// Mock window.open
const openSpy = vi.fn();
Object.defineProperty(window, "open", { value: openSpy, writable: true });

const {
  sharePaintCalcOnWhatsApp,
  shareCostEstimateOnWhatsApp,
  shareTextOnWhatsApp,
} = await import("./share");
const { trackShare } = await import("@/lib/achievements");

describe("share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shareTextOnWhatsApp opens WhatsApp URL", () => {
    shareTextOnWhatsApp("Hello test");
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("wa.me");
    expect(url).toContain("Hello%20test");
    expect(trackShare).toHaveBeenCalled();
  });

  it("sharePaintCalcOnWhatsApp opens WhatsApp URL with formatted message", () => {
    sharePaintCalcOnWhatsApp({
      result: {
        paintableArea: 50,
        adjustedLiters: 10,
        totalRecommendedLiters: 12,
        recommendedContainers: [{ count: 2, size: 5 }],
      } as any,
      input: {
        projectType: "room",
        coats: 2,
        wasteMargin: 10,
        paintableArea: 50,
      } as any,
      paintTypeName: "Satin",
    });
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("wa.me");
    expect(trackShare).toHaveBeenCalled();
  });

  it("shareCostEstimateOnWhatsApp opens WhatsApp URL with formatted message", () => {
    shareCostEstimateOnWhatsApp({
      result: {
        paintCost: 5000,
        primerCost: 0,
        fillerCost: 0,
        puttyCost: 0,
        sandpaperCost: 0,
        brushesCost: 200,
        rollersCost: 0,
        otherMaterialsCost: 0,
        laborCost: 0,
        total: 5200,
        currencySymbol: "₦",
      } as any,
      input: {
        projectType: "room",
        paintableArea: 50,
      } as any,
      paintTypeName: "Emulsion",
    });
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("wa.me");
    expect(trackShare).toHaveBeenCalled();
  });
});
