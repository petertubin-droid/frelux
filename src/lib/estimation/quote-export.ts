import { stageStudioImport } from "@/lib/document-studio";
import { formatCurrency } from "@/lib/utils";
import {
  grandTotalLabel,
  showsTransportation,
  totalWithTransportation,
  transportationAmount,
  TRANSPORTATION_TO_AGREE,
  type TransportationChoice,
} from "@/lib/estimation/transportation";
import { getActiveDisplayCurrency } from "@/lib/international/fx-display";
import {
  autoDisplayForReport,
  type QuoteDisplay,
} from "@/lib/currency/quote-display";

export function exportQuoteToDocumentStudio(
  opts: QuoteOptions,
  /** Currency the quote totals are denominated in. */
  currencyCode?: string,
  documentType: "quotation" | "material_schedule" | "invoice" = "quotation",
): void {
  let omittedLines = 0;
  const materials = opts.lines.flatMap((line) => {
    const parse = (value: string): number | null => {
      const normalized = value
        .replace(/,/g, "")
        .replace(/[^0-9.-]+/g, "")
        .trim();
      if (!normalized || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized))
        return null;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const quantity = parse(line.quantity);
    const unitPrice = parse(line.unit_price ?? "");
    if (quantity === null || unitPrice === null) {
      omittedLines++;
      return [];
    }
    return [
      {
        label: line.detail ? `${line.label} (${line.detail})` : line.label,
        quantity,
        unit: line.unit || "unit",
        unitPrice,
      },
    ];
  });

  const notesParts: string[] = [];
  if (opts.subtitle) notesParts.push(opts.subtitle);
  if (opts.metaRows && opts.metaRows.length > 0) {
    notesParts.push(opts.metaRows.map(([k, v]) => `${k}: ${v}`).join(" | "));
  }
  if (opts.warnings && opts.warnings.length > 0) {
    notesParts.push("Notes: " + opts.warnings.join(". "));
  }
  const quoteCurrency = String(currencyCode ?? getActiveDisplayCurrency())
    .trim()
    .toUpperCase();
  const display = autoDisplayForReport(opts.totals);
  if (display) {
    const headline =
      display.totals.find((t) => t.strong) ??
      display.totals[display.totals.length - 1];
    notesParts.push(
      `Also in ${display.currency}: ${headline.value}. ${display.rateLine}. ${display.note}${
        display.fromSnapshot
          ? " Rates came from a saved snapshot, not a live feed."
          : ""
      }`,
    );
  }

  if (omittedLines > 0)
    notesParts.push(
      `${omittedLines} quote line(s) were excluded because a verified numeric quantity or unit price was unavailable. Review the original estimate.`,
    );

  stageStudioImport({
    title: opts.title,
    materials,
    notes: notesParts.join("\n\n"),
    document_type: documentType,
    currency: quoteCurrency,
  });
}

/**
 * Shared printable-quote builder for Frelux estimation engines.
 *
 * Every estimator page offers the same professional export: a
 * print-ready quote document styled with official FRELUX branding.
 * Pages pre-format their money strings with the site-wide currency
 * layer (formatCurrency), so quotes render in the visitor's market
 * currency.
 *
 * Pure HTML generation: no I/O, fully testable. The print/export
 * side effect lives in printQuote().
 */

import type { ResolvedBranding } from "@/lib/brand-studio";
import {
  buildReceiptDocument,
  downloadReceiptHtml,
  escapeHtml,
  printReceiptHtml,
  printWhenImagesReady,
} from "@/lib/estimation/receipt-document";

export { printWhenImagesReady };

export interface QuoteLine {
  label: string;
  quantity: string;
  /** Optional: quantity-only takeoffs leave the pricing columns out. */
  unit?: string;
  unit_price?: string;
  line_total?: string;
  detail?: string;
}

export interface QuoteTotal {
  label: string;
  value: string;
  strong?: boolean;
}

