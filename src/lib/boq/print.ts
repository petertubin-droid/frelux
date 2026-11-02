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

export function boqStudioPrintHtml(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
): string {
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
