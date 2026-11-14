/**
 * FRELUX Universal Estimate Sharing
 *
 * One share layer for every calculator and estimator — painting,
 * screeding, POP ceiling, tile, structural, carbon, and all 56
 * engines. A page turns its result into a ShareableEstimate (plain
 * strings, already formatted for the user's currency) and gets:
 *
 *   - a WhatsApp share (wa.me deep link, tracked)
 *   - a branded PDF quotation (jsPDF, FRELUX watermark/header/footer,
 *     QR code back to the calculator, line items, totals, notes)
 *   - a copy-to-clipboard text summary
 *
 * House rules:
 *   - The layer never invents numbers: totals, quantities and
 *     warnings come from the engine result exactly as displayed.
 *   - Every shared artifact carries the honest "estimate only"
 *     disclaimer and a link back to the calculator.
 *   - Currency is passed in as pre-formatted display strings; the
 *     layer never re-rates or converts.
 */

import { trackShare } from "@/lib/achievements";
import { SITE_URL } from "@/lib/seo";
import {
  printShareableQuote,
  type QuoteOptions,
} from "@/lib/estimation/quote-export";
import type { ResolvedBranding } from "@/lib/brand-studio";
import { SAFE_FALLBACK_BRANDING } from "@/lib/brand-studio";

// ─────────────────────────────────────────────
// Shareable estimate model
// ─────────────────────────────────────────────

export interface ShareableLineItem {
  section?: string;
  description: string;
  /** Pre-formatted quantity display, e.g. "3 × 20 L" or "42 m²". */
  quantity?: string | null;
  /** Pre-formatted amount in display currency, if the line is priced. */
  amount?: string | null;
}

export interface ShareableEstimate {
  /** What produced this estimate, e.g. "Painting Cost Estimate". */
  kind: string;
  /** Project / client / room name shown at the top. */
  title?: string | null;
  /** Optional estimate reference, e.g. "EST-2026-0042". */
  reference?: string | null;
  /** Input facts shown as a summary block (already formatted). */
  summaryLines: Array<{ label: string; value: string }>;
  /** Material/labour/other line items. */
  lineItems: ShareableLineItem[];
  /** Totals block, in order; the grand total is usually last. */
  totals: Array<{ label: string; value: string; emphasized?: boolean }>;
  /** Warnings / disclaimers from the engine, passed through verbatim. */
  notes?: string[];
  /** Absolute or site-relative URL back to the calculator. */
  link: string;
  /** ISO date shown as "Generated" on the PDF. */
  generatedAt?: string;
}

// ─────────────────────────────────────────────
// WhatsApp text
// ─────────────────────────────────────────────

export function buildEstimateWhatsAppMessage(
  estimate: ShareableEstimate,
): string {
  const lines: string[] = [];
  lines.push(`🏗️ *FRELUX ${estimate.kind}*`);
  if (estimate.title) lines.push(`*Project:* ${estimate.title}`);
  if (estimate.reference) lines.push(`*Ref:* ${estimate.reference}`);
  lines.push("");

  if (estimate.summaryLines.length > 0) {
    for (const s of estimate.summaryLines) {
      lines.push(`*${s.label}:* ${s.value}`);
    }
    lines.push("");
  }

  let currentSection = "";
  const items = estimate.lineItems.filter((i) => i.description?.trim());
  if (items.length > 0) {
    lines.push("*Items:*");
    for (const item of items) {
      if (item.section && item.section !== currentSection) {
        currentSection = item.section;
        lines.push(`_${currentSection}_`);
      }
      const qty = item.quantity ? ` (${item.quantity})` : "";
      const amount = item.amount ? ` — ${item.amount}` : "";
      lines.push(`  • ${item.description}${qty}${amount}`);
    }
    lines.push("");
  }

  for (const t of estimate.totals) {
    if (t.emphasized) {
      lines.push(`*${t.label.toUpperCase()}: ${t.value}*`);
    } else {
      lines.push(`*${t.label}:* ${t.value}`);
    }
  }
  if (estimate.totals.length > 0) lines.push("");

  for (const note of estimate.notes ?? []) lines.push(`⚠️ ${note}`);
  lines.push(
    "_Estimate only. Actual amounts may vary by surface, location and market prices._",
  );
  lines.push("");
  const link = estimate.link.startsWith("http")
    ? estimate.link
    : `${SITE_URL}${estimate.link}`;
  lines.push(`🔗 ${link}`);
  return lines.join("\n");
}

export function shareEstimateOnWhatsApp(estimate: ShareableEstimate): void {
  const message = encodeURIComponent(buildEstimateWhatsAppMessage(estimate));
  window.open(
    `https://wa.me/?text=${message}`,
    "_blank",
    "noopener,noreferrer",
  );
  trackShare();
}

/** Plain-text summary (used by WhatsApp fallback and clipboard copy). */
export function buildEstimatePlainText(estimate: ShareableEstimate): string {
  return buildEstimateWhatsAppMessage(estimate)
    .replace(/\*/g, "")
    .replace(/^[^\n]*\n/, (m) => m) // keep the heading line
    .replace(/_([^_]*)_/g, "$1");
}

export async function copyEstimateSummary(
  estimate: ShareableEstimate,
): Promise<boolean> {
  const text = buildEstimatePlainText(estimate);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Branded PDF
// ─────────────────────────────────────────────

/**
 * Export the estimate.
 *
 * This used to build a second PDF document of its own, which meant a calculator
 * using this button produced a differently laid out quote from one using the
 * shared engine. It now prints the one Frelux quote document, so every
 * calculator's export is the same page.
 */
export async function downloadEstimatePdf(
  estimate: ShareableEstimate,
): Promise<void> {
  const slug = estimate.kind
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  printShareableQuote(
    estimate,
    `frelux-${slug || "estimate"}.html`,
    estimate.notes?.length ? estimate.notes.join(" ") : undefined,
  );
}

export function quoteToShareable(
  opts: QuoteOptions,
  link: string,
  kind?: string,
): ShareableEstimate {
  return {
    kind: kind ?? opts.title.replace(/^FRELUX\s+/i, ""),
    title: opts.subtitle || null,
    summaryLines: (opts.metaRows ?? []).map(([label, value]) => ({
      label,
      value,
    })),
    lineItems: opts.lines.map((l) => ({
      description: l.detail ? `${l.label} (${l.detail})` : l.label,
      quantity:
        l.quantity && l.unit && l.unit !== "included"
          ? `${l.quantity} ${l.unit}`
          : l.quantity || null,
      amount: l.line_total ?? null,
    })),
    totals: opts.totals.map((t) => ({
      label: t.label,
      value: t.value,
      emphasized: t.strong,
    })),
    notes: opts.warnings ?? [],
    link,
    generatedAt: new Date().toISOString(),
  };
}
