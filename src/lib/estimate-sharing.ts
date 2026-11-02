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

import QRCode from "qrcode";
import { trackShare } from "@/lib/achievements";
import { SITE_URL } from "@/lib/seo";
import type { ResolvedBranding } from "@/lib/brand-studio";
import { SAFE_FALLBACK_BRANDING } from "@/lib/brand-studio";
import {
  applyJspdfWatermark,
  applyJspdfHeader,
  applyJspdfFooter,
} from "@/lib/pdf-branding";

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

export function buildEstimateWhatsAppMessage(estimate: ShareableEstimate): string {
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
  lines.push("_Estimate only. Actual amounts may vary by surface, location and market prices._");
  lines.push("");
  const link = estimate.link.startsWith("http") ? estimate.link : `${SITE_URL}${estimate.link}`;
  lines.push(`🔗 ${link}`);
  return lines.join("\n");
}

export function shareEstimateOnWhatsApp(estimate: ShareableEstimate): void {
  const message = encodeURIComponent(buildEstimateWhatsAppMessage(estimate));
  window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  trackShare();
}

/** Plain-text summary (used by WhatsApp fallback and clipboard copy). */
export function buildEstimatePlainText(estimate: ShareableEstimate): string {
  return buildEstimateWhatsAppMessage(estimate)
    .replace(/\*/g, "")
    .replace(/^[^\n]*\n/, (m) => m) // keep the heading line
    .replace(/_([^_]*)_/g, "$1");
}

