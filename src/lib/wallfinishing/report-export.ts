/**
 * Wall Finish Report Export
 *
 * Builds professional deliverables from a wall finishing estimate:
 * - a printable HTML report (browser print dialog → save as PDF)
 * - an Excel workbook (summary, layers, quality control)
 *
 * Both are pure data renderers over the verified estimate result —
 * no invented numbers; every value comes from the engine output.
 */

import { downloadExcel, type CsvColumn } from "@/lib/export-utils";
import { QC_STATUS_LABELS } from "./checklists";
import type {
  WallFinProjectResult,
  WallFinProjectSpec,
  WallResult,
} from "@/types/wallfinishing";

/* ── shared formatting ──────────────────────────────────── */

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const num = (v: number, d = 2): string =>
  v.toLocaleString("en-GB", { maximumFractionDigits: d });

const money = (v: number | null | undefined, currency: string): string =>
  v === null || v === undefined ? "—" : `${num(v)} ${currency}`;

/* ── aggregate rows (shared by PDF and Excel) ────────────── */

export interface WallFinSummaryRow {
  label: string;
  value: string;
}

export function buildWallFinSummaryRows(
  spec: WallFinProjectSpec,
  result: WallFinProjectResult,
): WallFinSummaryRow[] {
  const totalArea = result.rooms
    .flatMap((r) => r.walls)
    .reduce((sum, w) => sum + w.finishingAreaM2, 0);
  const c = result.cost;
  return [
    { label: "Project", value: spec.name },
    { label: "Country / market", value: spec.countryCode },
    { label: "Region", value: spec.region || "—" },
    { label: "Building type", value: spec.buildingType },
    {
      label: "Total finishing area",
      value: `${num(totalArea)} m²`,
    },
    { label: "Materials", value: money(c.materials, result.currency) },
    { label: "Labour", value: money(c.labour, result.currency) },
    { label: "Equipment", value: money(c.equipment, result.currency) },
    { label: "Transport", value: money(c.transport, result.currency) },
    {
      label: `Contingency (${spec.contingencyPercent}%)`,
      value: money(c.contingency, result.currency),
    },
    { label: "Subtotal", value: money(c.subtotal, result.currency) },
    { label: "Total (estimate)", value: money(c.total, result.currency) },
  ];
}

export interface WallFinLayerRow {
  room: string;
  wall: string;
  layer: string;
  material: string;
  quantity: number;
  unit: string;
  materialCost: string;
  labourCost: string;
  currency: string;
}

export function buildWallFinLayerRows(
  result: WallFinProjectResult,
): WallFinLayerRow[] {
  const rows: WallFinLayerRow[] = [];
  for (const room of result.rooms) {
    for (const wall of room.walls) {
      for (const layer of wall.layers) {
        rows.push({
          room: room.name,
          wall: wall.label,
          layer: layer.layerName,
          material: layer.materialName,
          quantity: layer.purchaseQuantity,
          unit: layer.purchaseUnit,
          materialCost: money(layer.materialCost, layer.currency),
          labourCost: money(layer.labourCost, layer.currency),
          currency: layer.currency,
        });
      }
    }
  }
  return rows;
}

export interface WallFinQcRow {
  room: string;
  wall: string;
  layer: string;
  item: string;
  status: string;
}

export function buildWallFinQcRows(
  result: WallFinProjectResult,
): WallFinQcRow[] {
  const rows: WallFinQcRow[] = [];
  for (const room of result.rooms) {
    for (const wall of room.walls) {
      for (const checklist of wall.checklists) {
        for (const item of checklist.items) {
          rows.push({
            room: room.name,
            wall: wall.label,
            layer: checklist.layerName,
            item: item.label,
            status: QC_STATUS_LABELS[item.status],
          });
        }
      }
    }
  }
  return rows;
}

/* ── PDF (printable HTML) ────────────────────────────────── */

function wallTable(wall: WallResult, currency: string): string {
  const layerRows = wall.layers
    .map(
      (l) => `<tr>
        <td>${esc(l.layerName)}</td>
        <td>${esc(l.materialName)}</td>
        <td>${num(l.purchaseQuantity)} ${esc(l.purchaseUnit)}</td>
        <td>${money(l.materialCost, currency)}</td>
        <td>${money(l.labourCost, currency)}</td>
      </tr>`,
    )
    .join("");
  const qcBlocks = wall.checklists
    .map(
      (c) => `<p class="qc-layer">${esc(c.layerName)}</p>
      <ul>${c.items
        .map(
          (i) =>
            `<li>${esc(i.label)} — ${esc(QC_STATUS_LABELS[i.status])}</li>`,
        )
        .join("")}</ul>`,
    )
    .join("");
  return `
  <div class="wall">
    <h3>${esc(wall.label)}</h3>
    <p class="meta">${num(wall.grossAreaM2)} m² gross → ${num(wall.netAreaM2)} m² net
      ${wall.revealAreaM2 > 0 ? `(+ ${num(wall.revealAreaM2)} m² reveals)` : ""}
      → ${num(wall.finishingAreaM2)} m² finished</p>
    <table>
      <thead><tr><th>Layer</th><th>Material</th><th>Quantity</th><th>Material</th><th>Labour</th></tr></thead>
      <tbody>${layerRows}</tbody>
    </table>
    <p class="wall-total">Wall total: <strong>${money(wall.wallCost, currency)}</strong></p>
    ${wall.warnings.length ? `<p class="warn">${wall.warnings.map(esc).join(" • ")}</p>` : ""}
    ${qcBlocks ? `<div class="qc"><h4>Quality checklist</h4>${qcBlocks}</div>` : ""}
  </div>`;
}

