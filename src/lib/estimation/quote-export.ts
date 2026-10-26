import { stageStudioImport } from "@/lib/document-studio";

export function exportQuoteToDocumentStudio(
  opts: QuoteOptions,
  currencyCode = "NGN",
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
    const unitPrice = parse(line.unit_price);
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
  if (omittedLines > 0)
    notesParts.push(
      `${omittedLines} quote line(s) were excluded because a verified numeric quantity or unit price was unavailable. Review the original estimate.`,
    );

  stageStudioImport({
    title: opts.title,
    materials,
    notes: notesParts.join("\n\n"),
    document_type: documentType,
    currency: currencyCode,
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

export interface QuoteLine {
  label: string;
  quantity: string;
  unit: string;
  unit_price: string;
  line_total: string;
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
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getBaseStyles(primaryColor: string, accentColor: string): string {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #f8fafc;
    padding: 32px 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .invoice {
    max-width: 840px;
    margin: 0 auto;
    background: #ffffff;
    padding: 44px 48px;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    border-bottom: 2px solid ${primaryColor};
    padding-bottom: 20px;
    gap: 20px;
  }
  .company { flex: 1; }
  .company-name {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: ${primaryColor};
    text-transform: uppercase;
  }
  .company-tagline {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    margin-top: 3px;
  }
  .company-info {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }
  .meta { text-align: right; }
  .meta h1 {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 4px;
    letter-spacing: -0.5px;
  }
  .meta .ref { font-size: 11px; color: #64748b; font-weight: 600; font-family: monospace; }
  .meta .date { font-size: 11px; color: #64748b; margin-top: 2px; }
  .sub {
    color: #475569;
    font-size: 12.5px;
    margin-bottom: 20px;
    background: #f8fafc;
    padding: 10px 14px;
    border-radius: 6px;
    border-left: 3px solid ${primaryColor};
  }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #334155;
    margin: 22px 0 8px;
  }
  h3 {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    margin: 14px 0 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    margin-bottom: 16px;
  }
  th {
    background: #f8fafc;
    border-bottom: 2px solid ${primaryColor};
    padding: 8px 10px;
    text-align: left;
    text-transform: uppercase;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #475569;
  }
  td {
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 10px;
    text-align: left;
    color: #1e293b;
  }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #64748b; font-size: 11px; margin-top: 2px; }
  .meta-table { margin-bottom: 14px; }
  .meta-table td {
    border: none;
    padding: 3px 10px 3px 0;
    font-size: 12.5px;
  }
  .total-row { font-size: 13.5px; font-weight: 600; color: #334155; }
  .grand {
    font-size: 15px;
    font-weight: 800;
    color: ${primaryColor};
    border-top: 2px solid ${primaryColor} !important;
  }
  .notes-box {
    background: #fffbeb;
    border: 1px solid #fef3c7;
    border-left: 3px solid #f59e0b;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 14px;
    font-size: 11.5px;
    color: #92400e;
  }
  .notes-box h3 { color: #b45309; margin-top: 0; }
  .steps-box {
    background: #f0fdf4;
    border: 1px solid #dcfce7;
    border-left: 3px solid #10b981;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 14px;
    font-size: 11.5px;
    color: #166534;
  }
  .steps-box h3 { color: #15803d; margin-top: 0; }
  ul { font-size: 11.5px; padding-left: 18px; margin: 4px 0 0; }
  .disclaimer {
    color: #64748b;
    font-size: 10px;
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    line-height: 1.5;
    text-align: center;
  }
  .footer-brand {
    text-align: center;
    font-size: 10.5px;
    font-weight: 600;
    color: #94a3b8;
    margin-top: 6px;
  }
  .footer-brand strong { color: ${primaryColor}; }
  .pdf-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 58px;
    font-weight: 900;
    color: ${primaryColor};
    opacity: 0.035;
    pointer-events: none;
    white-space: nowrap;
    z-index: 0;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  @media print {
    body { background: #ffffff; padding: 0; margin: 0; }
    .invoice {
      box-shadow: none;
      border: none;
      border-radius: 0;
      max-width: 100%;
      padding: 16px 20px;
    }
    @page { margin: 1cm; }
  }
  `;
}

export function buildQuoteHtml(opts: QuoteOptions): string {
  const brandName = opts.branding?.brandName || "FRELUX SMART CALC";
  const tagline =
    opts.branding?.tagline || "Every Trade. Every Cost. One Platform.";
  const primaryColor = opts.branding?.primaryColor || "#7C3AED";
  const accentColor = opts.branding?.accentColor || "#F97316";
  const watermarkText = brandName;
  const showWatermark = opts.branding?.watermark?.enabled ?? true;

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const refCode = `FLX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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

  const lineRows = opts.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.label)}${
          l.detail ? `<div class="muted">${escapeHtml(l.detail)}</div>` : ""
        }</td><td class="n">${escapeHtml(l.quantity)} ${escapeHtml(
          l.unit,
        )}</td><td class="n">${escapeHtml(l.unit_price)}</td><td class="n">${escapeHtml(
          l.line_total,
        )}</td></tr>`,
    )
    .join("");
  const linesHtml = lineRows
    ? `<h2>Bill of materials</h2>
      <table>
        <thead><tr><th>Item</th><th class="n">Quantity</th><th class="n">Unit price</th><th class="n">Line total</th></tr></thead>
        <tbody>${lineRows}</tbody>
      </table>`
    : "";

  const totalsRows = opts.totals
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

  const footerText =
    opts.footer ??
    "Estimates are indicative and not a formal quote. Unpriced items are reported, never invented.";

  const watermarkHtml = showWatermark
    ? `<div class="pdf-watermark">${escapeHtml(watermarkText)}</div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8">
    <title>${escapeHtml(opts.title)} - ${escapeHtml(brandName)}</title>
    <style>${getBaseStyles(primaryColor, accentColor)}</style></head><body>
    <div class="invoice">
      ${watermarkHtml}
      <div class="header">
        <div class="company">
          <div class="company-name">${escapeHtml(brandName)}</div>
          <div class="company-tagline">${escapeHtml(tagline)}</div>
          <div class="company-info">Smart Construction Estimation &amp; Quantity Surveying</div>
        </div>
        <div class="meta">
          <h1>${escapeHtml(opts.title)}</h1>
          <div class="ref">Ref: ${refCode}</div>
          <div class="date">Date: ${dateStr}</div>
        </div>
      </div>
      <div class="sub">${escapeHtml(opts.subtitle)}</div>
      ${metaHtml}
      ${linesHtml}
      ${totalsHtml}
      ${warningsHtml}
      ${stepsHtml}
      <p class="disclaimer">${escapeHtml(footerText)}</p>
      <div class="footer-brand">Generated by <strong>${escapeHtml(brandName)}</strong> · Smart Construction Estimation</div>
    </div>
    </body></html>`;
}

/**
 * Open the browser print dialog with the quote. If popups are
 * blocked, download a printable HTML file instead.
 */
export function printQuote(opts: QuoteOptions, downloadName: string): void {
  const html = buildQuoteHtml(opts);
  const w = window.open("", "_blank", "width=900,height=720");
  if (!w) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
