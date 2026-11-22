/**
 * FRELUX VERIFY QR — the seal is the exporter's decision.
 *
 * These tests pin the behaviour the toggle exists for:
 *  - nothing is printed when the toggle is off;
 *  - when on, the block is anchored at the bottom of the last page;
 *  - the printed block carries a real QR image and the honest copy.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const { drawVerifySeal } = vi.hoisted(() => ({
  drawVerifySeal: vi.fn(async () => 24),
}));

vi.mock("@/lib/blockchain/verify-seal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/blockchain/verify-seal")>();
  return { ...actual, drawVerifySeal };
});

import { compileBoq } from "./compile";
import { buildBoqPdf } from "./pdf";
import { boqStudioPrintHtml } from "./print";
import { createEmptyDocument, type BoqStudioDocument } from "./types";
import { VERIFY_BLOCK_HEIGHT, verifySealBottomY } from "@/lib/blockchain/verify-seal";

function doc(): BoqStudioDocument {
  const base = createEmptyDocument({
    currency: "NGN",
    marketCode: "NG",
    standard: "Commercial",
    templateSlug: "ng-commercial",
    preparedBy: "QS Team",
  });
  return {
    ...base,
    title: "Duplex at Lekki",
    reference: "BOQ-2026-001",
    client: { name: "A. Client", address: "Lekki Phase 1, Lagos" },
    contractor: { name: "FRELUX Builders" },
    sections: [
      {
        id: "s1",
        code: "05",
        title: "Concrete Works",
        notes: "",
        items: [
          {
            id: "i1",
            item_number: "05.01",
            description: "Reinforced concrete in foundation",
            specification: "Grade 20",
            unit: "m³",
            quantity: 10,
            material_rate: 90000,
            labour_rate: 25000,
            plant_rate: 0,
            notes: "",
            rates_include_waste: false,
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  drawVerifySeal.mockClear();
});

describe("verifySealBottomY", () => {
  it("anchors the block above the footer, not mid-page", () => {
    const y = verifySealBottomY({ pageHeight: 210, margin: 12, footerReserve: 10 });
    expect(y + VERIFY_BLOCK_HEIGHT).toBeLessThan(210 - 12);
    expect(y + VERIFY_BLOCK_HEIGHT).toBe(210 - 12 - 10);
  });
});

describe("BOQ PDF seal placement", () => {
  it("prints no seal at all when the toggle is off (the default)", async () => {
    const compiled = compileBoq(doc());
    await buildBoqPdf(compiled.standard, compiled.document);
    expect(drawVerifySeal).not.toHaveBeenCalled();
  });

  it("prints no seal for an explicit verify:false", async () => {
    const compiled = compileBoq(doc());
    await buildBoqPdf(compiled.standard, compiled.document, { verify: false });
    expect(drawVerifySeal).not.toHaveBeenCalled();
  });

  it("prints the seal at the bottom of the last page when toggled on", async () => {
    const compiled = compileBoq(doc());
    const pdf = await buildBoqPdf(compiled.standard, compiled.document, {
      verify: true,
    });
    expect(drawVerifySeal).toHaveBeenCalledTimes(1);

    const [target, x, y, width, options] = drawVerifySeal.mock.calls[0] as unknown as [
      unknown,
      number,
      number,
      number,
      { documentLabel?: string },
    ];
    expect(target).toBe(pdf);
    expect(x).toBe(12); // page margin
    // jsPDF reports the A4 height in points converted to mm (209.998…), so
    // the anchored Y matches within a rounding tolerance.
    expect(y).toBeCloseTo(
      verifySealBottomY({ pageHeight: 210, margin: 12, footerReserve: 10 }),
      1,
    );
    expect(width).toBeCloseTo(297 - 12 * 2, 1); // landscape A4 width
    expect(options.documentLabel).toBe("BOQ");
  });
});

describe("print view seal", () => {
  it("omits the seal unless the QR data URL is supplied", () => {
    const compiled = compileBoq(doc());
    const plain = boqStudioPrintHtml(compiled.standard, compiled.document);
    expect(plain).not.toContain("frelux-verify");
  });

  it("prints the seal block with the QR image when enabled", () => {
    const compiled = compileBoq(doc());
    const html = boqStudioPrintHtml(compiled.standard, compiled.document, {
      qrDataUrl: "data:image/png;base64,AAAA",
    });
    expect(html).toContain("frelux-verify");
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain("FRELUX VERIFY");
    expect(html).toContain("/verify");
  });
});
