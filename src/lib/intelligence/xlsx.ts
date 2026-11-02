/**
 * Minimal Excel workbook writer for intelligence reports.
 *
 * A real .xlsx (Office Open XML) built in the browser with fflate, so the file
 * opens in Excel, LibreOffice and Google Sheets without a conversion prompt.
 * Numbers stay numbers, money columns carry a currency format, and the header
 * row is frozen so a long cost sheet stays readable.
 */

import { strToU8, zipSync } from "fflate";

export type SheetCell = string | number | null;
export interface Sheet {
  name: string;
  rows: SheetCell[][];
  /** Zero-based column indexes that hold money. */
  moneyColumns?: number[];
  /** Column widths in characters, by index. */
  widths?: number[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

function sheetNameFor(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Sheet";
}

function cellXml(
  value: SheetCell,
  col: number,
  row: number,
  money: boolean,
): string {
  const ref = `${columnName(col)}${row}`;
  if (value === null || value === "")
    return `<c r="${ref}"${money ? ' s="2"' : ""}/>`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${money ? ' s="2"' : ""}><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const money = new Set(sheet.moneyColumns ?? []);
  const cols = (sheet.widths ?? [])
    .map(
      (w, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`,
    )
    .join("");
  const rows = sheet.rows
    .map((cells, rowIndex) => {
      const r = rowIndex + 1;
      const content = cells
        .map((cell, colIndex) =>
          cellXml(cell, colIndex, r, money.has(colIndex) && r > 1),
        )
        .join("");
      const style = r === 1 ? ' s="1" customFormat="1"' : "";
      return `<row r="${r}"${style}>${content}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
${cols ? `<cols>${cols}</cols>` : ""}
<sheetData>${rows}</sheetData>
</worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="2">
<font><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Build the bytes of a workbook from one or more sheets. */
export function buildWorkbook(sheets: Sheet[]): Uint8Array {
  const list = sheets.length
    ? sheets
    : [{ name: "Report", rows: [["No data"]] }];
  const files: Record<string, Uint8Array> = {};

  files["[Content_Types].xml"] =
    strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${list
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join("")}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);

  files["_rels/.rels"] =
    strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  files["xl/workbook.xml"] =
    strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${list
      .map(
        (sheet, i) =>
          `<sheet name="${escapeXml(sheetNameFor(sheet.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
      )
      .join("")}</sheets>
</workbook>`);

  files["xl/_rels/workbook.xml.rels"] =
    strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${list
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  )
  .join("")}
<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  files["xl/styles.xml"] = strToU8(STYLES);
  list.forEach((sheet, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(sheet));
  });

  return zipSync(files, { level: 6 });
}

export function workbookBlob(sheets: Sheet[]): Blob {
  const bytes = buildWorkbook(sheets);
  return new Blob([new Uint8Array(bytes).buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function safeFilename(name: string, fallback = "frelux-report"): string {
  const cleaned = name
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned || fallback;
}
