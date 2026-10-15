/**
 * FRELUX Enterprise Standardized Bill of Quantities (BOQ) Assembly Engine
 *
 * Implements international construction measurement standards:
 * - NRM2: RICS New Rules of Measurement (Order of Cost Estimating and Cost Planning for Building Works)
 * - CESMM4: Civil Engineering Standard Method of Measurement (ICE / CESMM)
 * - ICMS: International Construction Measurement Standards (3rd Edition - Cost & Carbon)
 * - Standard Commercial: Trade package schedule commonly used in Commonwealth & African markets
 *
 * Core Features:
 * - Deterministic section and sub-section hierarchy
 * - Breakdown of Material, Labor, and Plant/Equipment cost components
 * - Markups: Preliminaries %, Overhead & Profit (OH&P) %, and Contingency %
 * - Statutory Retention / Holdback deduction (e.g. 5-10% held until defects liability period)
 * - Complete CSV export generator and print/PDF-ready layout
 */

import { formatByCode } from "@/lib/international/currency-format";
import { TaxCalculationResult } from "./tax-engine";

export type BoqStandard = "NRM2" | "CESMM4" | "ICMS" | "Commercial";

export interface BoqItem {
  id: string;
  itemNumber: string; // e.g., "1.1.01" or "E.210"
  description: string;
  quantity: number;
  unit: string;
  materialRate: number;
  laborRate: number;
  plantRate: number;
  unitRate: number; // materialRate + laborRate + plantRate
  totalCost: number;
  specificationRef?: string;
  standardCode?: string; // e.g. "NRM2-2.1"
}

export interface BoqSubSection {
  id: string;
  code: string;
  title: string;
  items: BoqItem[];
  subTotal: number;
}

export interface BoqSection {
  id: string;
  code: string; // e.g., "01", "F", "10"
  title: string;
  subSections: BoqSubSection[];
  sectionTotal: number;
}

export interface BoqProjectMetadata {
  title: string;
  projectRef: string;
  clientName: string;
  contractorName?: string;
  location?: string;
  marketCode: string;
  currency: string;
  preparedBy: string;
  date: string;
  revision: string;
  standard: BoqStandard;
}

export interface BoqCommercials {
  preliminariesPercent?: number; // e.g. 5%
  overheadProfitPercent?: number; // e.g. 10%
  contingencyPercent?: number; // e.g. 5%
  retentionPercent?: number; // Statutory holdback e.g. 5% or 10%
  taxResult?: TaxCalculationResult | null;
}

export interface StandardBoqDocument {
  metadata: BoqProjectMetadata;
  commercials: BoqCommercials;
  sections: BoqSection[];
  summary: {
    measuredWorksTotal: number;
    preliminariesAmount: number;
    subtotalBeforeOhp: number;
    overheadProfitAmount: number;
    subtotalBeforeContingency: number;
    contingencyAmount: number;
    subtotalBeforeTax: number;
    taxAmount: number;
    taxCategory: string;
    grossTotal: number;
    retentionAmount: number;
    netPayableTotal: number;
  };
}

/** Standard section templates for each supported measurement system */
export const STANDARD_SECTION_TEMPLATES: Record<
  BoqStandard,
  Array<{ code: string; title: string }>
