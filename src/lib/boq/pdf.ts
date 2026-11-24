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
import { saveSealedPdf } from "@/lib/pdf-seal";
import { drawFreluxMark, drawFreluxWatermark } from "@/lib/pdf-logo";
import {
  VERIFY_BLOCK_HEIGHT,
  createVerifyCopyToken,
  drawVerifySeal,
  verifySealBottomY,
} from "@/lib/blockchain/verify-seal";
import type { BoqStudioDocument } from "./types";
import type { ResolvedBranding } from "@/lib/brand-studio";
import { applyJspdfHeader, applyJspdfWatermark } from "@/lib/pdf-branding";
import {
  UnrenderableScriptError,
  hasUnrenderableScript,
  needsUnicodeFont,
  registerUnicodeFont,
} from "./fonts";

const BRAND = { r: 15, g: 23, b: 42 };
const ACCENT = { r: 37, g: 99, b: 235 };
const MUTED = { r: 100, g: 116, b: 139 };

export interface BoqPdfOptions {
  preparedForLabel?: string;
  /** Template driven: hide rate columns a market does not tender openly. */
  showMaterialRate?: boolean;
  showLabourRate?: boolean;
  stampOnBlockchain?: boolean;
  /**
   * Print the FRELUX VERIFY seal (QR) on the document. Default OFF: the seal
   * and its registration only happen when the user turns the toggle on.
   */
  verify?: boolean;
  /** Token printed in the QR; when set, the export also hosts a copy. */
  copyToken?: string;
  /** Summary preview hides line-level quantities, rates, and specifications. */
  summaryOnly?: boolean;
  /** Use the BOQ contractor identity as the paid export header brand. */
  customBranding?: boolean;
  /** User brand profile, when Brand Studio access is enabled. */
  branding?: ResolvedBranding;
}

function money(amount: number, currency: string): string {
  // The currency's own minor units: JPY and KRW have none, so a yen figure
  // prints 1,234 rather than 1,234.00. Others keep two decimals.
  return formatByCode(amount, currency || "XXX", { decimals: "native" });
}

/**
 * Fit the contractor name into the header without running into the document
 * title at margin + 26. A long legal name (or a longer translation of it) is
 * ellipsised rather than allowed to overlap the title.
 */
