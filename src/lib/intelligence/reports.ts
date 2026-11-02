/**
 * Intelligence reports: the rows, then the file.
 *
 * Five reports share one row model, so the PDF and the workbook can never
 * disagree about a figure. Row building is pure and tested; the export
 * functions only turn rows into a document.
 *
 * Every report states the currency, the generation time and the fact that
 * prices are observations rather than guarantees — the same honesty the
 * dashboard applies on screen.
 */

import { formatByCode } from "@/lib/international/currency-format";
import type { IntelligenceSnapshot } from "./types";
import { safeFilename, workbookBlob, type Sheet, type SheetCell } from "./xlsx";

export type ReportType =
  | "project_cost"
  | "material_price"
  | "expenditure"
  | "progress"
  | "boq_summary";

export const REPORT_LABELS: Record<ReportType, string> = {
  project_cost: "Project cost report",
  material_price: "Material price report",
  expenditure: "Project expenditure report",
  progress: "Construction progress report",
  boq_summary: "BOQ summary",
};

export interface ReportTable {
  type: ReportType;
  title: string;
  subtitle: string;
  headers: string[];
  rows: SheetCell[][];
  moneyColumns: number[];
  /** Extra sheets, e.g. per-project detail alongside the summary. */
  extraSheets?: Sheet[];
  rowCount: number;
}

function money(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return formatByCode(amount, currency || "XXX", { decimals: 2 });
}

function build(
  type: ReportType,
  subtitle: string,
  headers: string[],
  rows: SheetCell[][],
  moneyColumns: number[],
  extraSheets?: Sheet[],
): ReportTable {
  return {
    type,
    title: REPORT_LABELS[type],
    subtitle,
    headers,
    rows,
    moneyColumns,
    extraSheets,
    rowCount: rows.length,
  };
}

/**
 * Costs: original estimate, latest revision, actual spend and the gap between
 * them. `revisions` is shown as its own sheet so nothing is folded together.
 */
export function projectCostReport(snapshot: IntelligenceSnapshot): ReportTable {
  const rows = snapshot.comparisons.map((row) => [
    row.projectName,
    row.originalTotal ?? 0,
    row.latestTotal ?? 0,
    row.estimateDrift,
    row.actualSpend,
    row.unspentAgainstLatest,
    row.overrun,
    row.revisionCount,
    row.currency,
  ]);

  const revisionRows: SheetCell[][] = [
    ["Project", "Revision", "Label", "Source", "Total", "Currency", "Recorded"],
    ...snapshot.revisions.map((r) => [
      r.projectName,
      r.revisionNo,
      r.label,
      r.source,
      r.total,
      r.currency,
      r.createdAt.slice(0, 10),
    ]),
  ];

  return build(
    "project_cost",
    `Original vs latest estimate vs actual spend. ${snapshot.totals.mixedCurrency ? "Projects span several currencies; compare within a currency only. " : ""}Generated ${snapshot.generatedAt.slice(0, 16).replace("T", " ")} UTC.`,
    [
      "Project",
      `Original (${snapshot.currency})`,
      "Latest revision",
      "Estimate drift",
      "Actual spend",
      "Unspent vs latest",
      "Overrun",
      "Revisions",
      "Currency",
    ],
    rows,
    [1, 2, 3, 4, 5, 6],
    [
      {
        name: "Revisions",
        rows: revisionRows,
        moneyColumns: [4],
        widths: [28, 10, 22, 12, 16, 10, 12],
      },
    ],
  );
}

