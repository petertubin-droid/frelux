import { describe, expect, it, vi } from "vitest";
import {
  buildQuotePdfDoc,
  buildQuotePayload,
  buildQuoteRows,
  exportPdfQuote,
  quoteReference,
} from "@/lib/pdf-export";
import type { CostEstimateResult, CostEstimateInput } from "@/types";

// The export is a sealed file now, so the tests read the bytes rather than
// HTML. The money and quantities come from the engine result; nothing here
// recomputes them.

if (
  typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !==
  "function"
) {
  (Promise as unknown as { withResolvers: unknown }).withResolvers =
    function () {
      const box = {} as {
        resolve: (value: unknown) => void;
        reject: (reason: unknown) => void;
      };
      const promise = new Promise((res, rej) => {
        box.resolve = res;
        box.reject = rej;
      });
      return { promise, ...box };
    };
}

function makeInput(
  overrides: Partial<CostEstimateInput> = {},
): CostEstimateInput {
  return {
    projectType: "room",
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

async function readAsClient(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({
    data: bytes.slice(),
    disableFontFace: true,
    useSystemFonts: true,
  }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
    );
  }
  // pdf.js splits some figures into one glyph per item; join the pieces so the
  // assertions read like the document a client sees.
  const text = pages.join(" ");
  // pdf.js splits figures into one glyph per item; the compact form joins them
  // back so money can be compared as a client sees it.
  return { numPages: pdf.numPages, text, compact: text.replace(/\s+/g, "") };
}

describe("buildQuoteRows", () => {
  it("lists every charge the engine produced, with its quantity", () => {
    const rows = buildQuoteRows(makeResult(), makeInput(), "Premium Paint");

    expect(rows.map((row) => row.label)).toEqual([
      "Paint (Premium Paint)",
      "Primer",
      "Filler",
      "Putty",
      "Sandpaper",
      "Brushes",
      "Rollers",
      "Labour",
    ]);
    expect(rows[0].quantity).toBe("3 container(s)");
    expect(rows[0].amount).toContain("15,000");
    expect(rows[rows.length - 1].quantity).toBe("50 m²");
  });

  it("drops charges the engine did not bill", () => {
    const rows = buildQuoteRows(
      makeResult({
        primerCost: 0,
        fillerCost: 0,
        puttyCost: 0,
        sandpaperCost: 0,
        brushesCost: 0,
        rollersCost: 0,
        otherMaterialsCost: 0,
      }),
      makeInput(),
      "Emulsion",
    );

    expect(rows.map((row) => row.label)).toEqual([
      "Paint (Emulsion)",
      "Labour",
    ]);
  });

  it("falls back to litres when the paint was not sold in containers", () => {
    const rows = buildQuoteRows(
      makeResult({ paintContainerCount: 0 }),
      makeInput({ paintLiters: 7.5 }),
      "Emulsion",
    );

    expect(rows[0].quantity).toBe("7.5 L");
  });
});

describe("buildQuotePayload", () => {
  it("splits materials and labour and marks the grand total", () => {
    const payload = buildQuotePayload(
      {
        result: makeResult(),
        input: makeInput(),
        paintTypeName: "Premium Paint",
      },
      "FRELUX-12345678",
    );

    expect(payload.totals?.map((total) => total.label)).toEqual([
      "Materials",
      "Labour",
      "Grand Total",
    ]);
    expect(payload.totals?.[payload.totals.length - 1]?.strong).toBe(true);
    // 40800 total minus 15000 labour, as the page shows it.
    expect(payload.totals?.[0].value).toContain("25,800");
    expect(payload.title).toBe("Quotation FRELUX-12345678");
  });

  it("omits the labour line when no labour was charged", () => {
    const payload = buildQuotePayload(
      {
        result: makeResult({ laborCost: 0, total: 25800 }),
        input: makeInput(),
        paintTypeName: "Premium Paint",
      },
      "FRELUX-12345678",
    );

    expect(payload.totals?.map((total) => total.label)).toEqual([
      "Materials",
      "Grand Total",
    ]);
  });

  it("carries the terms through as a note instead of dropping them", () => {
    const payload = buildQuotePayload(
      {
        result: makeResult(),
        input: makeInput(),
        paintTypeName: "Premium Paint",
        terms: "50% deposit before work begins.",
      },
      "FRELUX-12345678",
    );

    expect(payload.warnings?.[0]).toContain("50% deposit before work begins.");
  });
});

describe("quoteReference", () => {
  it("is stable for a given moment and differs between them", () => {
    const first = quoteReference(new Date("2026-11-04T10:00:00Z"));
    const same = quoteReference(new Date("2026-11-04T10:00:00Z"));
    const later = quoteReference(new Date("2026-11-04T10:00:01Z"));

    expect(first).toBe(same);
    expect(first).not.toBe(later);
    expect(first).toMatch(/^FRELUX-\d{8}$/);
  });
});

describe("the quotation PDF", () => {
  it("renders the figures the estimator produced", async () => {
    const doc = await buildQuotePdfDoc(
      {
        result: makeResult(),
        input: makeInput(),
        paintTypeName: "Premium Paint",
        terms: "50% deposit before work begins.",
      },
      "FRELUX-12345678",
    );
    const { text, compact } = await readAsClient(
      new Uint8Array(doc.output("arraybuffer")),
    );

    expect(text).toContain("FRELUX-12345678");
    expect(text).toContain("Premium Paint");
    expect(text).toContain("Grand Total");
    expect(compact).toContain("40,800");
    expect(text).toContain("50% deposit");
  });

  it("exports a sealed file and saves nothing else", async () => {
    const clicked: string[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this.download);
      });

    try {
      await exportPdfQuote({
        result: makeResult(),
        input: makeInput(),
        paintTypeName: "Premium Paint",
      });
    } finally {
      click.mockRestore();
    }

    expect(clicked).toHaveLength(1);
    expect(clicked[0]).toMatch(/^frelux-quotation-frelux-\d{8}\.pdf$/);
  });

  it("refuses to render an empty quotation", async () => {
    await expect(
      buildQuotePdfDoc(
        {
          result: makeResult({
            paintCost: 0,
            primerCost: 0,
            fillerCost: 0,
            puttyCost: 0,
            sandpaperCost: 0,
            brushesCost: 0,
            rollersCost: 0,
            otherMaterialsCost: 0,
            laborCost: 0,
            total: 0,
          }),
          input: makeInput(),
          paintTypeName: "Premium Paint",
        },
        "FRELUX-12345678",
      ),
    ).rejects.toThrow(/nothing to put on this quotation/i);
  });
});
