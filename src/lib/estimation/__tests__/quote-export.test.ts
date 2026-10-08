import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildQuoteHtml, printQuote } from "../quote-export";

const opts = {
  title: "FRELUX Backup Power Estimate",
  subtitle: "Generated 2026-10-08 · 2 line item(s)",
  metaRows: [["Backup lines", "2"] as [string, string]],
  lines: [
    {
      label: "Generator 10 kVA",
      quantity: "1",
      unit: "unit",
      unit_price: "$3,500",
      line_total: "$3,500",
      detail: "sized from your measured load",
    },
  ],
  totals: [{ label: "Grand total", value: "$3,500", strong: true }],
  warnings: ["One item is unpriced."],
  steps: [{ label: "Sizing", detail: "load x diversity" }],
};

describe("buildQuoteHtml", () => {
  it("renders title, meta, lines, totals, warnings and steps", () => {
    const html = buildQuoteHtml(opts);
    expect(html).toContain("FRELUX Backup Power Estimate");
    expect(html).toContain("Backup lines:");
    expect(html).toContain("Generator 10 kVA");
    expect(html).toContain("sized from your measured load");
    expect(html).toContain("Grand total");
    expect(html).toContain("One item is unpriced.");
    expect(html).toContain("How this was determined");
  });

  it("escapes HTML in user-provided values", () => {
    const html = buildQuoteHtml({
      ...opts,
      lines: [
        {
          label: '<script>alert("x")</script>',
          quantity: "1",
          unit: "unit",
          unit_price: "1",
          line_total: "1",
        },
      ],
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });
});

describe("printQuote", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the document and prints when a popup opens", () => {
    const write = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({
      document: { write, close },
      focus,
      print,
    } as unknown as Window);
    printQuote(opts, "x.html");
    expect(write).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
  });

  it("falls back to an HTML file download when popups are blocked", () => {
    const click = vi.fn();
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    printQuote(opts, "frelux-quote.html");
    expect(click).toHaveBeenCalled();
  });
});
