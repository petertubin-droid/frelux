import { escapeHtml } from "@/lib/sanitization";
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
import { FRELUX_LOGO_DATA_URL } from "@/lib/pdf-logo-data";

export type BoqStandard =
  | "NRM2"
  | "BESMM4"
  | "SMM7"
  | "CSI_MASTERFORMAT"
  | "CESMM4"
  | "ICMS"
  | "Commercial";

export interface BoqEndorsement {
  certifiedBy?: string; // Registered Quantity Surveyor Name
  niqsRegNumber?: string; // Nigerian Institute of Quantity Surveyors Reg. No.
  qsrbnRegNumber?: string; // Quantity Surveyors Registration Board of Nigeria Reg. No.
  practiceFirm?: string;
  status: "draft" | "tender_ready" | "certified_for_bank_tender";
  certificationDate?: string;
  notes?: string;
}

export interface BoqItem {
  id: string;
  itemNumber: string; // e.g., "1.1.01" or "E.210"
  description: string;
  quantity: number;
  unit: string;
  materialRate: number;
  laborRate: number;
  plantRate: number;
  transportRate?: number; // Regional logistics & haulage to site
  overheadRate?: number; // Contractor overhead allocation
  profitRate?: number; // Contractor profit margin allocation
  laborOutputHours?: number; // Labor productivity rate (man-hours per unit)
  unitRate: number; // materialRate + laborRate + plantRate + transportRate + overheadRate + profitRate
  totalCost: number;
  specificationRef?: string;
  standardCode?: string; // e.g. "BESMM4-F.1" or "NRM2-2.1"
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
  endorsement?: BoqEndorsement;
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
  endorsement?: BoqEndorsement;
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
  BESMM4: [
    { code: "A", title: "Preliminaries & General Contract Conditions" },
    { code: "D", title: "Demolition & Site Clearance" },
    { code: "E", title: "Earthworks & Bulk Excavation" },
    { code: "F", title: "In Situ Concrete & Formwork" },
    { code: "G", title: "Reinforcement (BS 8666 Schedules)" },
    { code: "H", title: "Precast Concrete" },
    { code: "J", title: "Masonry, Sandcrete & Blockwork" },
    { code: "K", title: "Structural Metalwork" },
    { code: "L", title: "Woodwork, Roof Structure & Carcassing" },
    {
      code: "M",
      title: "Thermal & Moisture Protection (Waterproofing & Roofing)",
    },
    { code: "N", title: "Windows, Doors & Ironmongery" },
    {
      code: "P",
      title: "Wall, Floor & Ceiling Finishes (Plaster, Screed, Tiles)",
    },
    { code: "Q", title: "Glazing" },
    { code: "R", title: "Painting & Decorating" },
    { code: "S", title: "Plumbing & Mechanical Engineering Services" },
    { code: "T", title: "Electrical Engineering Services" },
    { code: "U", title: "External Works, Drainage, Fencing & Landscaping" },
    { code: "V", title: "Prime Cost (PC) Sums & Provisional Sums" },
  ],
  SMM7: [
    { code: "A", title: "Preliminaries / General Conditions" },
    { code: "C", title: "Existing Site / Buildings / Demolitions" },
    { code: "D", title: "Groundwork & Substructure" },
    { code: "E", title: "In Situ Concrete / Large Precast Concrete" },
    { code: "F", title: "Masonry & Blockwork" },
    { code: "G", title: "Structural / Carcassing Metal & Timber" },
    { code: "H", title: "Cladding & Covering" },
    { code: "J", title: "Waterproofing" },
    { code: "K", title: "Linings, Sheathing & Dry Partitioning" },
    { code: "L", title: "Windows, Doors & Stairs" },
    { code: "M", title: "Surface Finishes (Plaster, Screed, Tile, Paint)" },
    { code: "N", title: "Furniture & Equipment" },
    { code: "P", title: "Building Fabric Sundries" },
    { code: "Q", title: "Paving, Planting & Fencing" },
    { code: "R", title: "Disposal Systems & Drainage" },
    { code: "S", title: "Piped Supply Systems (Plumbing & Water)" },
    { code: "T", title: "Mechanical Heating & Cooling Systems (HVAC)" },
    { code: "V", title: "Electrical Supply, Power & Lighting Systems" },
    { code: "W", title: "Communications, Security & Control Systems" },
  ],
  CSI_MASTERFORMAT: [
    { code: "01", title: "General Requirements" },
    { code: "02", title: "Existing Conditions" },
    { code: "03", title: "Concrete (Foundations, Slabs & Structural)" },
    { code: "04", title: "Masonry & Unit Assemblies" },
    { code: "05", title: "Metals (Structural Steel & Light Gauge)" },
    { code: "06", title: "Wood, Plastics, and Composites" },
    {
      code: "07",
      title: "Thermal and Moisture Protection (Roofing & Waterproofing)",
    },
    { code: "08", title: "Openings (Doors, Windows & Hardware)" },
    { code: "09", title: "Finishes (Plaster, Screed, Tile & Painting)" },
    { code: "10", title: "Specialties" },
    { code: "11", title: "Equipment" },
    { code: "12", title: "Furnishings" },
    { code: "21", title: "Fire Suppression" },
    { code: "22", title: "Plumbing (Pipes, Fixtures & Valves)" },
    { code: "23", title: "Heating, Ventilating, and Air Conditioning (HVAC)" },
    { code: "26", title: "Electrical & Lighting" },
    { code: "31", title: "Earthwork & Excavation" },
    { code: "32", title: "Exterior Improvements (Paving & Landscaping)" },
    { code: "33", title: "Utilities" },
  ],
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
        transportRate?: number;
        overheadRate?: number;
        profitRate?: number;
        laborOutputHours?: number;
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
        const trp = it.transportRate || 0;
        const ovh = it.overheadRate || 0;
        const prf = it.profitRate || 0;
        // Rate build-up transparency: Material + Labor + Plant + Haulage + Overheads + Profit
        const unitRate =
          Math.round((mat + lab + plt + trp + ovh + prf) * 100) / 100;
        const totalCost = Math.round(it.quantity * unitRate * 100) / 100;

