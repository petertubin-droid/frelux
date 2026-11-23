import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildQuoteHtml,
  printQuote,
  printWhenImagesReady,
} from "../quote-export";

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
    // Branded Frelux template checks
    expect(html).toContain("FRELUX SMART CALC");
    expect(html).toContain("invoice");
    expect(html).toContain("pdf-watermark");
    expect(html).toContain("#7C3AED");
  });

  it("applies custom branding when provided", () => {
    const html = buildQuoteHtml({
      ...opts,
      branding: {
        brandName: "Apex Builders Ltd",
        primaryColor: "#1E40AF",
      },
    });
    expect(html).toContain("Apex Builders Ltd");
    expect(html).toContain("Apex Builders Ltd");
    expect(html).toContain("#1E40AF");
  });

  it("prints the FRELUX mark in the header and as the background", () => {
    const html = buildQuoteHtml(opts);
    expect(html).toContain('class="brand-mark"');
    expect(html).toContain("pdf-watermark--mark");
    // Embedded, not a remote URL: a network image raced the print snapshot and
    // vanished from saved PDFs (regression: Nov 2026 painting estimate PDF).
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).not.toContain("/logo-mark.png");
    expect(html).not.toContain("onerror");
    // The mark sits under the content: the watermark div opens the invoice body.
    expect(html.indexOf("pdf-watermark--mark")).toBeLessThan(
      html.indexOf("Generator 10 kVA"),
    );
  });

  it("keeps a branded document's own logo in the header", () => {
    const html = buildQuoteHtml({
      ...opts,
      branding: {
        brandName: "Apex Builders Ltd",
        logoUrl: "https://example.com/apex.png",
      },
    });
    expect(html).toContain("https://example.com/apex.png");
    expect(html).not.toContain(
      '<div class="pdf-watermark pdf-watermark--mark">',
    );
    expect(html).toContain('<div class="pdf-watermark">');
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

  it("writes the document and prints when a popup opens", async () => {
    const write = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({
      document: { write, close, images: [] },
      focus,
      print,
      requestAnimationFrame: (cb: () => void) => cb(),
    } as unknown as Window);
    printQuote(opts, "x.html");
    expect(write).toHaveBeenCalled();
    // Printing waits for the verification QR to be drawn first.
    await vi.waitFor(() => expect(print).toHaveBeenCalled());
  });

  it("waits for a still-loading image before printing", () => {
    vi.useFakeTimers();
    const listeners: Record<string, () => void> = {};
    const img = {
      complete: false,
      addEventListener: (ev: string, cb: () => void) => {
        listeners[ev] = cb;
      },
    };
    const print = vi.fn();
    const w = { document: { images: [img] }, print } as unknown as Window;
    printWhenImagesReady(w);
    expect(print).not.toHaveBeenCalled();
    listeners.load();
    expect(print).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("still prints after the cap when an image never settles", () => {
    vi.useFakeTimers();
    const img = { complete: false, addEventListener: () => {} };
    const print = vi.fn();
    const w = { document: { images: [img] }, print } as unknown as Window;
    printWhenImagesReady(w, 1000);
    vi.advanceTimersByTime(1001);
    expect(print).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("prints exactly once even if both load and the cap fire", () => {
    vi.useFakeTimers();
    const listeners: Record<string, () => void> = {};
    const img = {
      complete: false,
      addEventListener: (ev: string, cb: () => void) => {
        listeners[ev] = cb;
      },
    };
    const print = vi.fn();
    const w = { document: { images: [img] }, print } as unknown as Window;
    printWhenImagesReady(w, 500);
    listeners.load();
    vi.advanceTimersByTime(600);
    expect(print).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("falls back to an HTML file download when popups are blocked", async () => {
    const click = vi.fn();
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    printQuote(opts, "frelux-quote.html");
    // The fallback bakes the QR into the file, so the click lands a tick later.
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
  });
});
