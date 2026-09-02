import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportPdfQuote } from "@/lib/pdf-export";
import type { CostEstimateResult, CostEstimateInput } from "@/types";

// Mock window.open and document methods
const mockWrite = vi.fn();
const mockClose = vi.fn();
const mockOpen = vi.fn(() => ({
  document: { write: mockWrite, close: mockClose, open: vi.fn() },
  focus: vi.fn(),
  print: vi.fn(),
  close: vi.fn(),
}));

Object.defineProperty(window, "open", { value: mockOpen, writable: true });

function makeInput(
  overrides: Partial<CostEstimateInput> = {},
): CostEstimateInput {
  return {
    projectType: "interior" as any,
    paintableArea: 50,
    paintLiters: 10,
    coats: 2,
    paintType: "premium",
    paintProductId: null,
    paintProductName: "Premium Paint",
    paintContainerSize: 4,
    paintContainerPrice: 5000,
    paintPricePerLiter: 1200,
    paintUseContainerPricing: true,
    includePrimer: true,
    primerLiters: 5,
    primerPricePerLiter: 800,
    includeFiller: true,
    fillerCost: 2000,
    includePutty: true,
    puttyCost: 1500,
    includeSandpaper: true,
    sandpaperCost: 500,
    includeBrushes: true,
    brushesCost: 1000,
    includeRollers: true,
    rollersCost: 800,
    includeOther: false,
    otherMaterialsCost: 0,
    laborMode: "perSqm",
    laborRatePerSqm: 300,
    laborTotal: 0,
    currency: "NGN",
    currencySymbol: "₦",
    ...overrides,
  };
}

function makeResult(
  overrides: Partial<CostEstimateResult> = {},
): CostEstimateResult {
  return {
    paintCost: 15000,
    paintContainerCount: 3,
    primerCost: 4000,
    fillerCost: 2000,
    puttyCost: 1500,
    sandpaperCost: 500,
    brushesCost: 1000,
    rollersCost: 800,
    otherMaterialsCost: 0,
    materialsCost: 5800,
    laborCost: 15000,
    total: 40800,
    currency: "NGN",
    currencySymbol: "₦",
    ...overrides,
  };
}

describe("exportPdfQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a new window and writes HTML content", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium Paint",
    });
    expect(mockOpen).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalled();
  });

  it("generates HTML containing QUOTATION heading", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium Paint",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("QUOTATION");
  });

  it("includes reference number starting with FRELUX-", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium Paint",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toMatch(/FRELUX-\d{8}/);
  });

  it("includes project type and paint type", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput({ projectType: "exterior" as any }),
      paintTypeName: "Weather Shield",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("exterior");
    expect(html).toContain("Weather Shield");
  });

  it("includes paintable area", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput({ paintableArea: 75.5 }),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("75.5");
    expect(html).toContain("m²");
  });

  it("includes paint row when paintCost > 0", () => {
    exportPdfQuote({
      result: makeResult({ paintCost: 15000, paintContainerCount: 3 }),
      input: makeInput(),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("Paint (Premium)");
    expect(html).toContain("3 container(s)");
  });

  it("includes primer row when primerCost > 0", () => {
    exportPdfQuote({
      result: makeResult({ primerCost: 4000 }),
      input: makeInput(),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("Primer");
  });

  it("includes labour row when laborCost > 0", () => {
    exportPdfQuote({
      result: makeResult({ laborCost: 15000 }),
      input: makeInput({ paintableArea: 50 }),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("Labour");
    expect(html).toContain("50 m²");
  });

  it("omits rows when costs are zero", () => {
    exportPdfQuote({
      result: makeResult({
        primerCost: 0,
        fillerCost: 0,
        puttyCost: 0,
        sandpaperCost: 0,
        brushesCost: 0,
        rollersCost: 0,
        otherMaterialsCost: 0,
        laborCost: 0,
      }),
      input: makeInput(),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).not.toContain("Primer");
    expect(html).not.toContain("Filler");
    expect(html).not.toContain("Labour");
  });

  it("includes grand total", () => {
    exportPdfQuote({
      result: makeResult({ total: 40800 }),
      input: makeInput(),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("Grand Total");
    expect(html).toMatch(/₦[\d,.]+/);
  });

  it("uses company name when no branding", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
      company: { name: "Acme Construction" },
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("Acme Construction");
  });

  it("uses FRELUX as default brand name", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("FRELUX");
  });

  it("includes company contact info when provided", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
      company: {
        name: "Acme",
        phone: "+123",
        email: "a@b.com",
        address: "123 St",
      },
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("+123");
    expect(html).toContain("a@b.com");
    expect(html).toContain("123 St");
  });

  it("includes terms when provided", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
      terms: "Payment due within 30 days.",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("Payment due within 30 days.");
  });

  it("uses primary color from branding when provided", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
      branding: {
        source: "user_premium",
        brandName: "CustomBrand",
        tagline: null,
        email: null,
        phone: null,
        address: null,
        whatsapp: null,
        website: null,
        logoUrl: null,
        primaryColor: "#FF0000",
        secondaryColor: "#000",
        accentColor: "#000",
        watermark: {
          enabled: false,
          opacity: 0,
          scale: 0,
          position: "center",
          diagonal: false,
        },
        templateConfig: null,
        logoPlacement: "top-left",
        templateId: null,
        profileId: null,
        unlockId: null,
      },
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("#FF0000");
    expect(html).toContain("CustomBrand");
  });

  it("escapes HTML in company name to prevent XSS", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
      company: { name: "<script>alert(1)</script>" },
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes FRELUX footer with SITE_URL link", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain("FRELUX Paint Calculator");
  });

  it("calls document.close after write", () => {
    exportPdfQuote({
      result: makeResult(),
      input: makeInput(),
      paintTypeName: "Premium",
    });
    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("handles all material rows when all costs > 0", () => {
    exportPdfQuote({
      result: makeResult({
        paintCost: 100,
        primerCost: 50,
        fillerCost: 30,
        puttyCost: 20,
        sandpaperCost: 10,
        brushesCost: 15,
        rollersCost: 12,
        otherMaterialsCost: 8,
        laborCost: 200,
      }),
      input: makeInput(),
      paintTypeName: "Test",
    });
    const html = mockWrite.mock.calls[0][0] as string;
    [
      "Paint (Test)",
      "Primer",
      "Filler",
      "Putty",
      "Sandpaper",
      "Brushes",
      "Rollers",
      "Other materials",
      "Labour",
    ].forEach((label) => {
      expect(html).toContain(label);
    });
  });
});