> = {
  NRM2: [
    { code: "01", title: "Preliminaries & General Requirements" },
    { code: "02", title: "Off-site Manufactured Structures" },
    { code: "03", title: "Demolitions" },
    { code: "04", title: "Substructure & Foundations" },
    { code: "05", title: "Superstructure Frame, Walls & Floors" },
    { code: "06", title: "Cladding & External Coverings" },
    { code: "07", title: "Roofing & Waterproofing" },
    { code: "08", title: "Internal Walls & Partitions" },
    { code: "09", title: "Internal Doors & Windows" },
    { code: "10", title: "Wall & Floor Finishes" },
    { code: "11", title: "Ceilings & Suspended Systems" },
    { code: "12", title: "Mechanical, Electrical & Public Health (MEP)" },
    { code: "13", title: "External Works, Drainage & Paving" },
  ],
  CESMM4: [
    { code: "Class A", title: "General Items & Contractual Requirements" },
    { code: "Class D", title: "Demolition and Site Clearance" },
    { code: "Class E", title: "Earthworks & Bulk Excavation" },
    { code: "Class F", title: "In Situ Concrete" },
    { code: "Class G", title: "Concrete Ancillaries & Reinforcement" },
    { code: "Class H", title: "Precast Concrete" },
    { code: "Class I", title: "Pipework - Pipes & Conduits" },
    { code: "Class J", title: "Pipework - Fittings and Valves" },
    { code: "Class K", title: "Pipework - Manholes and Chambers" },
    { code: "Class M", title: "Structural Metalwork" },
    { code: "Class R", title: "Roads and Pavings" },
  ],
  ICMS: [
    { code: "ICMS-01", title: "Demolition & Site Preparation" },
    { code: "ICMS-02", title: "Substructure & Earth Retaining" },
    { code: "ICMS-03", title: "Superstructure & Building Frame" },
    { code: "ICMS-04", title: "Building Façade & External Envelope" },
    { code: "ICMS-05", title: "Internal Finishes & Fixtures" },
    { code: "ICMS-06", title: "Building Services, Power & HVAC" },
    { code: "ICMS-07", title: "Site Infrastructure & External Works" },
  ],
  Commercial: [
    { code: "01", title: "Preliminaries & Site Establishment" },
    { code: "02", title: "Excavation, Earthworks & Foundations" },
    { code: "03", title: "Concrete, Formwork & Reinforcement" },
    { code: "04", title: "Blockwork, Brickwork & Masonry" },
    { code: "05", title: "Roofing, Timber & Trusses" },
    { code: "06", title: "Doors, Windows & Ironmongery" },
    { code: "07", title: "Plastering, Screeding & Wall Finishes" },
    { code: "08", title: "Floor Finishes & Tiling" },
    { code: "09", title: "Painting & Decorating" },
    { code: "10", title: "Plumbing & Sanitary Installations" },
    { code: "11", title: "Electrical & Power Installations" },
    { code: "12", title: "External Works, Fencing & Drainage" },
  ],
};

/**
 * Compiles a structured, fully auditable Standard BOQ Document
 */
export function assembleStandardBoq(params: {
  metadata: BoqProjectMetadata;
  commercials: BoqCommercials;
  sections: Array<{
    code: string;
    title: string;
    subSections: Array<{
      code: string;
      title: string;
      items: Array<{
        itemNumber: string;
        description: string;
        quantity: number;
        unit: string;
        materialRate?: number;
        laborRate?: number;
        plantRate?: number;
        specificationRef?: string;
        standardCode?: string;
      }>;
    }>;
  }>;
}): StandardBoqDocument {
  const { metadata, commercials } = params;

  let measuredWorksTotal = 0;

  // Process sections and items
  const processedSections: BoqSection[] = params.sections.map((sec, secIdx) => {
    let sectionTotal = 0;

    const subSections: BoqSubSection[] = sec.subSections.map((sub, subIdx) => {
      let subTotal = 0;

      const items: BoqItem[] = sub.items.map((it, itIdx) => {
        const mat = it.materialRate || 0;
        const lab = it.laborRate || 0;
        const plt = it.plantRate || 0;
        const unitRate = mat + lab + plt;
        const totalCost = Math.round(it.quantity * unitRate * 100) / 100;

        subTotal += totalCost;

        return {
          id: `item-${secIdx}-${subIdx}-${itIdx}`,
          itemNumber: it.itemNumber || `${sec.code}.${sub.code}.${itIdx + 1}`,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          materialRate: mat,
          laborRate: lab,
          plantRate: plt,
          unitRate,
          totalCost,
          specificationRef: it.specificationRef,
          standardCode: it.standardCode,
        };
      });

      sectionTotal += subTotal;

      return {
        id: `sub-${secIdx}-${subIdx}`,
        code: sub.code,
        title: sub.title,
        items,
        subTotal: Math.round(subTotal * 100) / 100,
      };
    });

    measuredWorksTotal += sectionTotal;

    return {
      id: `sec-${secIdx}`,
      code: sec.code,
      title: sec.title,
      subSections,
      sectionTotal: Math.round(sectionTotal * 100) / 100,
    };
  });

  measuredWorksTotal = Math.round(measuredWorksTotal * 100) / 100;

  // Commercial calculations
  const prelimsRate = (commercials.preliminariesPercent || 0) / 100;
  const preliminariesAmount =
    Math.round(measuredWorksTotal * prelimsRate * 100) / 100;

  const subtotalBeforeOhp = measuredWorksTotal + preliminariesAmount;

  const ohpRate = (commercials.overheadProfitPercent || 0) / 100;
  const overheadProfitAmount =
    Math.round(subtotalBeforeOhp * ohpRate * 100) / 100;

  const subtotalBeforeContingency = subtotalBeforeOhp + overheadProfitAmount;

  const contingencyRate = (commercials.contingencyPercent || 0) / 100;
  const contingencyAmount =
    Math.round(subtotalBeforeContingency * contingencyRate * 100) / 100;

  const subtotalBeforeTax = subtotalBeforeContingency + contingencyAmount;

  let taxAmount = 0;
  let taxCategory = "Tax";

  if (commercials.taxResult && commercials.taxResult.status === "calculated") {
    taxAmount = commercials.taxResult.totals.tax ?? 0;
    taxCategory = commercials.taxResult.provenance[0]?.taxCode ?? "VAT";
  }

  const grossTotal = Math.round((subtotalBeforeTax + taxAmount) * 100) / 100;

  // Statutory retention / holdback
  const retentionRate = (commercials.retentionPercent || 0) / 100;
  const retentionAmount = Math.round(grossTotal * retentionRate * 100) / 100;
  const netPayableTotal =
    Math.round((grossTotal - retentionAmount) * 100) / 100;

  return {
    metadata,
    commercials,
    sections: processedSections,
    summary: {
      measuredWorksTotal,
      preliminariesAmount,
      subtotalBeforeOhp,
      overheadProfitAmount,
      subtotalBeforeContingency,
      contingencyAmount,
      subtotalBeforeTax,
      taxAmount,
      taxCategory,
      grossTotal,
      retentionAmount,
      netPayableTotal,
    },
  };
}

