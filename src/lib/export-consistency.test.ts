import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildQuoteHtml,
  type QuoteOptions,
} from "@/lib/estimation/quote-export";

/**
 * One quote document, one export button.
 *
 * Frelux grew several PDF paths (an HTML print quote, a sealed jsPDF quote, BOQ
 * and studio documents), and a calculator page could offer two of them at once,
 * so the same estimate printed differently depending on which button a visitor
 * pressed. These tests hold the line: every calculator prints through
 * `printQuote`, and no calculator offers more than one PDF control.
 */

const PAGES_DIR = join(process.cwd(), "src/pages");
const PDF_LABELS = [
  "Export PDF",
  "Export quote (PDF)",
  "Download PDF",
  "Export as PDF",
  "Save PDF",
];

/**
 * A calculator counts as exporting when its own source prints a quote, offers a
 * PDF label, uses the specialty shell, or opts the share bar into its PDF. The
 * share bar files are skipped while walking imports: they always contain the
 * word showPdf, which says nothing about whether a page asks for it.
 */
const EXPORT_SIGNAL =
  /printQuote\(|"Export PDF"|Export quote \(PDF\)|Download PDF|>\s*Export PDF\s*<|SpecialtyCalculatorShell|<(?:ShareEstimateButton|QuoteShareButton)[^>]*showPdf/;

function resolveImport(spec: string, fromFile: string): string[] {
  const base = spec.startsWith("@/")
    ? join(process.cwd(), "src", spec.slice(2))
    : spec.startsWith(".")
      ? join(fromFile, "..", spec)
      : null;
  if (!base) return [];
  return ["", ".tsx", ".ts", "/index.tsx"]
    .map((ext) => base + ext)
    .filter((p) => existsSync(p) && statSync(p).isFile());
}

function canExport(file: string, depth = 0, seen = new Set<string>()): boolean {
  if (seen.has(file) || depth > 2) return false;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  if (EXPORT_SIGNAL.test(source)) return true;
  for (const match of source.matchAll(/import[^;]*?from\s+"([^"]+)"/g)) {
    for (const target of resolveImport(match[1], file)) {
      if (!/[\\/]src[\\/](pages|components)[\\/]/.test(target)) continue;
      if (/(ShareEstimateButton|QuoteShareButton)\.tsx$/.test(target)) continue;
      if (canExport(target, depth + 1, seen)) return true;
    }
  }
  return false;
}

function calculatorPages(): string[] {
  return (
    readdirSync(PAGES_DIR)
      .filter((name) => name.endsWith(".tsx") && !name.includes(".test."))
      .filter((name) =>
        /(Calculator|Estimator|Takeoff|Counter|Planner)/.test(name),
      )
      // a hub only links to calculators, so it holds no result to export
      .filter((name) => !/Hub\.tsx$/.test(name))
      .map((name) => join(PAGES_DIR, name))
  );
}

function pageFiles(): { name: string; source: string }[] {
  return readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .filter((e) => !e.name.includes(".test."))
    .map((e) => ({
      name: e.name,
      source: readFileSync(join(PAGES_DIR, e.name), "utf8"),
    }));
}

/** Pages that hand the visitor a document to keep. */
function exportingPages() {
  return pageFiles().filter(
    (p) =>
      p.source.includes("printQuote") ||
      p.source.includes("exportPdfQuote") ||
      p.source.includes("downloadBoqPdf") ||
      p.source.includes("buildBoqPdf") ||
      PDF_LABELS.some((label) => p.source.includes(`"${label}"`)),
  );
}

describe("PDF export consistency", () => {
  it("offers at most one PDF export control per page", () => {
    const offenders: string[] = [];
    for (const page of exportingPages()) {
      const shown = PDF_LABELS.filter((label) =>
        page.source.includes(`${label}`),
      );
      // A label counts once even when it appears in both t("…") and a literal.
      if (shown.length > 1) {
        offenders.push(`${page.name}: ${shown.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the share button from adding a second export control", () => {
    // Every calculator exports through its own button, so the share button's
    // PDF action must stay off unless a page opts in as its only export.
    const source = readFileSync(
      join(process.cwd(), "src/components/ShareEstimateButton.tsx"),
      "utf8",
    );
    expect(source).toContain("showPdf = false,");
  });

  it("quotes every estimate through the one shared engine", () => {
    const offenders = pageFiles()
      .filter((p) => p.source.includes("@/lib/pdf-export"))
      .map((p) => p.name);
    // The sealed jsPDF quotation is retired as a second quote type: a visitor
    // must never get a different-looking document from one calculator.
    expect(offenders).toEqual([]);
  });

  it("prints the quote layout the brand uses: summary, materials, totals", () => {
    const options: QuoteOptions = {
      title: "FRELUX Painting Cost Estimate",
      subtitle: "Generated 11/14/2026",
      metaRows: [
        ["Material lines", "1"],
        ["Paintable area", "see estimate summary"],
      ],
      lines: [
        {
          label: "Paint (2 containers)",
          quantity: "included",
          unit: "item",
          unit_price: "included",
          line_total: "₦40,000",
        },
      ],
      totals: [
        { label: "Material cost", value: "₦40,000" },
        { label: "Labour", value: "₦15,000" },
        { label: "Grand total", value: "₦55,000", strong: true },
      ],
      footer:
        "Estimates are indicative and not a formal quote. Prices reflect the configured material database for your market.",
    };
    const html = buildQuoteHtml(options);

    expect(html).toMatch(/Ref: FLX-[A-Z0-9]{6}/);
    expect(html).toContain("<h2>Summary</h2>");
    expect(html).toContain("Bill of materials");
    expect(html).toContain("<h2>Totals</h2>");
    expect(html).toContain("Grand total");
    expect(html).toContain("Estimates are indicative and not a formal quote");
    // Section headings are upper-cased by the stylesheet, as in the printed
    // document a visitor keeps.
    expect(html).toContain("text-transform: uppercase");
  });

  it("gives every calculator an export control", () => {
    const missing = calculatorPages()
      .filter((file) => !canExport(file))
      .map((file) => file.split("/").pop());
    expect(missing).toEqual([]);
  });

  it("never shows a page export and the share PDF together", () => {
    const doubled: string[] = [];
    for (const { name, source } of pageFiles()) {
      const ownExport = PDF_LABELS.some((label) =>
        source.includes(`"${label}"`),
      );
      if (!ownExport) continue;
      for (const tag of source.matchAll(
        /<(?:ShareEstimateButton|QuoteShareButton)\b[^>]*>/g,
      )) {
        const enabled =
          /showPdf/.test(tag[0]) && !/showPdf=\{false\}/.test(tag[0]);
        if (enabled) doubled.push(name);
      }
    }
    expect(doubled).toEqual([]);
  });
});
