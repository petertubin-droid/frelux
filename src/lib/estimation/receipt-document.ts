/**
 * The FRELUX receipt: one document shell for every printable export.
 *
 * Every estimator quote, invoice, BOQ, report and receipt wraps its body in
 * this shell, so the header (brand mark, name, tagline), the faint background
 * mark, the type scale, the table and totals styling and the footer are
 * identical by construction. A page cannot drift from the house style because
 * it never writes its own <html>.
 *
 * The FRELUX mark is embedded as a data URL on purpose. A remote logo raced
 * the browser's print snapshot (mobile "Save as PDF" captured the page before
 * the image arrived) and broke whenever the host redirected, so saved PDFs
 * lost the header mark and the watermark. A brand's own uploaded logo is still
 * a URL; printReceiptHtml() waits for it to decode before the dialog opens.
 *
 * Pure HTML generation, no I/O. The print side effect is printReceiptHtml().
 */

import type { ResolvedBranding } from "@/lib/brand-studio";
import { FRELUX_LOGO_DATA_URL } from "@/lib/pdf-logo-data";

export function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getReceiptStyles(
  primaryColor: string,
  accentColor: string,
): string {
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
  .conversion-note { margin: 8px 0 0; font-size: 11px; line-height: 1.6; color: #475569; }
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
  .brand-mark {
    height: 32px;
    width: auto;
    display: block;
    margin-bottom: 8px;
  }
  .pdf-watermark--mark {
    transform: translate(-50%, -50%);
    opacity: 0.07;
  }
  .pdf-watermark--mark img {
    width: 480px;
    max-width: 70%;
    height: auto;
    display: block;
  }
  .invoice > *:not(.pdf-watermark) { position: relative; z-index: 1; }
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
    .brand-mark { height: 26px; }
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

export interface ReceiptShellOptions {
  /** Document heading, top right (e.g. "FRELUX Painting Cost Estimate"). */
  title: string;
  /** Pre-rendered body HTML. Callers escape their own values. */
  bodyHtml: string;
  /** One-line context shown in the highlighted strip under the header. */
  subtitle?: string;
  /** Overrides the generated reference code (e.g. an invoice number). */
  reference?: string;
  /** Overrides today's date (already formatted). */
  dateLabel?: string;
  /** Small print above the brand footer. */
  footer?: string;
  /** Extra CSS appended after the house styles (layout niceties only). */
  extraCss?: string;
  branding?: Partial<ResolvedBranding>;
}

export const DEFAULT_RECEIPT_FOOTER =
  "Estimates are indicative and not a formal quote. Unpriced items are reported, never invented.";

/** Wrap a body in the FRELUX receipt: mark, watermark, header, footer. */
export function buildReceiptDocument(opts: ReceiptShellOptions): string {
  const brandName = opts.branding?.brandName || "FRELUX SMART CALC";
  const tagline =
    opts.branding?.tagline || "Every Trade. Every Cost. One Platform.";
  const primaryColor = opts.branding?.primaryColor || "#7C3AED";
  const accentColor = opts.branding?.accentColor || "#F97316";
  const showWatermark = opts.branding?.watermark?.enabled ?? true;

  const dateStr =
    opts.dateLabel ??
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const refCode =
    opts.reference ??
    `FLX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const logoSource = opts.branding?.logoUrl || FRELUX_LOGO_DATA_URL;
  const brandMarkHtml = `<img class="brand-mark" src="${escapeHtml(logoSource)}" alt="${escapeHtml(brandName)}" />`;
  // A document with no brand logo of its own gets the FRELUX mark as the faint
  // background; a branded one keeps its wordmark watermark.
  const watermarkHtml = !showWatermark
    ? ""
    : opts.branding?.logoUrl
      ? `<div class="pdf-watermark">${escapeHtml(brandName)}</div>`
      : `<div class="pdf-watermark pdf-watermark--mark"><img src="${escapeHtml(logoSource)}" alt="" /></div>`;

  const footerText = opts.footer ?? DEFAULT_RECEIPT_FOOTER;
  const subHtml = opts.subtitle
    ? `<div class="sub">${escapeHtml(opts.subtitle)}</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(opts.title)} - ${escapeHtml(brandName)}</title>
    <style>${getReceiptStyles(primaryColor, accentColor)}${opts.extraCss ?? ""}</style></head><body>
    <div class="invoice">
      ${watermarkHtml}
      <div class="header">
        <div class="company">
          ${brandMarkHtml}
          <div class="company-name">${escapeHtml(brandName)}</div>
          <div class="company-tagline">${escapeHtml(tagline)}</div>
          <div class="company-info">Smart Construction Estimation &amp; Quantity Surveying</div>
        </div>
        <div class="meta">
          <h1>${escapeHtml(opts.title)}</h1>
          <div class="ref">Ref: ${escapeHtml(refCode)}</div>
          <div class="date">Date: ${escapeHtml(dateStr)}</div>
        </div>
      </div>
      ${subHtml}
      ${opts.bodyHtml}
      <p class="disclaimer">${escapeHtml(footerText)}</p>
      <div class="footer-brand">Generated by <strong>${escapeHtml(brandName)}</strong> · Smart Construction Estimation</div>
    </div>
    </body></html>`;
}

/** Table helpers so ad-hoc exports render rows in the receipt's own markup. */
export function receiptSection(title: string, innerHtml: string): string {
  return `<h2>${escapeHtml(title)}</h2>${innerHtml}`;
}

export function receiptTable(
  headers: Array<{ label: string; numeric?: boolean }>,
  rows: string[][],
): string {
  const head = headers
    .map(
      (h) => `<th${h.numeric ? ' class="n"' : ""}>${escapeHtml(h.label)}</th>`,
    )
    .join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c, i) =>
              `<td${headers[i]?.numeric ? ' class="n"' : ""}>${escapeHtml(c)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function receiptKeyValues(rows: Array<[string, string]>): string {
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td><b>${escapeHtml(k)}:</b></td><td>${escapeHtml(String(v))}</td></tr>`,
    )
    .join("");
  return body ? `<table class="meta meta-table">${body}</table>` : "";
}

export function receiptTotals(
  rows: Array<{ label: string; value: string; strong?: boolean }>,
): string {
  const body = rows
    .map(
      (t) =>
        `<tr class="${t.strong ? "grand" : "total-row"}"><td>${escapeHtml(t.label)}</td><td class="n">${escapeHtml(t.value)}</td></tr>`,
    )
    .join("");
  return body ? `<table class="meta totals-table">${body}</table>` : "";
}

export function receiptNote(
  heading: string,
  items: string[],
  tone: "notes" | "steps" = "notes",
): string {
  if (!items.length) return "";
  return `<div class="${tone === "steps" ? "steps-box" : "notes-box"}"><h3>${escapeHtml(heading)}</h3><ul>${items
    .map((i) => `<li>${escapeHtml(i)}</li>`)
    .join("")}</ul></div>`;
}

/**
 * Open the print dialog only after every image in the document has decoded.
 * Calling print() straight after document.write() let browsers snapshot the
 * page before the logo painted, so saved PDFs came out without it. Capped so a
 * dead image link can never hold the dialog hostage.
 */
export function printWhenImagesReady(w: Window, maxWaitMs = 2500): void {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    try {
      w.print();
    } catch {
      /* window closed before printing */
    }
  };
  try {
    const images = Array.from(w.document.images ?? []);
    const pending = images.filter((img) => !img.complete);
    if (pending.length === 0) {
      // Everything is already decoded (embedded data URLs): print on the next
      // paint where the platform offers one, otherwise straight away.
      if (typeof w.requestAnimationFrame === "function") {
        w.requestAnimationFrame(() => w.requestAnimationFrame(go));
      } else {
        go();
      }
      return;
    }
    let remaining = pending.length;
    const settle = () => {
      remaining -= 1;
      if (remaining <= 0) go();
    };
    pending.forEach((img) => {
      img.addEventListener("load", settle, { once: true });
      img.addEventListener("error", settle, { once: true });
    });
    setTimeout(go, maxWaitMs);
  } catch {
    go();
  }
}

/**
 * Open the receipt in a print window (the user saves it as PDF from there).
 * Returns false when the browser blocked the popup, so the caller can show a
 * real message instead of a silent no-op.
 */
export function printReceiptHtml(html: string): boolean {
  const w = window.open("", "_blank", "width=900,height=720");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  printWhenImagesReady(w);
  return true;
}

/** Download the receipt as an HTML file (popup-blocked fallback). */
export function downloadReceiptHtml(html: string, downloadName: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
}