/** Prices: current, previous, change and where each observation came from. */
export function materialPriceReport(
  snapshot: IntelligenceSnapshot,
): ReportTable {
  const rows = snapshot.prices.moves.map((move) => [
    move.materialName,
    move.category ?? "—",
    move.city ?? "National",
    move.currentPrice,
    move.previousPrice,
    move.changePct,
    move.currency,
    move.observedAt ?? "—",
    move.source,
    move.verification,
    move.supplierCount,
  ]);

  const cityRows: SheetCell[][] = [
    [
      "City",
      "Materials",
      "Median price",
      "Avg change %",
      "Currency",
      "Observed",
      "Verification",
    ],
    ...snapshot.prices.cities.map((city) => [
      city.city,
      city.materialCount,
      city.medianPrice,
      city.changePct,
      city.currency,
      city.observedAt ?? "—",
      city.verification,
    ]),
  ];

  return build(
    "material_price",
    `${snapshot.prices.indexName}. Prices are observations with their source and verification level; they are not quotations. ${snapshot.prices.pendingSubmissions} submission(s) awaiting review.`,
    [
      "Material",
      "Category",
      "City",
      "Current",
      "Previous",
      "Change %",
      "Currency",
      "Observed",
      "Source",
      "Verification",
      "Submissions",
    ],
    rows,
    [3, 4],
    [
      {
        name: "City comparison",
        rows: cityRows,
        moneyColumns: [2],
        widths: [20, 10, 16, 14, 10, 12, 14],
      },
    ],
  );
}

/** Expenditure: approved money per project, pending money, remaining. */
export function expenditureReport(snapshot: IntelligenceSnapshot): ReportTable {
  const rows = snapshot.projects.map((project) => [
    project.name,
    project.status ?? "active",
    project.budget ?? 0,
    project.estimate,
    project.approvedSpend,
    project.pendingSpend,
    project.remaining,
    project.overrun,
    project.currency,
  ]);

  return build(
    "expenditure",
    `Approved expenditure only. Pending items are shown separately and are not counted as spent. Generated ${snapshot.generatedAt.slice(0, 16).replace("T", " ")} UTC.`,
    [
      "Project",
      "Status",
      "Budget",
      "Estimate",
      "Approved spend",
      "Pending",
      "Remaining",
      "Overrun",
      "Currency",
    ],
    rows,
    [2, 3, 4, 5, 6, 7],
  );
}

/** Progress: milestones, latest reports and delivery acceptance per project. */
export function progressReport(snapshot: IntelligenceSnapshot): ReportTable {
  const rows = snapshot.milestones.map((milestone) => [
    milestone.projectName,
    milestone.stageName,
    milestone.status,
    milestone.progressPct,
    milestone.delayed ? "Past end date" : "On track",
    milestone.decisionNote ?? "—",
    milestone.updatedAt ? milestone.updatedAt.slice(0, 10) : "—",
  ]);

  const reportRows: SheetCell[][] = [
    ["Project", "Log date", "Work performed", "Workers", "Weather", "Status"],
    ...snapshot.reports.map((report) => [
      report.projectName,
      report.logDate ?? report.createdAt.slice(0, 10),
      report.workPerformed ?? "—",
      report.workersCount ?? 0,
      report.weather ?? "—",
      report.status,
    ]),
  ];

  const deliveryRows: SheetCell[][] = [
    [
      "Project",
      "Delivery",
      "Ordered",
      "Accepted",
      "Unit",
      "Discrepancy",
      "Supplier",
      "Date",
    ],
    ...snapshot.deliveries.map((delivery) => [
      delivery.projectName,
      delivery.description,
      delivery.quantityOrdered,
      delivery.quantityAccepted,
      delivery.unit,
      delivery.discrepancy,
      delivery.supplier ?? "—",
      delivery.deliveryDate ?? "—",
    ]),
  ];

  return build(
    "progress",
    "Milestones as the site team recorded them. A milestone past the project end date is marked, never assumed complete.",
    [
      "Project",
      "Milestone",
      "Status",
      "Progress %",
      "Timing",
      "Decision note",
      "Updated",
    ],
    rows,
    [],
    [
      {
        name: "Site reports",
        rows: reportRows,
        widths: [28, 12, 48, 10, 16, 12],
      },
      {
        name: "Deliveries",
        rows: deliveryRows,
        widths: [28, 32, 10, 10, 10, 12, 22, 12],
      },
    ],
  );
}

