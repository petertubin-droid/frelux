/**
 * Shared printable-quote builder for Frelux estimation engines.
 *
 * Every estimator page offers the same professional export: a
 * print-ready quote document (print dialog, with a download
 * fallback when popups are blocked). Pages pre-format their money
 * strings with the site-wide currency layer (formatCurrency), so
 * quotes render in the visitor's market currency.
 *
 * Pure HTML generation: no I/O, fully testable. The print/export
 * side effect lives in printQuote().
 */

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
}

const BASE_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 15px; margin: 18px 0 6px; }
  h3 { font-size: 13px; margin: 14px 0 4px; }
  .sub { color: #555; font-size: 12px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { border-bottom: 2px solid #111; text-transform: uppercase; font-size: 10px; }
  .n { text-align: right; }
  .muted { color: #777; font-size: 11px; }
  .total-row { font-size: 14px; font-weight: bold; }
  .grand { font-size: 16px; font-weight: bold; }
  .disclaimer { color: #777; font-size: 10px; margin-top: 24px; }
  ul { font-size: 12px; padding-left: 18px; }
  .meta td { border: none; padding: 2px 8px 2px 0; }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildQuoteHtml(opts: QuoteOptions): string {
  const metaRows = opts.metaRows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td><b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}</td></tr>`,
    )
    .join("");
  const metaHtml = metaRows
    ? `<h2>Summary</h2><table class="meta">${metaRows}</table>`
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
    ? `<h2>Totals</h2><table class="meta">${totalsRows}</table>`
    : "";

  const warningsHtml = opts.warnings?.length
    ? `<h3>Notes</h3><ul>${opts.warnings
        .map((w) => `<li>${escapeHtml(w)}</li>`)
        .join("")}</ul>`
    : "";

  const stepsHtml = opts.steps?.length
    ? `<h3>How this was determined</h3><ul>${opts.steps
        .map(
          (s) =>
            `<li><b>${escapeHtml(s.label)}:</b> ${escapeHtml(s.detail)}</li>`,
        )
        .join("")}</ul>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8">
    <title>${escapeHtml(opts.title)}</title>
    <style>${BASE_STYLES}</style></head><body>
    <h1>${escapeHtml(opts.title)}</h1>
    <div class="sub">${escapeHtml(opts.subtitle)}</div>
    ${metaHtml}
    ${linesHtml}
    ${totalsHtml}
    ${warningsHtml}
    ${stepsHtml}
    <p class="disclaimer">${escapeHtml(
      opts.footer ??
        "Estimates are indicative and not a formal quote. Unpriced items are reported, never invented.",
    )}</p>
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