export function buildWallFinReportHtml(
  spec: WallFinProjectSpec,
  result: WallFinProjectResult,
): string {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const ref = `FRELUX-WF-${Date.now().toString().slice(-8)}`;
  const c = result.cost;
  const summaryRows = buildWallFinSummaryRows(spec, result)
    .map(
      (r) =>
        `<div class="row"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></div>`,
    )
    .join("");
  const walls = result.rooms
    .flatMap((room) => room.walls.map((w) => wallTable(w, result.currency)))
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(spec.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2430; background: #f4f4f8; margin: 0; padding: 24px; }
  .report { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .brand { color: #7C3AED; font-weight: bold; letter-spacing: 2px; font-size: 13px; text-transform: uppercase; }
  .meta { color: #6b7280; font-size: 12px; margin: 0 0 24px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin: 28px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #7C3AED; color: #fff; text-align: left; padding: 6px 8px; }
  td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
  .summary .row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; border-bottom: 1px dashed #e5e7eb; }
  .summary .row span:last-child { font-weight: 600; }
  .grand { font-size: 16px; font-weight: bold; border-top: 2px solid #7C3AED; margin-top: 4px; padding-top: 8px; }
  .wall { margin-bottom: 28px; }
  .wall h3 { font-size: 14px; margin: 0; }
  .wall .meta { margin: 2px 0 8px; font-size: 11px; }
  .wall-total { font-size: 13px; text-align: right; }
  .warn { font-size: 11px; color: #b45309; background: #fffbeb; border-radius: 6px; padding: 6px 8px; }
  .qc { margin-top: 10px; font-size: 11px; }
  .qc h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; color: #9ca3af; }
  .qc-layer { margin: 6px 0 2px; font-weight: 600; }
  .qc ul { margin: 0 0 0 16px; padding: 0; color: #4b5563; }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print { body { background: #fff; padding: 0; } .report { padding: 12px; } @page { margin: 1.5cm; } }
</style>
</head>
<body>
<div class="report">
  <p class="brand">FRELUX Wall Finishing Estimate</p>
  <h1>${esc(spec.name)}</h1>
  <p class="meta">Reference ${esc(ref)} • ${esc(date)} • all amounts in ${esc(result.currency)}</p>

  <h2>Summary</h2>
  <div class="summary">
    ${summaryRows}
    <div class="row grand"><span>Total (estimate)</span><span>${money(c.total, result.currency)}</span></div>
  </div>

  <h2>Layer specification</h2>
  ${walls}

  ${
    result.warnings.length
      ? `<h2>Notes & warnings</h2><ul>${result.warnings
          .map((w) => `<li>${esc(w)}</li>`)
          .join("")}</ul>`
      : ""
  }

  <div class="footer">
    Generated by FRELUX — estimate only; verify quantities, coverage and local
    prices on site before purchasing.
  </div>
</div>
</body>
</html>`;
}

export function exportWallFinPdf(
  spec: WallFinProjectSpec,
  result: WallFinProjectResult,
): void {
  const html = buildWallFinReportHtml(spec, result);
  const w = window.open("", "_blank");
  if (!w) {
    // popup blocked — fall back to a blob download of the report
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wall-finishing-estimate.html";
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

/* ── Excel ───────────────────────────────────────────────── */

export function exportWallFinExcel(
  spec: WallFinProjectSpec,
  result: WallFinProjectResult,
): void {
  const summaryCols: CsvColumn[] = [
    { key: "label", header: "Item" },
    { key: "value", header: "Value" },
  ];
  const layerCols: CsvColumn[] = [
    { key: "room", header: "Room" },
    { key: "wall", header: "Wall" },
    { key: "layer", header: "Layer" },
    { key: "material", header: "Material" },
    { key: "quantity", header: "Quantity" },
    { key: "unit", header: "Unit" },
    { key: "materialCost", header: "Material cost" },
    { key: "labourCost", header: "Labour cost" },
    { key: "currency", header: "Currency" },
  ];
  const qcCols: CsvColumn[] = [
    { key: "room", header: "Room" },
    { key: "wall", header: "Wall" },
    { key: "layer", header: "Layer" },
    { key: "item", header: "Checklist item" },
    { key: "status", header: "Status" },
  ];
  downloadExcel("wall-finishing-estimate", [
    {
      name: "Summary",
      rows: buildWallFinSummaryRows(spec, result) as unknown as Record<
        string,
        unknown
      >[],
      columns: summaryCols,
    },
    {
      name: "Layers",
      rows: buildWallFinLayerRows(result) as unknown as Record<
        string,
        unknown
      >[],
      columns: layerCols,
    },
    {
      name: "Quality control",
      rows: buildWallFinQcRows(result) as unknown as Record<string, unknown>[],
      columns: qcCols,
    },
  ]);
}