/** BOQ summary: document, reference, revision, total and where it is used. */
export function boqSummaryReport(snapshot: IntelligenceSnapshot): ReportTable {
  const rows = snapshot.boq.map((doc) => [
    doc.title,
    doc.quoteRef,
    doc.status,
    doc.revision,
    doc.total,
    doc.currency,
    doc.marketCode ?? "—",
    doc.updatedAt.slice(0, 10),
  ]);

  return build(
    "boq_summary",
    "Bill of quantities documents in the BOQ studio. Opening a document shows its full structure; this summary is for cost oversight.",
    [
      "Document",
      "Reference",
      "Status",
      "Revision",
      "Total",
      "Currency",
      "Market",
      "Updated",
    ],
    rows,
    [4],
  );
}

export function buildReport(
  type: ReportType,
  snapshot: IntelligenceSnapshot,
): ReportTable {
  switch (type) {
    case "project_cost":
      return projectCostReport(snapshot);
    case "material_price":
      return materialPriceReport(snapshot);
    case "expenditure":
      return expenditureReport(snapshot);
    case "progress":
      return progressReport(snapshot);
    case "boq_summary":
      return boqSummaryReport(snapshot);
  }
}

export function reportSheets(table: ReportTable): Sheet[] {
  return [
    {
      name: table.title.slice(0, 31),
      rows: [table.headers, ...table.rows],
      moneyColumns: table.moneyColumns,
      widths: table.headers.map((header, index) =>
        index === 0 ? 30 : Math.max(12, header.length + 4),
      ),
    },
    ...(table.extraSheets ?? []),
  ];
}

export function downloadReportXlsx(
  table: ReportTable,
  scopeLabel = "portfolio",
): void {
  const blob = workbookBlob(reportSheets(table));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(`frelux-${table.type}-${scopeLabel}`)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const BRAND = { r: 15, g: 23, b: 42 };
const MUTED = { r: 100, g: 116, b: 139 };

export async function downloadReportPdf(
  table: ReportTable,
  scopeLabel = "portfolio",
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const drawHeader = (subtitle: string) => {
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FRELUX", margin, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(table.title, margin, 16);
    doc.text(scopeLabel, pageWidth - margin, 16, { align: "right" });
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.setFontSize(7.5);
    const note = doc.splitTextToSize(subtitle, contentWidth) as string[];
    doc.text(note.slice(0, 3), margin, 28);
  };

  let y = 28 + 10;
  const columns = table.headers.length;
  const colWidth = contentWidth / Math.max(columns, 1);

  const drawRow = (cells: SheetCell[], bold = false) => {
    const lines = cells.map(
      (cell) =>
        doc.splitTextToSize(
          typeof cell === "number"
            ? money(cell, "") || String(cell)
            : String(cell ?? "—"),
          colWidth - 2,
        ) as string[],
    );
    const height = Math.max(...lines.map((l) => l.length), 1) * 3.6 + 2;
    if (y + height > pageHeight - 16) {
      doc.addPage();
      drawHeader(table.subtitle);
      y = 38;
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(bold ? 15 : 51, bold ? 23 : 51, bold ? 42 : 51);
    lines.forEach((line, index) => {
      doc.text(line, margin + index * colWidth + 1, y);
    });
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + height - 2, pageWidth - margin, y + height - 2);
    y += height;
  };

  drawHeader(table.subtitle);
  drawRow(table.headers, true);
  for (const row of table.rows) drawRow(row);
  if (!table.rows.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("No records in this report yet.", margin, y + 4);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(
      `FRELUX Construction Intelligence · generated ${table.subtitle.match(/Generated [^.]*/)?.[0] ?? ""}`.trim(),
      margin,
      pageHeight - 6,
    );
    doc.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  doc.save(`${safeFilename(`frelux-${table.type}-${scopeLabel}`)}.pdf`);
}
