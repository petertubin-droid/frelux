import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock") },
}));

vi.mock("@/lib/pdf-branding", () => ({
  applyJspdfWatermark: vi.fn(),
  applyJspdfHeader: vi.fn(),
  applyJspdfFooter: vi.fn(),
}));

vi.mock("@/lib/brand-studio", () => ({}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pdf module", () => {
  it("exports generateQuotationPDF", async () => {
    const mod = await import("@/lib/pdf");
    expect(typeof mod.generateQuotationPDF).toBe("function");
  });

  it("exports generateShoppingListPDF", async () => {
    const mod = await import("@/lib/pdf");
    expect(typeof mod.generateShoppingListPDF).toBe("function");
  });
});
