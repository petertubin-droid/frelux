import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEstimatePlainText,
  buildEstimateWhatsAppMessage,
  copyEstimateSummary,
  shareEstimateOnWhatsApp,
  type ShareableEstimate,
} from "./estimate-sharing";

vi.mock("@/lib/achievements", () => ({ trackShare: vi.fn() }));

const estimate: ShareableEstimate = {
  kind: "Painting Cost Estimate",
  title: "Lekki Duplex — Living room",
  reference: "EST-2026-0042",
  summaryLines: [
    { label: "Paintable area", value: "96 m²" },
    { label: "Coats", value: "2" },
  ],
  lineItems: [
    { section: "Materials", description: "Premium emulsion", quantity: "3 × 20 L", amount: "₦126,000" },
    { section: "Materials", description: "Primer", quantity: "1 × 20 L", amount: "₦24,500" },
    { section: "Labour", description: "Application", quantity: "2 days", amount: "₦48,000" },
  ],
  totals: [
    { label: "Subtotal", value: "₦198,500" },
    { label: "Grand total", value: "₦198,500", emphasized: true },
  ],
  notes: ["Openings deducted: 2 doors, 3 windows"],
  link: "/paint-calculator?mode=cost",
  generatedAt: "2026-10-27T12:00:00.000Z",
};

describe("buildEstimateWhatsAppMessage", () => {
  const msg = buildEstimateWhatsAppMessage(estimate);

  it("leads with the kind, project and reference", () => {
    expect(msg).toContain("*FRELUX Painting Cost Estimate*");
    expect(msg).toContain("*Project:* Lekki Duplex — Living room");
    expect(msg).toContain("*Ref:* EST-2026-0042");
  });

  it("shows the input summary, sections, items and totals", () => {
    expect(msg).toContain("*Paintable area:* 96 m²");
    expect(msg).toContain("_Materials_");
    expect(msg).toContain("• Premium emulsion (3 × 20 L) — ₦126,000");
    expect(msg).toContain("_Labour_");
    expect(msg).toContain("*Subtotal:* ₦198,500");
    expect(msg).toContain("*GRAND TOTAL: ₦198,500*");
  });

  it("carries the honest disclaimer, engine notes and the calculator link", () => {
    expect(msg).toContain("⚠️ Openings deducted: 2 doors, 3 windows");
    expect(msg).toContain("_Estimate only.");
    expect(msg).toMatch(/🔗 https?:\/\/.*\/paint-calculator\?mode=cost/);
  });

  it("never invents numbers that are not in the estimate", () => {
    expect(msg).not.toContain("₦999");
    expect(msg).not.toMatch(/m² total/);
  });
});

describe("buildEstimatePlainText", () => {
  it("strips WhatsApp markup but keeps the content", () => {
    const plain = buildEstimatePlainText(estimate);
    expect(plain).not.toContain("*");
    expect(plain).toContain("FRELUX Painting Cost Estimate");
    expect(plain).toContain("Subtotal: ₦198,500");
    expect(plain).toContain("GRAND TOTAL: ₦198,500");
    expect(plain).toContain("Estimate only.");
  });
});

describe("shareEstimateOnWhatsApp", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens wa.me with the encoded message", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    shareEstimateOnWhatsApp(estimate);
    expect(open).toHaveBeenCalledTimes(1);
    const url = open.mock.calls[0][0] as string;
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Painting Cost Estimate");
    expect(open.mock.calls[0][2]).toContain("noopener");
  });
});

describe("copyEstimateSummary", () => {
  it("copies the plain text and reports success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const ok = await copyEstimateSummary(estimate);
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalled();
  });

  it("reports failure honestly when the clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    expect(await copyEstimateSummary(estimate)).toBe(false);
  });
});