/**
 * Generates an RFC 4180 compliant CSV export for spreadsheet software (Excel, Google Sheets)
 */
export function exportBoqToCsv(doc: StandardBoqDocument): string {
  const { metadata, summary, sections } = doc;
  const cur = metadata.currency;

  const rows: string[][] = [];

  // Header metadata block
  rows.push(["FRELUX BILL OF QUANTITIES (BOQ)"]);
  rows.push(["Standard", doc.metadata.standard]);
  rows.push(["Project Title", `"${metadata.title.replace(/"/g, '""')}"`]);
  rows.push(["Project Ref", metadata.projectRef]);
  rows.push(["Client", `"${metadata.clientName.replace(/"/g, '""')}"`]);
  if (metadata.contractorName)
    rows.push([
      "Contractor",
      `"${metadata.contractorName.replace(/"/g, '""')}"`,
    ]);
  if (metadata.location)
    rows.push(["Location", `"${metadata.location.replace(/"/g, '""')}"`]);
  rows.push(["Market Code", metadata.marketCode]);
  rows.push(["Currency", cur]);
  rows.push(["Date", metadata.date]);
  rows.push(["Revision", metadata.revision]);
  rows.push([]);

  // Table header
  rows.push([
    "Item No",
    "Description",
    "Spec Ref",
    "Unit",
    "Quantity",
    `Material Rate (${cur})`,
    `Labor Rate (${cur})`,
    `Plant Rate (${cur})`,
    `Unit Rate (${cur})`,
    `Total Amount (${cur})`,
  ]);

  // Iterate sections
  for (const sec of sections) {
    rows.push([]);
    rows.push([
      sec.code,
      `SECTION: ${sec.title}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    for (const sub of sec.subSections) {
      rows.push([
        sub.code,
        `SUB-SECTION: ${sub.title}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      for (const item of sub.items) {
        rows.push([
          item.itemNumber,
          `"${item.description.replace(/"/g, '""')}"`,
          item.specificationRef || "",
          item.unit,
          item.quantity.toString(),
          item.materialRate.toFixed(2),
          item.laborRate.toFixed(2),
          item.plantRate.toFixed(2),
          item.unitRate.toFixed(2),
          item.totalCost.toFixed(2),
        ]);
      }

      rows.push([
        "",
        `Subtotal: ${sub.title}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        sub.subTotal.toFixed(2),
      ]);
    }

    rows.push([
      "",
      `TOTAL SECTION ${sec.code}: ${sec.title}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      sec.sectionTotal.toFixed(2),
    ]);
  }

  // Summary / Collection block
  rows.push([]);
  rows.push(["COLLECTION / GRAND SUMMARY"]);
  rows.push([
    "Total Measured Works",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    summary.measuredWorksTotal.toFixed(2),
  ]);
  if (summary.preliminariesAmount > 0) {
    rows.push([
      `Preliminaries (${doc.commercials.preliminariesPercent || 0}%)`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      summary.preliminariesAmount.toFixed(2),
    ]);
  }
  rows.push([
    "Subtotal before Overheads & Profit",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    summary.subtotalBeforeOhp.toFixed(2),
  ]);
  if (summary.overheadProfitAmount > 0) {
    rows.push([
      `Overheads & Profit (${doc.commercials.overheadProfitPercent || 0}%)`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      summary.overheadProfitAmount.toFixed(2),
    ]);
  }
  rows.push([
    "Subtotal before Contingency",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    summary.subtotalBeforeContingency.toFixed(2),
  ]);
  if (summary.contingencyAmount > 0) {
    rows.push([
      `Contingency (${doc.commercials.contingencyPercent || 0}%)`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      summary.contingencyAmount.toFixed(2),
    ]);
  }
  rows.push([
    "Subtotal (Excl. Tax)",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    summary.subtotalBeforeTax.toFixed(2),
  ]);
  rows.push([
    summary.taxCategory,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    summary.taxAmount.toFixed(2),
  ]);
  rows.push([
    "GRAND TOTAL (INCL. TAX)",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    summary.grossTotal.toFixed(2),
  ]);
  if (summary.retentionAmount > 0) {
    rows.push([
      `Less Statutory Retention / Holdback (${doc.commercials.retentionPercent || 0}%)`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `-${summary.retentionAmount.toFixed(2)}`,
    ]);
    rows.push([
      "NET PAYABLE CONTRACT SUM",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      summary.netPayableTotal.toFixed(2),
    ]);
  }

  return rows.map((r) => r.join(",")).join("\r\n");
}

/**
 * Generates an institutional print-ready HTML layout for lender and contract submissions
 */
export function exportBoqToPrintHtml(doc: StandardBoqDocument): string {
  const { metadata, summary, sections } = doc;
  const cur = metadata.currency;
  const fmt = (n: number) => formatByCode(n, cur, { decimals: 2 });

  const sectionHtml = sections
    .map(
      (sec) => `
    <div class="boq-section">
      <div class="sec-hdr">
        <span class="code">${sec.code}</span>
        <span class="title">${sec.title}</span>
        <span class="tot">${fmt(sec.sectionTotal)}</span>
      </div>
      ${sec.subSections
        .map(
          (sub) => `
        <div class="sub-hdr">
          <span>${sub.code} — ${sub.title}</span>
        </div>
        <table class="boq-table">
          <thead>
            <tr>
              <th style="width: 8%;">Item</th>
              <th style="width: 44%;">Description & Specification</th>
              <th style="width: 8%;">Unit</th>
              <th style="width: 10%;" class="num">Qty</th>
              <th style="width: 15%;" class="num">Rate (${cur})</th>
              <th style="width: 15%;" class="num">Amount (${cur})</th>
            </tr>
          </thead>
          <tbody>
            ${sub.items
              .map(
                (it) => `
              <tr>
                <td class="item-no">${it.itemNumber}</td>
                <td>
                  <div class="desc">${it.description}</div>
                  ${it.specificationRef ? `<div class="spec">Spec: ${it.specificationRef}</div>` : ""}
                </td>
                <td>${it.unit}</td>
                <td class="num">${it.quantity.toLocaleString()}</td>
                <td class="num">${fmt(it.unitRate)}</td>
                <td class="num bold">${fmt(it.totalCost)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `,
        )
        .join("")}
    </div>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BOQ — ${metadata.title} (${metadata.projectRef})</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.4; padding: 20px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
    .doc-type { font-size: 13px; font-weight: 700; color: #334155; margin-top: 2px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px; }
    .meta-row { display: flex; }
    .meta-lbl { width: 120px; font-weight: 600; color: #64748b; }
    .meta-val { font-weight: 600; color: #0f172a; }
    .boq-section { margin-bottom: 24px; page-break-inside: avoid; }
    .sec-hdr { background: #0f172a; color: #fff; padding: 6px 10px; border-radius: 4px; font-weight: 700; display: flex; justify-content: space-between; font-size: 12px; }
    .sub-hdr { background: #f1f5f9; padding: 4px 8px; font-weight: 600; color: #334155; font-size: 11px; border-left: 3px solid #0284c7; margin: 8px 0 4px 0; }
    .boq-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .boq-table th { background: #e2e8f0; padding: 5px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }
    .boq-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .num { text-align: right; }
    .bold { font-weight: 700; }
    .item-no { font-family: ui-monospace, monospace; font-size: 10px; color: #475569; }
    .desc { font-weight: 500; }
    .spec { font-size: 9.5px; color: #64748b; margin-top: 2px; font-style: italic; }
    .summary-card { margin-top: 30px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
    .summary-hdr { background: #1e293b; color: #fff; padding: 8px 12px; font-weight: 700; font-size: 12px; }
    .summary-table { width: 100%; border-collapse: collapse; }
    .summary-table td { padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    .summary-table tr.total-row td { background: #f8fafc; font-weight: 800; font-size: 13px; color: #0284c7; border-top: 2px solid #0f172a; }
    .sign-block { margin-top: 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; page-break-inside: avoid; }
    .sign-box { border-top: 1px dashed #64748b; padding-top: 8px; font-size: 10px; color: #475569; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">FRELUX GLOBAL ENTERPRISE</div>
      <div class="doc-type">OFFICIAL BILL OF QUANTITIES — ${metadata.standard}</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #64748b;">
      <div>Ref: <b>${metadata.projectRef}</b></div>
      <div>Date: ${metadata.date} | Rev: ${metadata.revision}</div>
      <div>Market: <b>${metadata.marketCode}</b></div>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-row"><span class="meta-lbl">Project:</span><span class="meta-val">${metadata.title}</span></div>
      <div class="meta-row"><span class="meta-lbl">Client:</span><span class="meta-val">${metadata.clientName}</span></div>
      ${metadata.location ? `<div class="meta-row"><span class="meta-lbl">Location:</span><span class="meta-val">${metadata.location}</span></div>` : ""}
    </div>
    <div>
      ${metadata.contractorName ? `<div class="meta-row"><span class="meta-lbl">Contractor:</span><span class="meta-val">${metadata.contractorName}</span></div>` : ""}
      <div class="meta-row"><span class="meta-lbl">Currency:</span><span class="meta-val">${cur}</span></div>
      <div class="meta-row"><span class="meta-lbl">Prepared By:</span><span class="meta-val">${metadata.preparedBy}</span></div>
    </div>
  </div>

  ${sectionHtml}

  <div class="summary-card">
    <div class="summary-hdr">GRAND SUMMARY / COLLECTION OF MEASURED WORKS</div>
    <table class="summary-table">
      <tr><td>Measured Works Total</td><td class="num bold">${fmt(summary.measuredWorksTotal)}</td></tr>
      ${summary.preliminariesAmount > 0 ? `<tr><td>Preliminaries & Site Establishment (${doc.commercials.preliminariesPercent || 0}%)</td><td class="num">${fmt(summary.preliminariesAmount)}</td></tr>` : ""}
      <tr><td>Subtotal before Overheads & Profit</td><td class="num bold">${fmt(summary.subtotalBeforeOhp)}</td></tr>
      ${summary.overheadProfitAmount > 0 ? `<tr><td>Contractor Overhead & Profit (${doc.commercials.overheadProfitPercent || 0}%)</td><td class="num">${fmt(summary.overheadProfitAmount)}</td></tr>` : ""}
      <tr><td>Subtotal before Contingency</td><td class="num bold">${fmt(summary.subtotalBeforeContingency)}</td></tr>
      ${summary.contingencyAmount > 0 ? `<tr><td>Construction Contingency (${doc.commercials.contingencyPercent || 0}%)</td><td class="num">${fmt(summary.contingencyAmount)}</td></tr>` : ""}
      <tr><td>Net Contract Sum (Excl. Tax)</td><td class="num bold">${fmt(summary.subtotalBeforeTax)}</td></tr>
      <tr><td>Statutory Tax (${summary.taxCategory})</td><td class="num">${fmt(summary.taxAmount)}</td></tr>
      <tr class="total-row"><td>GROSS BILL OF QUANTITIES TOTAL</td><td class="num">${fmt(summary.grossTotal)}</td></tr>
      ${
        summary.retentionAmount > 0
          ? `<tr><td>Less Statutory Holdback / Retention (${doc.commercials.retentionPercent || 0}%)</td><td class="num">-${fmt(summary.retentionAmount)}</td></tr>
      <tr class="total-row"><td>NET PAYABLE / DRAW SCHEDULE BASELINE</td><td class="num">${fmt(summary.netPayableTotal)}</td></tr>`
          : ""
      }
    </table>
  </div>

  <div class="sign-block">
    <div class="sign-box">
      <b>PREPARED & VERIFIED BY:</b><br />
      Quantity Surveyor / Cost Consultant Signature<br />
      Date: ________________________
    </div>
    <div class="sign-box">
      <b>APPROVED & ACCEPTED BY:</b><br />
      Client / Authorized Employer Representative<br />
      Date: ________________________
    </div>
  </div>
</body>
</html>`;
}