export async function copyEstimateSummary(estimate: ShareableEstimate): Promise<boolean> {
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

export interface EstimatePdfOptions {
  branding?: ResolvedBranding;
  /** File name without extension. */
  fileName?: string;
}

function estimateFileName(estimate: ShareableEstimate): string {
  const slug = estimate.kind
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const stamp = (estimate.generatedAt ? new Date(estimate.generatedAt) : new Date())
    .toISOString()
    .slice(0, 10);
  return `Frelux_${slug || "Estimate"}_${stamp}`;
}

/**
 * Build the branded estimate PDF. Returns the jsPDF instance so
 * callers can save it, open it, or attach it to an email.
 */
export async function buildEstimatePdfDoc(
  estimate: ShareableEstimate,
  options: EstimatePdfOptions = {},
): Promise<import("jspdf").jsPDF> {
  const { jsPDF } = await import("jspdf");
  const branding = options.branding ?? SAFE_FALLBACK_BRANDING;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const ink = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const inkHex = (hex: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
    if (!m) return;
    ink(parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16));
  };

  applyJspdfWatermark(doc, branding, pageWidth, pageHeight);
  let y = applyJspdfHeader(doc, branding, null, pageWidth, margin, 10);

  // ── Title block ──
  ink(24, 24, 27);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(estimate.kind, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  ink(110, 110, 115);
  const generated = estimate.generatedAt
    ? new Date(estimate.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  doc.text(`Generated ${generated}`, margin, y);
  if (estimate.reference) {
    doc.text(`Ref: ${estimate.reference}`, pageWidth - margin, y, { align: "right" });
  }
  y += 8;

  if (estimate.title) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    ink(24, 24, 27);
    doc.text(estimate.title, margin, y);
    y += 8;
  }

  // ── Input summary ──
  if (estimate.summaryLines.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    ink(24, 24, 27);
    doc.text("Project inputs", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const s of estimate.summaryLines) {
      if (y > pageHeight - 60) {
        applyJspdfFooter(doc, branding, pageWidth, pageHeight, margin);
        doc.addPage();
        applyJspdfWatermark(doc, branding, pageWidth, pageHeight);
        y = 20;
      }
      ink(110, 110, 115);
      doc.text(`${s.label}:`, margin, y);
      ink(24, 24, 27);
      doc.text(String(s.value), margin + 55, y);
      y += 5;
    }
    y += 4;
  }

  // ── Line items ──
  const items = estimate.lineItems.filter((i) => i.description?.trim());
  if (items.length > 0) {
    if (y > pageHeight - 70) {
      applyJspdfFooter(doc, branding, pageWidth, pageHeight, margin);
      doc.addPage();
      applyJspdfWatermark(doc, branding, pageWidth, pageHeight);
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    ink(24, 24, 27);
    doc.text("Items", margin, y);
    y += 6;

    let currentSection = "";
    for (const item of items) {
      if (y > pageHeight - 45) {
        applyJspdfFooter(doc, branding, pageWidth, pageHeight, margin);
        doc.addPage();
        applyJspdfWatermark(doc, branding, pageWidth, pageHeight);
        y = 20;
      }
      if (item.section && item.section !== currentSection) {
        currentSection = item.section;
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(9);
        inkHex(branding.primaryColor);
        doc.text(currentSection, margin, y);
        y += 5;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      ink(24, 24, 27);
      const qty = item.quantity ? `  (${item.quantity})` : "";
      const desc = `${item.description}${qty}`;
      const descLines = doc.splitTextToSize(desc, pageWidth - margin * 2 - 42);
      doc.text(descLines, margin, y);
      if (item.amount) {
        doc.text(item.amount, pageWidth - margin, y, { align: "right" });
      }
      y += descLines.length * 4.5 + 2.5;
    }
    y += 4;
  }

  // ── Totals ──
  if (estimate.totals.length > 0) {
    if (y > pageHeight - 70) {
      applyJspdfFooter(doc, branding, pageWidth, pageHeight, margin);
      doc.addPage();
      applyJspdfWatermark(doc, branding, pageWidth, pageHeight);
      y = 20;
    }
    const boxY = y;
    const boxH = estimate.totals.length * 7 + 8;
    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(branding.primaryColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, boxY, pageWidth - margin * 2, boxH, 2, 2, "FD");
    y = boxY + 7;
    for (const t of estimate.totals) {
      doc.setFont("helvetica", t.emphasized ? "bold" : "normal");
      doc.setFontSize(t.emphasized ? 12 : 10);
      ink(24, 24, 27);
      doc.text(t.label, margin + 5, y);
      doc.text(t.value, pageWidth - margin - 5, y, { align: "right" });
      y += t.emphasized ? 8 : 6;
    }
    y += 6;
  }

  // ── Notes / disclaimer ──
  const disclaimers = [
    ...(estimate.notes ?? []),
    "Estimate only. Actual amounts may vary by surface, location and market prices.",
  ];
  if (y > pageHeight - 60) {
    applyJspdfFooter(doc, branding, pageWidth, pageHeight, margin);
    doc.addPage();
    applyJspdfWatermark(doc, branding, pageWidth, pageHeight);
    y = 20;
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  ink(120, 120, 125);
  for (const note of disclaimers) {
    const wrapped = doc.splitTextToSize(note, pageWidth - margin * 2 - 30);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4 + 1;
  }

  // ── QR code back to the calculator ──
  try {
    const link = estimate.link.startsWith("http") ? estimate.link : `${SITE_URL}${estimate.link}`;
    const qrDataUrl = await QRCode.toDataURL(link, { width: 160, margin: 1 });
    doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 22, pageHeight - 42, 22, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    ink(150, 150, 150);
    doc.text("Open calculator", pageWidth - margin - 11, pageHeight - 17, { align: "center" });
  } catch {
    /* QR is a nicety: the estimate ships without it rather than failing the export. */
  }

  applyJspdfFooter(doc, branding, pageWidth, pageHeight, margin);
  return doc;
}

/** Build and immediately download the estimate PDF. */
export async function downloadEstimatePdf(
  estimate: ShareableEstimate,
  options: EstimatePdfOptions = {},
): Promise<void> {
  const doc = await buildEstimatePdfDoc(estimate, options);
  const name = options.fileName ?? estimateFileName(estimate);
  doc.save(`${name}.pdf`);
}

/** Build the PDF and open it in a new tab (for print/preview). */
export async function openEstimatePdf(
  estimate: ShareableEstimate,
  options: EstimatePdfOptions = {},
): Promise<void> {
  const doc = await buildEstimatePdfDoc(estimate, options);
  const name = options.fileName ?? estimateFileName(estimate);
  doc.output("dataurlnewwindow", { filename: `${name}.pdf` });
}

// ─────────────────────────────────────────────
// QuoteOptions adapter (shared with printQuote)
// ─────────────────────────────────────────────

import type { QuoteOptions } from "@/lib/estimation/quote-export";

/**
 * Convert a printQuote payload into a ShareableEstimate, so every
 * page that already exports a professional quote gets WhatsApp +
 * PDF sharing from the same data. Money strings pass through
 * exactly as formatted for the visitor's market.
 */
export function quoteToShareable(
  opts: QuoteOptions,
  link: string,
  kind?: string,
): ShareableEstimate {
  return {
    kind: kind ?? opts.title.replace(/^FRELUX\s+/i, ""),
    title: opts.subtitle || null,
    summaryLines: (opts.metaRows ?? []).map(([label, value]) => ({ label, value })),
    lineItems: opts.lines.map((l) => ({
      description: l.detail ? `${l.label} (${l.detail})` : l.label,
      quantity: l.quantity && l.unit && l.unit !== "included" ? `${l.quantity} ${l.unit}` : l.quantity || null,
      amount: l.line_total ?? null,
    })),
    totals: opts.totals.map((t) => ({ label: t.label, value: t.value, emphasized: t.strong })),
    notes: opts.warnings ?? [],
    link,
    generatedAt: new Date().toISOString(),
  };
}