export interface QuoteOptions {
  title: string;
  /** One-line context, e.g. "Generated 2026-10-08 · 3 backup power lines" */
  subtitle: string;
  /** Key/value summary rows shown before the bill of materials */
  metaRows: Array<[string, string]>;
  lines: QuoteLine[];
  totals: QuoteTotal[];
  warnings?: string[];
  /** Optional "how this was determined" steps */
  steps?: Array<{ label: string; detail: string }>;
  footer?: string;
  /** Optional custom or resolved branding */
  branding?: Partial<ResolvedBranding>;
  /**
   * The same totals read in another currency at a dated rate. Omitted when no
   * trusted rate is available, because a blank or invented figure is worse than
   * none.
   */
  display?: QuoteDisplay;
  /** Optional delivery to site. Off unless the visitor turned it on. */
  transportation?: TransportationChoice;
  /**
   * The numeric grand total the `totals` list ends with, before
   * transportation. Supplied so the document can add the delivery honestly;
   * without it the total is labelled "excl. transportation" instead.
   */
  grandTotal?: number;
  /** Symbol used to render a transportation amount, e.g. "₦". */
  currencySymbol?: string;
}

function formatCurrencyForQuote(amount: number, opts: QuoteOptions): string {
  return formatCurrency(amount, opts.currencySymbol || "₦");
}

