/**
 * Printable BOQ.
 *
 * The section/item/table layout comes from the existing print exporter, so a
 * printed studio document matches a printed quote. This module only adds the
 * blocks a studio document owns: assumptions, exclusions, revision and the
 * preliminary/reviewed status line.
 */

import {
  exportBoqToPrintHtml,
  type StandardBoqDocument,
} from "@/lib/finance/boq-standard";
import { formatByCode } from "@/lib/international/currency-format";
import { documentStatusLabel } from "./compile";
import type { BoqStudioDocument } from "./types";
import { verifyPageUrl, verifySealCopy } from "@/lib/blockchain/verify-seal";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A market survey is a different document from a priced bill: the rate and
 * amount columns are blank on purpose, so they are rendered as open cells rather
 * than as zeroes that could be read as a price.
 */
function surveyPrintHtml(studio: BoqStudioDocument): string {
  const rows = studio.sections
    .map((section) => {
      const items = section.items
        .map(
          (item) => `<tr>
      <td>${escapeHtml(item.item_number)}</td>
      <td>${escapeHtml(item.description)}${item.specification ? `<br><span class="spec">${escapeHtml(item.specification)}</span>` : ""}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td class="num">${Number(item.quantity) || 0}</td>
      <td class="num blank"></td>
      <td class="num blank"></td>
    </tr>`,
        )
        .join("");
      return `<tr class="section"><td colspan="6">${escapeHtml(section.code)} ${escapeHtml(section.title)}</td></tr>${items}`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    studio.title || "Market survey",
  )}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 28px; color: #0f172a; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: #64748b; margin-bottom: 14px; }
  .meta { font-size: 12px; margin-bottom: 16px; }
  .meta div { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f1f5f9; padding: 6px; border-bottom: 1px solid #cbd5e1; }
  td { padding: 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .num { text-align: right; }
  .blank { border-bottom: 1px solid #94a3b8; min-width: 90px; }
  .section td { background: #f8fafc; font-weight: 600; }
  .spec { color: #64748b; }
  .note { margin-top: 14px; font-size: 11px; color: #64748b; }
</style></head><body>
<h1>${escapeHtml(studio.title || "Market survey schedule")}</h1>
<p class="sub">Market survey schedule, quantities only, rates to be completed in the market</p>
<div class="meta">
  <div><strong>Reference:</strong> ${escapeHtml(studio.reference || "-")} &nbsp; <strong>Revision:</strong> R${studio.revision}</div>
  <div><strong>Market:</strong> ${escapeHtml(studio.survey?.market_city || "-")} &nbsp; <strong>Survey date:</strong> ${escapeHtml(studio.survey?.survey_date || "-")} &nbsp; <strong>Surveyed by:</strong> ${escapeHtml(studio.survey?.surveyed_by || "-")}</div>
  <div><strong>Currency:</strong> ${escapeHtml(studio.currency)} &nbsp; <strong>Prepared:</strong> ${escapeHtml(studio.prepared_date || "")}</div>
</div>
<table>
  <thead><tr><th>Item</th><th>Description</th><th>Unit</th><th class="num">Qty</th><th class="num">Market rate</th><th class="num">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<p class="note">Complete the market rate and amount columns, then total them. No preliminaries, overhead, contingency, retention or tax are applied to a market survey.</p>
</body></html>`;
}

export function boqStudioPrintHtml(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: { qrDataUrl?: string } = {},
): string {
  if (studio.mode === "market_survey") return surveyPrintHtml(studio);
  const base = exportBoqToPrintHtml(standard);
  const status = escapeHtml(documentStatusLabel(studio));

  const list = (title: string, entries: string[]) =>
    entries.length === 0
      ? ""
      : `<section class="studio-notes"><h3>${title}</h3><ol>${entries
          .map((e) => `<li>${escapeHtml(e)}</li>`)
          .join("")}</ol></section>`;

  const review =
    studio.review.status === "reviewed" && studio.review.reviewer_name
      ? `<section class="studio-notes"><h3>Professional review</h3><p>${escapeHtml(
          `${studio.review.reviewer_name}${studio.review.reviewer_qualification ? `, ${studio.review.reviewer_qualification}` : ""}`,
        )}${studio.review.reviewed_at ? ` — reviewed ${escapeHtml(studio.review.reviewed_at.slice(0, 10))}` : ""}</p>${
          studio.review.note ? `<p>${escapeHtml(studio.review.note)}</p>` : ""
        }</section>`
      : "";

  const block = `<section class="studio-notes studio-meta">
  <p><strong>Status:</strong> ${status}</p>
  <p><strong>Revision:</strong> R${studio.revision} &nbsp; <strong>Prepared:</strong> ${escapeHtml(studio.prepared_date || "")} &nbsp; <strong>Reference:</strong> ${escapeHtml(studio.reference || "-")}</p>
</section>
${list("Assumptions", studio.assumptions)}
${list("Exclusions", studio.exclusions)}
${review}
<style>
  .studio-notes { margin: 18px 0; font-size: 12px; color: #0f172a; }
  .studio-notes h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin: 0 0 6px; }
  .studio-notes ol { padding-left: 18px; margin: 0; }
  .studio-notes li { margin: 2px 0; }
  .studio-meta { border-top: 1px solid #e2e8f0; padding-top: 10px; }
</style>`;

  const seal = options.qrDataUrl ? verifySealHtml(options.qrDataUrl) : "";
  if (base.includes("</body>"))
    return base.replace("</body>", `${block}${seal}</body>`);
  return `${base}${block}${seal}`;
}

/** The FRELUX VERIFY block, printed at the end of the document when enabled. */
function verifySealHtml(qrDataUrl: string, documentLabel = "BOQ"): string {
  const copy = verifySealCopy({ documentLabel });
  const lines = copy.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  return `<section class="frelux-verify">
  <div class="frelux-verify-copy">
    <h3>${escapeHtml(copy.heading)}</h3>
    ${lines}
  </div>
  <img src="${escapeHtml(qrDataUrl)}" alt="FRELUX VERIFY QR code" width="96" height="96" />
</section>
<style>
  .frelux-verify {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin: 22px 0 0;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .frelux-verify-copy h3 {
    margin: 0 0 4px;
    font-size: 11px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #2563eb;
  }
  .frelux-verify-copy p { margin: 2px 0; font-size: 9px; line-height: 1.35; color: #475569; }
  .frelux-verify img { flex: 0 0 auto; }
</style>`;
}

/** Opens the printable document in a new tab, ready for the browser's print dialog. */
export async function openBoqPrint(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: { verify?: boolean } = {},
): Promise<void> {
  let qrDataUrl = "";
  if (options.verify === true) {
    try {
      const { default: QRCode } = await import("qrcode");
      qrDataUrl = await QRCode.toDataURL(verifyPageUrl(), {
        margin: 1,
        width: 240,
        errorCorrectionLevel: "M",
      });
    } catch {
      // QR rendering is a convenience; the printed URL in the copy stays readable.
    }
  }
  const html = boqStudioPrintHtml(
    standard,
    studio,
    qrDataUrl ? { qrDataUrl } : undefined,
  );
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}


/**
 * Summary print view: the same figures as the free PDF, rendered by the browser.
 *
 * It exists because jsPDF cannot shape Arabic or Indic text and has no CJK
 * glyphs. The browser can do all three, so a document whose script the PDF
 * engine cannot draw is printed from HTML instead of being refused.
 */
export function boqSummaryPrintHtml(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): string {
  const { metadata, summary } = standard;
  const cur = metadata.currency || "XXX";
  const fmt = (n: number) => formatByCode(n, cur, { decimals: "native" });
  const row = (label: string, value: number, strong = false) =>
    `<tr${strong ? ' class="strong"' : ""}><td>${escapeHtml(label)}</td><td>${escapeHtml(fmt(value))}</td></tr>`;

  const rows = [
    row("Measured works", summary.measuredWorksTotal),
    summary.preliminariesAmount ? row("Preliminaries", summary.preliminariesAmount) : "",
    summary.contingencyAmount ? row("Contingency", summary.contingencyAmount) : "",
    summary.taxAmount ? row("Tax", summary.taxAmount) : "",
    summary.retentionAmount ? row("Retention / holdback", summary.retentionAmount) : "",
    row("Net payable", summary.netPayableTotal, true),
  ].join("");

  const title = escapeHtml(studio.title || "Bill of Quantities");
  const reference = escapeHtml(studio.reference || "No reference");
  const client = escapeHtml(studio.client?.name || "");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; margin: 0; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #475569; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; }
  td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  tr.strong td { font-weight: 700; border-top: 2px solid #0f172a; }
  .note { margin-top: 18px; font-size: 11px; color: #64748b; line-height: 1.5; }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <p class="meta">${reference} &middot; R${studio.revision}${client ? ` &middot; ${client}` : ""}</p>
</header>
<table>${rows}</table>
<p class="note">Summary preview: line-level quantities, specifications, and rates are omitted. This preliminary estimate is not a tender schedule or professional certification.</p>
<script>window.addEventListener("load", function () { window.print(); });</script>
</body>
</html>`;
}

/**
 * Open an HTML document in a new tab and let the browser print it.
 *
 * Returns false when the popup was blocked, so the caller can say so instead
 * of pretending a window opened.
 */
export function openPrintHtml(html: string): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