function fitHeaderBrand(
  doc: { getTextWidth: (text: string) => number; setFont: (f: string, s: string) => void; setFontSize: (n: number) => void },
  brand: string,
  maxWidth: number,
): string {
  if (doc.getTextWidth(brand) <= maxWidth) return brand;
  let trimmed = brand;
  while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}…`) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
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
  const isSurvey = studio.mode === "market_survey";
  const allItems = standard.sections.flatMap((section) =>
    section.subSections.flatMap((sub) => sub.items),
  );
  const pricedLines = allItems.filter((item) => item.unitRate > 0).length;
  /** A survey leaves an uncollected price blank rather than printing a zero. */
  const rateText = (value: number) =>
    isSurvey && !(value > 0) ? "TBC" : money(value, currency);

  // One decision for the whole document: jsPDF cannot mix families per run
  // without re-measuring every string, and a document is written in one script.
  const documentText = [
    studio.title,
    studio.reference,
    studio.description,
    studio.client?.name,
    studio.client?.address,
    studio.contractor?.name,
    ...(studio.assumptions ?? []),
    ...(studio.exclusions ?? []),
    ...standard.sections.flatMap((section) => [
      section.code,
      section.title,
      ...section.subSections.flatMap((sub) => [
        sub.title,
        ...sub.items.flatMap((item) => [item.description, item.specificationRef]),
      ]),
    ]),
  ]
    .filter(Boolean)
    .join(" ");

  if (hasUnrenderableScript(documentText)) throw new UnrenderableScriptError();
  const fontFamily = needsUnicodeFont(documentText)
    ? await registerUnicodeFont(doc)
    : "helvetica";

  let y = margin;

  const drawHeader = () => {
    if (options.branding) {
      if (options.branding.watermark.enabled) {
        applyJspdfWatermark(doc, options.branding, pageWidth, pageHeight);
      }
      y = applyJspdfHeader(
        doc,
        options.branding,
        options.branding.templateConfig,
        pageWidth,
        margin,
        4,
      );
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8);
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      doc.text(
        `${isSurvey ? "Market survey schedule" : "Bill of Quantities"}  ·  ${studio.reference || "No reference"}  ·  R${studio.revision}`,
        margin,
        y,
      );
      y += 8;
      doc.setTextColor(0, 0, 0);
    } else {
      // Faint FRELUX mark first, so it always sits under table content.
      drawFreluxWatermark(doc, { pageWidth, pageHeight, opacity: 0.05 });
      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
      doc.rect(0, 0, pageWidth, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(13);
      const headerBrand = options.customBranding
        ? fitHeaderBrand(
            doc,
            studio.contractor.name.trim() || "FRELUX",
            26 - 3,
          )
        : "FRELUX";
      doc.text(headerBrand, margin, 11);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(9);
      doc.text(
        isSurvey ? "Market survey schedule" : "Bill of Quantities",
        margin + 26,
        11,
      );
      const mark = drawFreluxMark(doc, {
        pageWidth,
        margin,
        heightMm: 7.5,
        top: 5.2,
        plate: true,
      });
      doc.text(
        `${studio.reference || "No reference"}  ·  R${studio.revision}`,
        pageWidth - margin - (mark ? mark.width + 6 : 0),
        11,
        { align: "right" },
      );
      y = 26;
      doc.setTextColor(0, 0, 0);
    }
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
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(14);
  doc.text(
    studio.title ||
      (isSurvey ? "Untitled market survey" : "Untitled Bill of Quantities"),
    margin,
    y,
  );
  y += 6;
  doc.setFont(fontFamily, "normal");
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
    ...(isSurvey
      ? ([
          ["Document type", "Market survey"],
          ["Market", studio.survey?.market_city || "-"],
          ["Rates captured", `${pricedLines}/${allItems.length} lines`],
          ["Survey date", studio.survey?.survey_date || "-"],
          ["Surveyed by", studio.survey?.surveyed_by || "-"],
        ] as Array<[string, string]>)
      : []),
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
    if (options.summaryOnly) {
      return [
        { label: "Section", width: contentWidth - 54, align: "left" as const },
        { label: "Items", width: 18, align: "right" as const },
        { label: "Section total", width: 36, align: "right" as const },
      ];
    }
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
    doc.setFont(fontFamily, "bold");
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
    doc.setFont(fontFamily, "normal");
    doc.setTextColor(0, 0, 0);
  };

  drawTableHead();

  if (options.summaryOnly) {
    const note =
      "Summary preview: line-level quantities, specifications, and rates are omitted. This preliminary estimate is not a tender schedule or professional certification.";
    const noteLines = doc.splitTextToSize(note, contentWidth) as string[];
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(noteLines, margin, y);
    doc.setTextColor(0, 0, 0);
    y += noteLines.length * 3.6 + 4;
  }

  for (const section of standard.sections) {
    ensure(12);
    if (!options.summaryOnly) {
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(9);
      doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
      doc.text(`${section.code}  ${section.title}`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
    }

    if (options.summaryOnly) {
      const count = section.subSections.reduce(
        (sum, sub) => sum + sub.items.length,
        0,
      );
      doc.setFontSize(8);
      doc.text(`${section.code}  ${section.title}`, margin + 1, y);
      doc.text(String(count), margin + contentWidth - 38, y, {
        align: "right",
      });
      doc.setFont(fontFamily, "bold");
      doc.text(rateText(section.sectionTotal), margin + contentWidth - 1, y, {
        align: "right",
      });
      doc.setFont(fontFamily, "normal");
      y += 7;
    } else {
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
              rateText(item.materialRate),
              x + columns[ci].width - 2,
              y,
              {
                align: "right",
              },
            );
            x += columns[ci].width;
            ci += 1;
          }
          if (showLabour) {
            doc.text(rateText(item.laborRate), x + columns[ci].width - 2, y, {
              align: "right",
            });
            x += columns[ci].width;
            ci += 1;
          }
          doc.text(rateText(item.unitRate), x + columns[ci].width - 2, y, {
            align: "right",
          });
          x += columns[ci].width;
          doc.setFont(fontFamily, "bold");
          doc.text(rateText(item.totalCost), x + columns[ci].width - 2, y, {
            align: "right",
          });
          doc.setFont(fontFamily, "normal");
          y += rowHeight;
        }
      }

      ensure(8);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(8);
      doc.text(`Section ${section.code} total`, margin + contentWidth - 40, y, {
        align: "right",
      });
      doc.text(rateText(section.sectionTotal), margin + contentWidth - 1, y, {
        align: "right",
      });
      doc.setFont(fontFamily, "normal");
      y += 6;
    }
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

  if (isSurvey) {
    summaryRows.length = 0;
    summaryRows.push([
      "Market total, rates captured in market",
      standard.summary.measuredWorksTotal,
      true,
    ]);
    const outstanding = allItems.length - pricedLines;
    const note =
      outstanding === 0
        ? "Every line carries a market rate. No preliminaries, overhead, contingency, retention or tax are applied to a market survey."
        : `${outstanding} of ${allItems.length} lines are still to be priced in the market. The total shows only the rates entered so far, with no preliminaries, overhead, contingency, retention or tax.`;
    const noteLines = doc.splitTextToSize(note, contentWidth) as string[];
    ensure(noteLines.length * 4 + 4);
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(noteLines, margin, y);
    doc.setTextColor(0, 0, 0);
    y += noteLines.length * 3.6 + 4;
  }

  summaryRows.forEach(([label, value, strong]) => {
    ensure(7);
    doc.setFont(fontFamily, strong ? "bold" : "normal");
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
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    doc.text(title, margin, y);
    y += 5;
    doc.setFont(fontFamily, "normal");
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

  if (!options.summaryOnly) {
    notesBlock("Assumptions", studio.assumptions);
    notesBlock("Exclusions", studio.exclusions);
  }

  if (studio.review.status === "reviewed" && studio.review.reviewer_name) {
    y += 6;
    ensure(16);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    doc.text("Professional review", margin, y);
    y += 5;
    doc.setFont(fontFamily, "normal");
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

  // FRELUX VERIFY seal (toggle-gated): printed only when the user turned it
  // on, anchored to the bottom of the last page above the footer so it closes
  // the document instead of trailing the last line of content.
  if (options.verify === true && !options.summaryOnly) {
    ensure(VERIFY_BLOCK_HEIGHT + 6);
    const sealY = verifySealBottomY({ pageHeight, margin, footerReserve: 10 });
    await drawVerifySeal(doc, margin, sealY, contentWidth, {
      documentLabel: "BOQ",
      copyToken: options.copyToken,
    });
  }

  drawFooter();
  return doc;
}

export async function downloadBoqPdf(
  standard: StandardBoqDocument,
  studio: BoqStudioDocument,
  options: BoqPdfOptions = {},
): Promise<{ hash: string; verificationId?: string; stampError?: string }> {
  // A token exists only when the seal is printed: no QR, no hosted copy.
  // It is created before the PDF is drawn because the QR must carry it.
  // A summary preview never prints the seal, so it must not host a copy: the
  // token would point at a record no reader can reach from the document.
  const copyToken =
    options.verify === true && !options.summaryOnly
      ? (options.copyToken ?? createVerifyCopyToken())
      : undefined;
  const doc = await buildBoqPdf(standard, studio, {
    ...options,
    copyToken,
  });
  const safe = (studio.reference || studio.title || "boq")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const modeSuffix = studio.mode === "market_survey" ? "-market-survey" : "";
  return await saveSealedPdf(
    doc,
    `${safe || "boq"}-R${studio.revision}${modeSuffix}.pdf`,
    {
      title: `BOQ ${studio.reference || studio.title}`,
      subject: `Revision ${studio.revision}`,
      reference: studio.reference,
    },
    {
      stampOnBlockchain: options.summaryOnly
        ? false
        : (options.stampOnBlockchain ?? options.verify === true),
      copyToken,
      documentTitle: studio.title || `BOQ ${studio.reference || "Document"}`,
      documentReference: studio.reference,
      documentType: "boq",
    },
  );
}