export function buildQuoteHtml(opts: QuoteOptions): string {
  const metaRows = opts.metaRows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td><b>${escapeHtml(k)}:</b></td><td>${escapeHtml(String(v))}</td></tr>`,
    )
    .join("");
  const metaHtml = metaRows
    ? `<h2>Summary</h2><table class="meta meta-table">${metaRows}</table>`
    : "";

  // Quantity-only takeoffs have no prices: omit the money columns entirely
  // rather than printing empty cells under "Unit price" and "Line total".
  const hasPrices = opts.lines.some((l) => l.unit_price || l.line_total);
  const lineRows = opts.lines
    .map((l) => {
      const label = `<td>${escapeHtml(l.label)}${
        l.detail ? `<div class="muted">${escapeHtml(l.detail)}</div>` : ""
      }</td>`;
      const qty = `<td class="n">${escapeHtml(
        `${l.quantity}${l.unit ? ` ${l.unit}` : ""}`,
      )}</td>`;
      if (!hasPrices) return `<tr>${label}${qty}</tr>`;
      return `<tr>${label}${qty}<td class="n">${escapeHtml(
        l.unit_price ?? "",
      )}</td><td class="n">${escapeHtml(l.line_total ?? "")}</td></tr>`;
    })
    .join("");
  const linesHtml = lineRows
    ? `<h2>${hasPrices ? "Bill of materials" : "Measured quantities"}</h2>
      <table>
        <thead><tr><th>Item</th><th class="n">Quantity</th>${
          hasPrices
            ? '<th class="n">Unit price</th><th class="n">Line total</th>'
            : ""
        }</tr></thead>
        <tbody>${lineRows}</tbody>
      </table>`
    : "";

  // Transportation is added here, once, so every calculator's quotation reads
  // the same. The row is inserted before the closing total, and the closing
  // figure only grows when the caller supplied the numeric base to add it to.
  const transport = opts.transportation;
  const baseTotalKnown =
    typeof opts.grandTotal === "number" && Number.isFinite(opts.grandTotal);
  const transportAmount = transportationAmount(transport);
  const totalsForDocument = (() => {
    const rows = [...opts.totals];
    if (!showsTransportation(transport)) return rows;
    const amountText =
      transportAmount > 0
        ? formatCurrencyForQuote(transportAmount, opts)
        : TRANSPORTATION_TO_AGREE;
    const line: QuoteTotal = { label: "Transportation", value: amountText };
    const strongIndex = rows.findIndex((r) => r.strong);
    if (strongIndex === -1) {
      rows.push(line);
      return rows;
    }
    const closing = { ...rows[strongIndex] };
    closing.label = grandTotalLabel(transport, baseTotalKnown);
    if (baseTotalKnown && transportAmount > 0) {
      closing.value = formatCurrencyForQuote(
        totalWithTransportation(opts.grandTotal as number, transport),
        opts,
      );
    }
    rows.splice(strongIndex, 0, line);
    rows[strongIndex + 1] = closing;
    return rows;
  })();

  const totalsRows = totalsForDocument
    .map(
      (t) =>
        `<tr class="${t.strong ? "grand" : "total-row"}"><td>${escapeHtml(
          t.label,
        )}</td><td class="n">${escapeHtml(t.value)}</td></tr>`,
    )
    .join("");
  const totalsHtml = totalsRows
    ? `<h2>Totals</h2><table class="meta totals-table">${totalsRows}</table>`
    : "";

  const display = opts.display ?? autoDisplayForReport(opts.totals);
  const displayRows = display
    ? display.totals
        .map(
          (t) =>
            `<tr class="${t.strong ? "grand" : "total-row"}"><td>${escapeHtml(
              t.label,
            )}</td><td class="n">${escapeHtml(t.value)}</td></tr>`,
        )
        .join("")
    : "";
  const displayHtml = display
    ? `<h2>Also shown in ${escapeHtml(display.currency)}</h2>
       <table class="meta totals-table">${displayRows}</table>
       <p class="conversion-note">${escapeHtml(display.rateLine)}. ${escapeHtml(display.note)}${
         display.fromSnapshot
           ? " Rates were read from a saved snapshot, not a live feed."
           : ""
       }</p>`
    : "";

  const warningsHtml = opts.warnings?.length
    ? `<div class="notes-box"><h3>Notes &amp; Assumptions</h3><ul>${opts.warnings
        .map((w) => `<li>${escapeHtml(w)}</li>`)
        .join("")}</ul></div>`
    : "";

  const stepsHtml = opts.steps?.length
    ? `<div class="steps-box"><h3>How this was determined</h3><ul>${opts.steps
        .map(
          (s) =>
            `<li><b>${escapeHtml(s.label)}:</b> ${escapeHtml(s.detail)}</li>`,
        )
        .join("")}</ul></div>`
    : "";

  const bodyHtml = `${metaHtml}
      ${linesHtml}
      ${totalsHtml}
      ${displayHtml}
      ${warningsHtml}
      ${stepsHtml}`;

  return buildReceiptDocument({
    title: opts.title,
    subtitle: opts.subtitle,
    bodyHtml,
    footer: opts.footer,
    branding: opts.branding,
  });
}

/**
 * A shareable estimate, structurally. Declared here rather than imported so
 * this module stays free of the PDF pipeline it replaced.
 */
export interface ShareableEstimateLike {
  kind: string;
  title?: string | null;
  reference?: string | null;
  summaryLines: Array<{ label: string; value: string }>;
  lineItems: Array<{
    section?: string;
    description: string;
    quantity?: string | null;
    amount?: string | null;
  }>;
  totals: Array<{ label: string; value: string; emphasized?: boolean }>;
  notes?: string[];
  generatedAt?: string;
}

/**
 * One quote layout for every calculator.
 *
 * Calculators used to hand their results to a second jsPDF renderer that drew
 * its own document, so the same estimate looked different depending on which
 * page produced it. Everything now speaks these options, and therefore the one
 * printed quote.
 */
export function quoteOptionsFromShareable(
  estimate: ShareableEstimateLike,
  footer?: string,
): QuoteOptions {
  const context = [estimate.title, estimate.reference]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(" · ");
  return {
    title: `FRELUX ${estimate.kind}`,
    subtitle:
      context ||
      `Generated ${new Date(
        estimate.generatedAt ?? Date.now(),
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
    metaRows: estimate.summaryLines.map((line) => [line.label, line.value]),
    lines: estimate.lineItems.map((item) => ({
      label: item.section
        ? `${item.section} · ${item.description}`
        : item.description,
      quantity: item.quantity || "",
      unit: "",
      unit_price: "",
      line_total: item.amount || "",
    })),
    totals: estimate.totals.map((total) => ({
      label: total.label,
      value: total.value,
      strong: Boolean(total.emphasized),
    })),
    warnings: estimate.notes,
    footer,
  };
}

/** Print the shareable estimate as the one Frelux quote document. */
export function printShareableQuote(
  estimate: ShareableEstimateLike,
  downloadName = "frelux-estimate.html",
  footer?: string,
): void {
  printQuote(quoteOptionsFromShareable(estimate, footer), downloadName);
}

/**
 * Open the browser print dialog with the quote. If popups are
 * blocked, download a printable HTML file instead.
 */
/**
 * Print a quotation through the browser. The resulting file comes from the
 * print dialog, not from FRELUX, so it is not sealed: downloads that must be
 * unalterable go through `@/lib/pdf-seal` (`downloadEstimatePdf` and friends).
 */
export function printQuote(opts: QuoteOptions, downloadName: string): void {
  const html = buildQuoteHtml(opts);
  if (!printReceiptHtml(html)) downloadReceiptHtml(html, downloadName);
}
