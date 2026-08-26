import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shareTextOnWhatsApp,
  sharePaintCalcOnWhatsApp,
  shareCostEstimateOnWhatsApp,
} from "@/lib/share";

// Mock window.open
let openUrl: string | null = null;
beforeEach(() => {
  openUrl = null;
  vi.stubGlobal("open", (url: string) => {
    openUrl = url;
  });
});

describe("share — shareTextOnWhatsApp", () => {
  it("opens WhatsApp with encoded text", () => {
    shareTextOnWhatsApp("Hello, I need a quote");
    expect(openUrl).not.toBeNull();
    expect(openUrl).toContain("https://wa.me/?text=");
    expect(openUrl).toContain(encodeURIComponent("Hello, I need a quote"));
  });

  it("handles special characters", () => {
    shareTextOnWhatsApp("I need paint & tiles! #urgent 🔥");
    expect(openUrl).not.toBeNull();
    expect(openUrl).toContain(
      encodeURIComponent("I need paint & tiles! #urgent 🔥"),
    );
  });

  it("handles empty string", () => {
    shareTextOnWhatsApp("");
    expect(openUrl).not.toBeNull();
    expect(openUrl).toContain("https://wa.me/?text=");
  });
});

describe("share — sharePaintCalcOnWhatsApp", () => {
  it("opens WhatsApp with formatted paint calc result", () => {
    const data = {
      result: {
        paintableArea: 50,
        adjustedLiters: 7.5,
        totalRecommendedLiters: 10,
        recommendedContainers: [
          { count: 2, size: 4 },
          { count: 1, size: 2 },
        ],
      },
      input: {
        projectType: "Living Room",
        coats: 2,
        wasteMargin: 10,
      },
      paintTypeName: "Premium Emulsion",
    };
    sharePaintCalcOnWhatsApp(
      data as unknown as Parameters<typeof sharePaintCalcOnWhatsApp>[0],
    );
    expect(openUrl).not.toBeNull();
    expect(openUrl).toContain("https://wa.me/?text=");
    const decoded = decodeURIComponent(openUrl!.split("text=")[1]);
    expect(decoded).toContain("FRELUX Paint Calculator Result");
    expect(decoded).toContain("Living Room");
    expect(decoded).toContain("Premium Emulsion");
  });

  it("works with empty containers list", () => {
    const data = {
      result: {
        paintableArea: 25,
        adjustedLiters: 3.5,
        totalRecommendedLiters: 5,
        recommendedContainers: [],
      },
      input: {
        projectType: "Bedroom",
        coats: 1,
        wasteMargin: 5,
      },
      paintTypeName: "Satin",
    };
    sharePaintCalcOnWhatsApp(
      data as unknown as Parameters<typeof sharePaintCalcOnWhatsApp>[0],
    );
    expect(openUrl).not.toBeNull();
    const decoded = decodeURIComponent(openUrl!.split("text=")[1]);
    expect(decoded).toContain("Bedroom");
    expect(decoded).not.toContain("Recommended containers");
  });
});

describe("share — shareCostEstimateOnWhatsApp", () => {
  it("opens WhatsApp with formatted cost estimate", () => {
    const data = {
      result: {
        paintCost: 15000,
        primerCost: 5000,
        fillerCost: 0,
        puttyCost: 3000,
        sandpaperCost: 2000,
        brushesCost: 1500,
        rollersCost: 1000,
        otherMaterialsCost: 0,
        laborCost: 10000,
        total: 37500,
        currencySymbol: "₦",
      },
      input: {
        projectType: "Living Room",
        paintableArea: 50,
      },
      paintTypeName: "Premium Emulsion",
    };
    shareCostEstimateOnWhatsApp(
      data as unknown as Parameters<typeof shareCostEstimateOnWhatsApp>[0],
    );
    expect(openUrl).not.toBeNull();
    const decoded = decodeURIComponent(openUrl!.split("text=")[1]);
    expect(decoded).toContain("FRELUX Cost Estimate");
    expect(decoded).toContain("GRAND TOTAL");
    expect(decoded).toContain("Living Room");
    expect(decoded).toContain("Labour");
  });

  it("omits zero-cost line items", () => {
    const data = {
      result: {
        paintCost: 10000,
        primerCost: 0,
        fillerCost: 0,
        puttyCost: 0,
        sandpaperCost: 0,
        brushesCost: 0,
        rollersCost: 0,
        otherMaterialsCost: 0,
        laborCost: 0,
        total: 10000,
        currencySymbol: "₦",
      },
      input: {
        projectType: "Office",
        paintableArea: 30,
      },
      paintTypeName: "Standard",
    };
    shareCostEstimateOnWhatsApp(
      data as unknown as Parameters<typeof shareCostEstimateOnWhatsApp>[0],
    );
    expect(openUrl).not.toBeNull();
    const decoded = decodeURIComponent(openUrl!.split("text=")[1]);
    expect(decoded).toContain("Paint:");
    expect(decoded).not.toContain("Primer:");
    expect(decoded).not.toContain("Filler:");
    expect(decoded).not.toContain("Labour:");
  });
});