        subTotal += totalCost;

        return {
          id: `item-${secIdx}-${subIdx}-${itIdx}`,
          itemNumber:
            it.itemNumber ||
            `${sec.code}.${String(itIdx + 1).padStart(2, "0")}`,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          materialRate: mat,
          laborRate: lab,
          plantRate: plt,
          transportRate: trp > 0 ? trp : undefined,
          overheadRate: ovh > 0 ? ovh : undefined,
          profitRate: prf > 0 ? prf : undefined,
          laborOutputHours: it.laborOutputHours,
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

  // Statutory retention / holdback.
  //
  // Retention secures the value of work done, so it is held on the pre-tax
  // subtotal. Holding it on the tax-inclusive total withheld retention on money
  // the contractor owes the revenue authority and never receives: at 5 per cent
  // retention and 7.5 per cent VAT that is 0.375 per cent of the gross, taken
  // from the cash that has to be remitted as tax.
  const retentionRate = (commercials.retentionPercent || 0) / 100;
  const retentionAmount =
    Math.round(subtotalBeforeTax * retentionRate * 100) / 100;
  const netPayableTotal =
    Math.round((grossTotal - retentionAmount) * 100) / 100;

  return {
    metadata,
    commercials,
    endorsement: metadata.endorsement,
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
    `Logistics Rate (${cur})`,
    `Overhead Rate (${cur})`,
    `Profit Rate (${cur})`,
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
          (item.transportRate || 0).toFixed(2),
          (item.overheadRate || 0).toFixed(2),
          (item.profitRate || 0).toFixed(2),
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
        <span class="code">${escapeHtml(sec.code)}</span>
        <span class="title">${escapeHtml(sec.title)}</span>
        <span class="tot">${escapeHtml(fmt(sec.sectionTotal))}</span>
      </div>
      ${sec.subSections
        .map(
          (sub) => `
        <div class="sub-hdr">
          <span>${escapeHtml(sub.code)} — ${escapeHtml(sub.title)}</span>
        </div>
        <table class="boq-table">
          <thead>
            <tr>
              <th style="width: 8%;">Item</th>
              <th style="width: 44%;">Description & Specification</th>
              <th style="width: 8%;">Unit</th>
              <th style="width: 10%;" class="num">Qty</th>
              <th style="width: 15%;" class="num">Rate (${escapeHtml(cur)})</th>
              <th style="width: 15%;" class="num">Amount (${escapeHtml(cur)})</th>
            </tr>
          </thead>
          <tbody>
            ${sub.items
              .map(
                (it) => `
              <tr>
                <td class="item-no">${escapeHtml(it.itemNumber)}</td>
                <td>
                  <div class="desc">${escapeHtml(it.description)}</div>
                  ${it.specificationRef ? `<div class="spec">Spec: ${escapeHtml(it.specificationRef)}</div>` : ""}
                </td>
                <td>${escapeHtml(it.unit)}</td>
                <td class="num">${it.quantity.toLocaleString()}</td>
                <td class="num">${escapeHtml(fmt(it.unitRate))}</td>
                <td class="num bold">${escapeHtml(fmt(it.totalCost))}</td>
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
  <title>BOQ — ${escapeHtml(metadata.title)} (${escapeHtml(metadata.projectRef)})</title>
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
    .pdf-watermark { position: absolute; left: 50%; top: 45%; pointer-events: none; user-select: none; }
    .pdf-watermark img { width: 460px; max-width: 68%; height: auto; display: block; opacity: 0.07; }
    body { position: relative; }
    body > *:not(.pdf-watermark) { position: relative; z-index: 1; }
    .brand-mark { height: 34px; width: auto; display: block; margin-bottom: 6px; }
    .sign-block { margin-top: 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; page-break-inside: avoid; }
    .sign-box { border-top: 1px dashed #64748b; padding-top: 8px; font-size: 10px; color: #475569; }
  </style>
</head>
<body>
  <div class="pdf-watermark"><img src="${FRELUX_LOGO_DATA_URL}" alt="" /></div>
  <div class="header">
    <div>
      <img class="brand-mark" src="${FRELUX_LOGO_DATA_URL}" alt="FRELUX" />
      <div class="brand">FRELUX GLOBAL ENTERPRISE</div>
      <div class="doc-type">DRAFT QUANTITY & COST SCHEDULE — ${escapeHtml(metadata.standard)} classification aid</div>
      <div style="margin-top:6px;padding:8px;border:1px solid #f59e0b;background:#fffbeb;color:#78350f;font-size:10px"><b>Not an official standards-compliant BOQ or certified measurement.</b> Division assignment is heuristic. Review quantities, scope, rates, local measurement rules and contract requirements with a qualified local quantity surveyor before issue. This document is not structural design approval or a purchase order.</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #64748b;">
      <div>Ref: <b>${escapeHtml(metadata.projectRef)}</b></div>
      <div>Date: ${escapeHtml(metadata.date)} | Rev: ${escapeHtml(metadata.revision)}</div>
      <div>Market: <b>${escapeHtml(metadata.marketCode)}</b></div>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-row"><span class="meta-lbl">Project:</span><span class="meta-val">${escapeHtml(metadata.title)}</span></div>
      <div class="meta-row"><span class="meta-lbl">Client:</span><span class="meta-val">${escapeHtml(metadata.clientName)}</span></div>
      ${metadata.location ? `<div class="meta-row"><span class="meta-lbl">Location:</span><span class="meta-val">${escapeHtml(metadata.location)}</span></div>` : ""}
    </div>
    <div>
      ${metadata.contractorName ? `<div class="meta-row"><span class="meta-lbl">Contractor:</span><span class="meta-val">${escapeHtml(metadata.contractorName)}</span></div>` : ""}
      <div class="meta-row"><span class="meta-lbl">Currency:</span><span class="meta-val">${escapeHtml(cur)}</span></div>
      <div class="meta-row"><span class="meta-lbl">Prepared By:</span><span class="meta-val">${escapeHtml(metadata.preparedBy)}</span></div>
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
      <tr><td>Statutory Tax (${escapeHtml(summary.taxCategory)})</td><td class="num">${fmt(summary.taxAmount)}</td></tr>
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
      ${doc.endorsement?.certifiedBy ? `<span><b>${escapeHtml(doc.endorsement.certifiedBy)}</b></span><br />` : ""}
      ${doc.endorsement?.practiceFirm ? `<span>${escapeHtml(doc.endorsement.practiceFirm)}</span><br />` : ""}
      ${doc.endorsement?.niqsRegNumber ? `<span>NIQS Reg: <b>${escapeHtml(doc.endorsement.niqsRegNumber)}</b></span><br />` : ""}
      ${doc.endorsement?.qsrbnRegNumber ? `<span>QSRBN Reg: <b>${escapeHtml(doc.endorsement.qsrbnRegNumber)}</b></span><br />` : ""}
      Quantity Surveyor / Cost Consultant Signature<br />
      Date: ${escapeHtml(doc.endorsement?.certificationDate || metadata.date)}
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

// =========================================================
// REGIONAL PROFESSIONAL STANDARDS MAPPER (CSI / NRM2 / COMMERCIAL)
// =========================================================

/**
 * Automatically maps standard estimate/BOQ line items into regional standard
 * structural divisions (e.g. CSI MasterFormat 50-Division for US/CA, NRM2 for UK/Commonwealth).
 */
export function mapItemToStandardDivision(
  categoryOrDesc: string,
  standard: BoqStandard,
): { code: string; title: string } {
  const norm = (categoryOrDesc || "").toLowerCase();

  if (standard === "CSI_MASTERFORMAT") {
    if (
      norm.includes("concrete") ||
      norm.includes("slab") ||
      norm.includes("rebar") ||
      norm.includes("cement")
    ) {
      return {
        code: "03",
        title: "Concrete (Foundations, Slabs & Structural)",
      };
    }
    if (
      norm.includes("block") ||
      norm.includes("brick") ||
      norm.includes("masonry")
    ) {
      return { code: "04", title: "Masonry & Unit Assemblies" };
    }
    if (
      norm.includes("steel") ||
      norm.includes("iron") ||
      norm.includes("metal")
    ) {
      return { code: "05", title: "Metals (Structural Steel & Light Gauge)" };
    }
    if (
      norm.includes("wood") ||
      norm.includes("carpentry") ||
      norm.includes("timber")
    ) {
      return { code: "06", title: "Wood, Plastics, and Composites" };
    }
    if (
      norm.includes("roof") ||
      norm.includes("waterproof") ||
      norm.includes("insulation")
    ) {
      return {
        code: "07",
        title: "Thermal and Moisture Protection (Roofing & Waterproofing)",
      };
    }
    if (
      norm.includes("door") ||
      norm.includes("window") ||
      norm.includes("glazing")
    ) {
      return { code: "08", title: "Openings (Doors, Windows & Hardware)" };
    }
    if (
      norm.includes("paint") ||
      norm.includes("tile") ||
      norm.includes("screed") ||
      norm.includes("pop") ||
      norm.includes("plaster") ||
      norm.includes("ceiling") ||
      norm.includes("finish")
    ) {
      return {
        code: "09",
        title: "Finishes (Plaster, Screed, Tile & Painting)",
      };
    }
    if (
      norm.includes("plumb") ||
      norm.includes("pipe") ||
      norm.includes("valve") ||
      norm.includes("drain")
    ) {
      return { code: "22", title: "Plumbing (Pipes, Fixtures & Valves)" };
    }
    if (
      norm.includes("electric") ||
      norm.includes("wire") ||
      norm.includes("conduit") ||
      norm.includes("solar")
    ) {
      return { code: "26", title: "Electrical & Lighting" };
    }
    if (
      norm.includes("earth") ||
      norm.includes("excavat") ||
      norm.includes("foundation")
    ) {
      return { code: "31", title: "Earthwork & Excavation" };
    }
    return { code: "01", title: "General Requirements" };
  }

  if (standard === "BESMM4") {
    if (
      norm.includes("earth") ||
      norm.includes("excavat") ||
      norm.includes("site clearance")
    ) {
      return { code: "E", title: "Earthworks & Bulk Excavation" };
    }
    if (
      norm.includes("rebar") ||
      norm.includes("reinforce") ||
      norm.includes("bar bending") ||
      norm.includes("steel mesh")
    ) {
      return { code: "G", title: "Reinforcement (BS 8666 Schedules)" };
    }
    if (
      norm.includes("concrete") ||
      norm.includes("blinding") ||
      norm.includes("formwork") ||
      norm.includes("ground beam")
    ) {
      return { code: "F", title: "In Situ Concrete & Formwork" };
    }
    if (
      norm.includes("block") ||
      norm.includes("sandcrete") ||
      norm.includes("brick") ||
      norm.includes("masonry") ||
      norm.includes("damp proof")
    ) {
      return { code: "J", title: "Masonry, Sandcrete & Blockwork" };
    }
    if (
      norm.includes("structural steel") ||
      norm.includes("universal beam") ||
      norm.includes("stanchion")
    ) {
      return { code: "K", title: "Structural Metalwork" };
    }
    if (
      norm.includes("wood") ||
      norm.includes("timber") ||
      norm.includes("carpentry") ||
      norm.includes("truss") ||
      norm.includes("rafter") ||
      norm.includes("fascia")
    ) {
      return { code: "L", title: "Woodwork, Roof Structure & Carcassing" };
    }
    if (
      norm.includes("roof") ||
      norm.includes("waterproof") ||
      norm.includes("felt") ||
      norm.includes("membrane")
    ) {
      return {
        code: "M",
        title: "Thermal & Moisture Protection (Waterproofing & Roofing)",
      };
    }
    if (
      norm.includes("door") ||
      norm.includes("window") ||
      norm.includes("ironmongery") ||
      norm.includes("lockset")
    ) {
      return { code: "N", title: "Windows, Doors & Ironmongery" };
    }
    if (norm.includes("paint")) {
      return { code: "R", title: "Painting & Decorating" };
    }
    if (
      norm.includes("tile") ||
      norm.includes("screed") ||
      norm.includes("plaster") ||
      norm.includes("pop") ||
      norm.includes("ceiling") ||
      norm.includes("finish")
    ) {
      return {
        code: "P",
        title: "Wall, Floor & Ceiling Finishes (Plaster, Screed, Tiles)",
      };
    }
    if (
      norm.includes("plumb") ||
      norm.includes("pipe") ||
      norm.includes("sanitary") ||
      norm.includes("drain") ||
      norm.includes("soakaway") ||
      norm.includes("septic")
    ) {
      return { code: "S", title: "Plumbing & Mechanical Engineering Services" };
    }
    if (
      norm.includes("electric") ||
      norm.includes("wire") ||
      norm.includes("conduit") ||
      norm.includes("solar") ||
      norm.includes("inverter") ||
      norm.includes("lighting")
    ) {
      return { code: "T", title: "Electrical Engineering Services" };
    }
    if (
      norm.includes("paving") ||
      norm.includes("drainage") ||
      norm.includes("fence") ||
      norm.includes("gate") ||
      norm.includes("external")
    ) {
      return {
        code: "U",
        title: "External Works, Drainage, Fencing & Landscaping",
      };
    }
    return { code: "A", title: "Preliminaries & General Contract Conditions" };
  }

  if (standard === "SMM7") {
    if (
      norm.includes("earth") ||
      norm.includes("excavat") ||
      norm.includes("groundwork")
    ) {
      return { code: "D", title: "Groundwork & Substructure" };
    }
    if (
      norm.includes("concrete") ||
      norm.includes("rebar") ||
      norm.includes("formwork")
    ) {
      return { code: "E", title: "In Situ Concrete / Large Precast Concrete" };
    }
    if (
      norm.includes("block") ||
      norm.includes("brick") ||
      norm.includes("masonry")
    ) {
      return { code: "F", title: "Masonry & Blockwork" };
    }
    if (
      norm.includes("steel") ||
      norm.includes("timber") ||
      norm.includes("truss")
    ) {
      return { code: "G", title: "Structural / Carcassing Metal & Timber" };
    }
    if (norm.includes("cladding") || norm.includes("roof")) {
      return { code: "H", title: "Cladding & Covering" };
    }
    if (norm.includes("waterproof")) {
      return { code: "J", title: "Waterproofing" };
    }
    if (norm.includes("door") || norm.includes("window")) {
      return { code: "L", title: "Windows, Doors & Stairs" };
    }
    if (
      norm.includes("paint") ||
      norm.includes("tile") ||
      norm.includes("screed") ||
      norm.includes("plaster") ||
      norm.includes("ceiling")
    ) {
      return {
        code: "M",
        title: "Surface Finishes (Plaster, Screed, Tile, Paint)",
      };
    }
    if (norm.includes("drain") || norm.includes("disposal")) {
      return { code: "R", title: "Disposal Systems & Drainage" };
    }
    if (norm.includes("plumb") || norm.includes("pipe")) {
      return { code: "S", title: "Piped Supply Systems (Plumbing & Water)" };
    }
    if (
      norm.includes("electric") ||
      norm.includes("power") ||
      norm.includes("lighting")
    ) {
      return {
        code: "V",
        title: "Electrical Supply, Power & Lighting Systems",
      };
    }
    return { code: "A", title: "Preliminaries / General Conditions" };
  }

  if (standard === "NRM2") {
    if (
      norm.includes("earth") ||
      norm.includes("excavat") ||
      norm.includes("foundation")
    ) {
      return { code: "04", title: "Substructure & Foundations" };
    }
    if (
      norm.includes("concrete") ||
      norm.includes("block") ||
      norm.includes("slab") ||
      norm.includes("column")
    ) {
      return { code: "05", title: "Superstructure Frame, Walls & Floors" };
    }
    if (norm.includes("roof") || norm.includes("waterproof")) {
      return { code: "07", title: "Roofing & Waterproofing" };
    }
    if (norm.includes("door") || norm.includes("window")) {
      return { code: "09", title: "Internal Doors & Windows" };
    }
    if (
      norm.includes("paint") ||
      norm.includes("tile") ||
      norm.includes("screed") ||
      norm.includes("plaster")
    ) {
      return { code: "10", title: "Wall & Floor Finishes" };
    }
    if (norm.includes("ceiling") || norm.includes("pop")) {
      return { code: "11", title: "Ceilings & Suspended Systems" };
    }
    if (
      norm.includes("plumb") ||
      norm.includes("electric") ||
      norm.includes("mep") ||
      norm.includes("solar")
    ) {
      return {
        code: "12",
        title: "Mechanical, Electrical & Public Health (MEP)",
      };
    }
    return { code: "01", title: "Preliminaries & General Requirements" };
  }

  // Commercial / Default
  if (norm.includes("excavat") || norm.includes("foundation")) {
    return { code: "02", title: "Excavation, Earthworks & Foundations" };
  }
  if (norm.includes("concrete") || norm.includes("rebar")) {
    return { code: "03", title: "Concrete, Formwork & Reinforcement" };
  }
  if (norm.includes("block") || norm.includes("masonry")) {
    return { code: "04", title: "Blockwork, Brickwork & Masonry" };
  }
  if (norm.includes("roof")) {
    return { code: "05", title: "Roofing, Timber & Trusses" };
  }
  if (norm.includes("door") || norm.includes("window")) {
    return { code: "06", title: "Doors, Windows & Ironmongery" };
  }
  if (
    norm.includes("paint") ||
    norm.includes("tile") ||
    norm.includes("screed") ||
    norm.includes("pop")
  ) {
    return { code: "07", title: "Plastering, Screeding & Finishes" };
  }
  if (norm.includes("plumb") || norm.includes("electric")) {
    return {
      code: "08",
      title: "Plumbing, Drainage & Electrical Installations",
    };
  }
  return { code: "01", title: "Preliminaries & Site Establishment" };
}

/**
 * Resolves the default professional body measurement standard based on market code.
 * US / CA -> CSI MasterFormat
 * GB / AU / NZ / ZA -> NRM2 (RICS New Rules of Measurement)
 * International / EU -> ICMS / Standard Commercial
 */
/**
 * The measurement method a market's bills are actually written to.
 *
 * Only methods this engine implements are returned. A market whose national
 * method is not implemented (Germany's StLB-Bau, France's descriptif, India's
 * IS 1200, the Gulf's POMI) gets "Commercial": a plainly labelled trade
 * schedule, not another country's method wearing its name.
 */
export function resolveMarketBoqStandard(marketCode: string): BoqStandard {
  const code = (marketCode || "").toUpperCase();
  // North America measures by MasterFormat division.
  if (code === "US" || code === "CA") {
    return "CSI_MASTERFORMAT";
  }
  // Nigeria has its own statutory method: NIQS BESMM4.
  if (code === "NG") {
    return "BESMM4";
  }
  // Commonwealth markets, including Ireland, measure to RICS rules.
  if (
    code === "GB" ||
    code === "UK" ||
    code === "IE" ||
    code === "AU" ||
    code === "NZ" ||
    code === "ZA" ||
    code === "KE" ||
    code === "GH"
  ) {
    return "NRM2";
  }
  return "Commercial";
}
