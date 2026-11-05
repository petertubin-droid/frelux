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
import { documentStatusLabel } from "./compile";
import type { BoqStudioDocument } from "./types";

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

  if (base.includes("</body>"))
    return base.replace("</body>", `${block}</body>`);
  return `${base}${block}`;
}

/** Opens the printable document in a new tab, ready for the browser's print dialog. */
export function openBoqPrint(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): void {
  const html = boqStudioPrintHtml(standard, studio);
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
