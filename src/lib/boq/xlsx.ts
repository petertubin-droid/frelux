/**
 * BOQ Excel export.
 *
 * A real .xlsx (Office Open XML) workbook, built in the browser with fflate so
 * the file opens in Excel, LibreOffice and Google Sheets without a conversion
 * prompt. Numbers stay numbers: quantities and rates are numeric cells so a
 * quantity surveyor can keep working in the sheet, and money cells carry the
 * document's own currency format.
 */

import { strToU8, zipSync } from "fflate";
import type { StandardBoqDocument } from "@/lib/finance/boq-standard";
import { documentStatusLabel } from "./compile";
import type { BoqStudioDocument } from "./types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Cell = { v: string | number; t: "s" | "n"; style?: number };

function cellXml(cell: Cell, colIndex: number, rowIndex: number): string {
  const ref = `${columnName(colIndex)}${rowIndex}`;
  const style = cell.style ? ` s="${cell.style}"` : "";
  if (cell.v === "" || cell.v === null || cell.v === undefined)
    return `<c r="${ref}"${style}/>`;
  if (cell.t === "n") return `<c r="${ref}"${style}><v>${cell.v}</v></c>`;
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(cell.v))}</t></is></c>`;
}

function columnName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function rowXml(cells: Cell[], rowIndex: number, height?: number): string {
  const attrs = height ? ` ht="${height}" customHeight="1"` : "";
  // Empty cells are still written so every value keeps its column.
  const content = cells.map((c, i) => cellXml(c, i, rowIndex)).join("");
  return `<row r="${rowIndex}"${attrs}>${content}</row>`;
}

interface BuildOptions {
  statusLabel?: string;
  includeAssumptions?: boolean;
}

export function buildBoqXlsx(
  standard: StandardBoqDocument,
  studioDoc: BoqStudioDocument,
  options: BuildOptions = {},
): Uint8Array {
  const cur = standard.metadata.currency;
  const money = `"${cur} "#,##0.00`;
  const rows: string[] = [];
  let r = 0;

  const push = (cells: Cell[], height?: number) => {
    r += 1;
    rows.push(rowXml(cells, r, height));
  };

  push([{ v: "FRELUX BILL OF QUANTITIES", t: "s", style: 1 }], 22);
  push(
    [
      {
        v: `${standard.metadata.standard} · ${cur} · ${studioDoc.measurement_system}`,
        t: "s",
        style: 5,
      },
    ],
    16,
  );
  push([]);
  const meta: Array<[string, string]> = [
    ["BOQ reference", studioDoc.reference || "-"],
    ["Project", studioDoc.title || "-"],
    ["Description", studioDoc.description || "-"],
    ["Client", studioDoc.client.name || "-"],
    ["Contractor", studioDoc.contractor.name || "-"],
    ["Location", studioDoc.client.address || "-"],
    ["Prepared by", studioDoc.prepared_by || "-"],
    ["Prepared date", studioDoc.prepared_date || "-"],
    ["Revision", `R${studioDoc.revision}`],
    ["Status", options.statusLabel ?? documentStatusLabel(studioDoc)],
    ["Template", studioDoc.template_slug],
  ];
  meta.forEach(([label, value]) => {
    push([
      { v: label, t: "s", style: 1 },
      { v: value, t: "s" },
    ]);
  });
  push([]);
  push(
    [
      { v: "Item", t: "s", style: 1 },
      { v: "Description", t: "s", style: 1 },
      { v: "Specification", t: "s", style: 1 },
      { v: "Unit", t: "s", style: 1 },
      { v: "Qty", t: "s", style: 1 },
      { v: "Material rate", t: "s", style: 1 },
      { v: "Labour rate", t: "s", style: 1 },
      ...(studioDoc.commercials
        ? [{ v: "Unit rate", t: "s" as const, style: 1 }]
        : []),
      { v: "Amount", t: "s", style: 1 },
    ],
    18,
  );

  for (const section of standard.sections) {
    push([{ v: `${section.code}  ${section.title}`, t: "s", style: 1 }], 16);
    for (const sub of section.subSections) {
      const items = sub.items;
      if (items.length === 0) continue;
      for (const item of items) {
        push([
          { v: item.itemNumber, t: "s" },
          { v: item.description, t: "s" },
          { v: item.specificationRef ?? "", t: "s" },
          { v: item.unit, t: "s" },
          { v: item.quantity, t: "n" },
          { v: item.materialRate, t: "n", style: 2 },
          { v: item.laborRate, t: "n", style: 2 },
          { v: item.unitRate, t: "n", style: 2 },
          { v: item.totalCost, t: "n", style: 2 },
        ]);
      }
    }
    push([
      { v: "", t: "s" },
      { v: `Section ${section.code} total`, t: "s", style: 1 },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: section.sectionTotal, t: "n", style: 3 },
    ]);
  }

  push([]);
  const summary: Array<[string, number]> = [
    ["Measured works", standard.summary.measuredWorksTotal],
    ["Preliminaries", standard.summary.preliminariesAmount],
    ["Subtotal before overhead & profit", standard.summary.subtotalBeforeOhp],
    ["Overhead & profit", standard.summary.overheadProfitAmount],
    ["Contingency", standard.summary.contingencyAmount],
    ["Subtotal before tax", standard.summary.subtotalBeforeTax],
    [`${standard.summary.taxCategory}`, standard.summary.taxAmount],
    ["Gross total", standard.summary.grossTotal],
    ["Retention", standard.summary.retentionAmount],
    ["Net payable", standard.summary.netPayableTotal],
  ];
  for (const [label, value] of summary) {
    push([
      { v: label, t: "s", style: 1 },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: "", t: "s" },
      { v: value, t: "n", style: 3 },
    ]);
  }

  if (options.includeAssumptions !== false) {
    if (studioDoc.assumptions.length > 0) {
      push([]);
      push([{ v: "Assumptions", t: "s", style: 1 }]);
      studioDoc.assumptions.forEach((a, i) =>
        push([{ v: `${i + 1}. ${a}`, t: "s" }]),
      );
    }
    if (studioDoc.exclusions.length > 0) {
      push([]);
      push([{ v: "Exclusions", t: "s", style: 1 }]);
      studioDoc.exclusions.forEach((x, i) =>
        push([{ v: `${i + 1}. ${x}`, t: "s" }]),
      );
    }
  }

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="11" customWidth="1"/>
    <col min="2" max="2" width="46" customWidth="1"/>
    <col min="3" max="3" width="22" customWidth="1"/>
    <col min="4" max="4" width="8" customWidth="1"/>
    <col min="5" max="5" width="11" customWidth="1"/>
    <col min="6" max="9" width="15" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="${escapeXml(money)}"/></numFmts>
  <fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="BOQ" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  return zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
    "xl/styles.xml": strToU8(styles),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  });
}

export function boqXlsxFilename(doc: BoqStudioDocument): string {
  const safe = (doc.reference || doc.title || "boq")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe || "boq"}-R${doc.revision}.xlsx`;
}

/** Triggers a browser download of the workbook. */
export function downloadBoqXlsx(
  standard: StandardBoqDocument,
  studioDoc: BoqStudioDocument,
  options: BuildOptions = {},
): void {
  const bytes = buildBoqXlsx(standard, studioDoc, options);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = boqXlsxFilename(studioDoc);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
