/**
 * BOQ PDF export.
 *
 * A paginated, client-ready document: branded header, project and party blocks,
 * numbered items grouped by section, commercial summary, assumptions and
 * exclusions, page numbers and a revision stamp on every page. The preliminary
 * or reviewed status is printed as well, because an automatically generated BOQ
 * must never read as professionally approved.
 */

import { formatByCode } from "@/lib/international/currency-format";
import type { StandardBoqDocument } from "@/lib/finance/boq-standard";
import { documentStatusLabel } from "./compile";
import type { BoqStudioDocument } from "./types";

const BRAND = { r: 15, g: 23, b: 42 };
const ACCENT = { r: 37, g: 99, b: 235 };
const MUTED = { r: 100, g: 116, b: 139 };

export interface BoqPdfOptions {
  preparedForLabel?: string;
  /** Template driven: hide rate columns a market does not tender openly. */
  showMaterialRate?: boolean;
  showLabourRate?: boolean;
}

function money(amount: number, currency: string): string {
  return formatByCode(amount, currency || "XXX", { decimals: 2 });
}

export async function buildBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: BoqPdfOptions = {},
): Promise<import("jspdf").jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const currency = standard.metadata.currency;

  const status = documentStatusLabel(studio);

  let y = margin;

  const drawHeader = () => {
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(0, 0, pageWidth, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("FRELUX", margin, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Bill of Quantities", margin + 26, 11);
    doc.text(
      `${studio.reference || "No reference"}  ·  R${studio.revision}`,
      pageWidth - margin,
      11,
      {
        align: "right",
      },
    );
    y = 26;
    doc.setTextColor(0, 0, 0);
  };

  const drawFooter = () => {
    const page = doc.getNumberOfPages();
    const total = doc.getNumberOfPages();
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(status, margin, pageHeight - 8);
    doc.text(
      `${studio.prepared_date || new Date().toISOString().slice(0, 10)}  ·  ${currency}  ·  ${studio.measurement_system}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
    doc.text(`Page ${page} of ${total}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  };

  const ensure = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      drawFooter();
      doc.addPage();
      drawHeader();
    }
  };

  drawHeader();

  // Project block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(studio.title || "Untitled Bill of Quantities", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (studio.description) {
    const desc = doc.splitTextToSize(studio.description, contentWidth);
    doc.text(desc, margin, y);
    y += desc.length * 4.2 + 1;
  }

  const metaRows: Array<[string, string]> = [
    ["Client", studio.client.name || "-"],
    ["Contractor", studio.contractor.name || "-"],
    ["Location", studio.client.address || "-"],
    ["Prepared by", studio.prepared_by || "-"],
    ["Standard", studio.standard],
    ["Revision", `R${studio.revision}`],
    ["Prepared date", studio.prepared_date || "-"],
    ["Status", status],
  ];
  const colWidth = contentWidth / 4;
  metaRows.forEach(([label, value], idx) => {
    const col = idx % 4;
    const rowY = y + Math.floor(idx / 4) * 9;
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), margin + col * colWidth, rowY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    const valueLines = doc.splitTextToSize(value, colWidth - 4) as string[];
    doc.text(valueLines[0] ?? "-", margin + col * colWidth, rowY + 4);
  });
  y += Math.ceil(metaRows.length / 4) * 9 + 4;

  const showMaterial = options.showMaterialRate !== false;
  const showLabour = options.showLabourRate !== false;

  const columns = (() => {
    const cols: Array<{
      label: string;
      width: number;
      align: "left" | "right";
    }> = [
      { label: "Item", width: 18, align: "left" },
      { label: "Description", width: 0, align: "left" },
      { label: "Unit", width: 14, align: "left" },
      { label: "Qty", width: 18, align: "right" },
    ];
    if (showMaterial)
      cols.push({ label: "Material", width: 24, align: "right" });
    if (showLabour) cols.push({ label: "Labour", width: 24, align: "right" });
    cols.push({ label: "Rate", width: 24, align: "right" });
    cols.push({ label: "Amount", width: 30, align: "right" });
    const fixed = cols.reduce((sum, c) => sum + c.width, 0);
    const descCol = cols.find((c) => c.label === "Description");
    if (descCol) descCol.width = contentWidth - fixed;
    return cols;
  })();

  const drawTableHead = () => {
    ensure(14);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    let x = margin + 1;
    columns.forEach((c) => {
      doc.text(c.label, c.align === "right" ? x + c.width - 2 : x, y + 1, {
        align: c.align === "right" ? "right" : "left",
      });
      x += c.width;
    });
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
  };

  drawTableHead();

  for (const section of standard.sections) {
    ensure(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.text(`${section.code}  ${section.title}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    for (const sub of section.subSections) {
      for (const item of sub.items) {
        const descLines = doc.splitTextToSize(
          item.description,
          columns[1].width - 2,
        ) as string[];
        const rowHeight = Math.max(6, descLines.length * 3.6 + 2.4);
        if (y + rowHeight > pageHeight - 20) {
          drawFooter();
          doc.addPage();
          drawHeader();
          drawTableHead();
        }
        doc.setFontSize(8);
        let x = margin + 1;
        doc.text(item.itemNumber, x, y);
        x += columns[0].width;
        doc.text(descLines, x, y);
        x += columns[1].width;
        doc.text(item.unit, x, y);
        x += columns[2].width;
        doc.text(String(item.quantity), x + columns[3].width - 2, y, {
          align: "right",
        });
        x += columns[3].width;
        let ci = 4;
        if (showMaterial) {
          doc.text(
            money(item.materialRate, currency),
            x + columns[ci].width - 2,
            y,
            { align: "right" },
          );
          x += columns[ci].width;
          ci += 1;
        }
        if (showLabour) {
          doc.text(
            money(item.laborRate, currency),
            x + columns[ci].width - 2,
            y,
            { align: "right" },
          );
          x += columns[ci].width;
          ci += 1;
        }
        doc.text(money(item.unitRate, currency), x + columns[ci].width - 2, y, {
          align: "right",
        });
        x += columns[ci].width;
        doc.setFont("helvetica", "bold");
        doc.text(
          money(item.totalCost, currency),
          x + columns[ci].width - 2,
          y,
          { align: "right" },
        );
        doc.setFont("helvetica", "normal");
        y += rowHeight;
      }
    }

    ensure(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Section ${section.code} total`, margin + contentWidth - 40, y, {
      align: "right",
    });
    doc.text(
      money(section.sectionTotal, currency),
      margin + contentWidth - 1,
      y,
      { align: "right" },
    );
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  // Commercial summary
  ensure(50);
  y += 2;
  doc.setDrawColor(220, 225, 232);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  const summaryRows: Array<[string, number, boolean?]> = [
    ["Measured works", standard.summary.measuredWorksTotal],
    ["Preliminaries", standard.summary.preliminariesAmount],
    ["Subtotal before overhead & profit", standard.summary.subtotalBeforeOhp],
    ["Overhead & profit", standard.summary.overheadProfitAmount],
    ["Contingency", standard.summary.contingencyAmount],
    ["Subtotal before tax", standard.summary.subtotalBeforeTax],
    [standard.summary.taxCategory, standard.summary.taxAmount],
    ["Gross total", standard.summary.grossTotal, true],
  ];
  if (standard.summary.retentionAmount > 0) {
    summaryRows.push([
      "Retention / holdback",
      standard.summary.retentionAmount,
    ]);
    summaryRows.push(["Net payable", standard.summary.netPayableTotal, true]);
  }

  summaryRows.forEach(([label, value, strong]) => {
    ensure(7);
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setFontSize(strong ? 9 : 8.5);
    doc.text(label, margin + contentWidth - 70, y, { align: "right" });
    doc.text(money(value, currency), margin + contentWidth - 1, y, {
      align: "right",
    });
    y += 5.5;
  });

  const notesBlock = (title: string, entries: string[]) => {
    if (entries.length === 0) return;
    y += 4;
    ensure(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    entries.forEach((entry, index) => {
      const lines = doc.splitTextToSize(
        `${index + 1}. ${entry}`,
        contentWidth - 4,
      ) as string[];
      ensure(lines.length * 3.8 + 2);
      doc.text(lines, margin + 1, y);
      y += lines.length * 3.8 + 1.4;
    });
  };

  notesBlock("Assumptions", studio.assumptions);
  notesBlock("Exclusions", studio.exclusions);

  if (studio.review.status === "reviewed" && studio.review.reviewer_name) {
    y += 6;
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Professional review", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `${studio.review.reviewer_name}${studio.review.reviewer_qualification ? `, ${studio.review.reviewer_qualification}` : ""}`,
      margin,
      y,
    );
    y += 4;
    if (studio.review.reviewed_at)
      doc.text(`Reviewed ${studio.review.reviewed_at.slice(0, 10)}`, margin, y);
    if (studio.review.note) {
      y += 4;
      const lines = doc.splitTextToSize(
        studio.review.note,
        contentWidth,
      ) as string[];
      doc.text(lines, margin, y);
    }
  }

  drawFooter();
  return doc;
}

export async function downloadBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: BoqPdfOptions = {},
): Promise<void> {
  const doc = await buildBoqPdf(standard, studio, options);
  const safe = (studio.reference || studio.title || "boq")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  doc.save(`${safe || "boq"}-R${studio.revision}.pdf`);
}
