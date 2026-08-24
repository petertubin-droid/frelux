/**
 * FRELUX VISUAL MEASUREMENT SUMMARY
 *
 * Feature 13 of 16: Visual Measurement Summary
 *
 * The system generates visual summaries of measurements and estimates:
 * - Area bars (relative proportions)
 * - Quantity bars (material quantities)
 * - Category breakdowns
 * - Element-level breakdowns
 * - Table summaries (text, not images)
 *
 * Visual summaries are data structures, not rendered images.
 * The UI layer renders them as charts, bars, or tables.
 *
 * The summary is purely visual — it does NOT change the calculation.
 */

import type { SpaceResult } from './space-engine';
import type { ConstructionProjectResult } from './project-engine';
import type { ProjectMaterialSummary, MaterialCategorySubtotal } from './material-summary';
import { formatM2, roundForDisplay } from './geometry';

// =========================================================
// SUMMARY TYPES
// =========================================================

/**
 * A single bar in a bar chart.
 */
export interface SummaryBar {
  /** Label for this bar */
  label: string;
  /** Value */
  value: number;
  /** Unit (m², buckets, bags, etc.) */
  unit: string;
  /** Percentage of the total (0–100) */
  percent: number;
  /** Color key (semantic, not hardcoded hex) */
  colorKey: 'primary' | 'secondary' | 'accent' | 'muted';
}

/**
 * A group of bars forming a chart.
 */
export interface SummaryChart {
  /** Chart title */
  title: string;
  /** Total value across all bars */
  total: number;
  /** Total unit */
  totalUnit: string;
  /** Bars in the chart */
  bars: SummaryBar[];
}

/**
 * A row in a summary table.
 */
export interface SummaryRow {
  cells: string[];
}

/**
 * A summary table.
 */
export interface SummaryTable {
  title: string;
  headers: string[];
  rows: SummaryRow[];
  footerRow?: SummaryRow;
}

/**
 * A complete visual measurement summary.
 */
export interface VisualMeasurementSummary {
  /** Project name */
  projectName: string;
  /** Area breakdown chart (by element or finish type) */
  areaChart: SummaryChart;
  /** Material quantity chart (by category) */
  materialChart: SummaryChart;
  /** Detail table (all elements) */
  detailTable: SummaryTable;
  /** Key metrics */
  metrics: { label: string; value: string; unit: string }[];
}

// =========================================================
// AREA CHART
// =========================================================

/**
 * Build an area breakdown chart from a project result.
 * Each element becomes a bar showing its relative area.
 */
export function buildAreaChart(
  result: ConstructionProjectResult,
): SummaryChart {
  const bars: SummaryBar[] = [];
  const total = result.totalAreaM2;

  for (const element of result.elementResults) {
    const percent = total > 0 ? (element.totalAreaM2 / total) * 100 : 0;
    bars.push({
      label: element.name,
      value: roundForDisplay(element.totalAreaM2, 4),
      unit: 'm²',
      percent: roundForDisplay(percent, 1),
      colorKey: 'primary',
    });
  }

  return {
    title: 'Area by Element',
    total: roundForDisplay(total, 4),
    totalUnit: 'm²',
    bars,
  };
}

/**
 * Build a finish-type breakdown chart from a project result.
 */
export function buildFinishTypeChart(
  result: ConstructionProjectResult,
): SummaryChart {
  const bars: SummaryBar[] = [];
  const total = result.totalAreaM2;
  const colorKeys: SummaryBar['colorKey'][] = ['primary', 'secondary', 'accent', 'muted'];
  let i = 0;

  for (const [finishType, areaM2] of Object.entries(result.areaByFinishType)) {
    const percent = total > 0 ? (areaM2 / total) * 100 : 0;
    bars.push({
      label: finishType,
      value: roundForDisplay(areaM2, 4),
      unit: 'm²',
      percent: roundForDisplay(percent, 1),
      colorKey: colorKeys[i % colorKeys.length],
    });
    i++;
  }

  return {
    title: 'Area by Finish Type',
    total: roundForDisplay(total, 4),
    totalUnit: 'm²',
    bars,
  };
}

// =========================================================
// MATERIAL CHART
// =========================================================

/**
 * Build a material quantity chart from a material summary.
 * Each category becomes a bar showing total purchase quantity.
 */
export function buildMaterialChart(
  summary: ProjectMaterialSummary,
): SummaryChart {
  const bars: SummaryBar[] = [];
  const totalBuy = summary.categorySubtotals.reduce((sum, s) => sum + s.totalBuyQuantity, 0);
  const colorKeys: SummaryBar['colorKey'][] = ['primary', 'secondary', 'accent', 'muted'];
  let i = 0;

  for (const subtotal of summary.categorySubtotals) {
    const percent = totalBuy > 0 ? (subtotal.totalBuyQuantity / totalBuy) * 100 : 0;
    bars.push({
      label: subtotal.category,
      value: subtotal.totalBuyQuantity,
      unit: subtotal.quantityUnit,
      percent: roundForDisplay(percent, 1),
      colorKey: colorKeys[i % colorKeys.length],
    });
    i++;
  }

  return {
    title: 'Material Quantities by Category',
    total: totalBuy,
    totalUnit: 'mixed',
    bars,
  };
}

// =========================================================
// DETAIL TABLE
// =========================================================

/**
 * Build a detail table from a project result.
 * Shows each element with its area and quantity.
 */
export function buildDetailTable(
  result: ConstructionProjectResult,
): SummaryTable {
  const rows: SummaryRow[] = [];

  for (const element of result.elementResults) {
    rows.push({
      cells: [
        element.name,
        formatM2(element.totalAreaM2),
        `${element.spaceResults.length} space${element.spaceResults.length !== 1 ? 's' : ''}`,
      ],
    });
  }

  return {
    title: 'Element Details',
    headers: ['Element', 'Area', 'Spaces'],
    rows,
    footerRow: {
      cells: ['TOTAL', formatM2(result.totalAreaM2), ''],
    },
  };
}

/**
 * Build a material detail table from a material summary.
 */
export function buildMaterialTable(
  summary: ProjectMaterialSummary,
): SummaryTable {
  const rows: SummaryRow[] = [];

  for (const line of summary.lineItems) {
    rows.push({
      cells: [
        line.materialName,
        line.category,
        `${line.purchaseQuantity} ${line.quantityUnit}`,
        `${line.alreadyHaveQuantity} ${line.quantityUnit}`,
        `${line.buyQuantity} ${line.quantityUnit}`,
      ],
    });
  }

  const totalPurchase = summary.lineItems.reduce((s, l) => s + l.purchaseQuantity, 0);
  const totalBuy = summary.lineItems.reduce((s, l) => s + l.buyQuantity, 0);

  return {
    title: 'Material Breakdown',
    headers: ['Material', 'Category', 'Purchase', 'Have', 'Buy'],
    rows,
    footerRow: {
      cells: ['TOTAL', '', `${totalPurchase}`, '', `${totalBuy}`],
    },
  };
}

// =========================================================
// KEY METRICS
// =========================================================

/**
 * Extract key metrics from a project result.
 */
export function buildKeyMetrics(
  result: ConstructionProjectResult,
  summary?: ProjectMaterialSummary,
): { label: string; value: string; unit: string }[] {
  const metrics: { label: string; value: string; unit: string }[] = [];

  metrics.push({
    label: 'Total Area',
    value: roundForDisplay(result.totalAreaM2, 2).toString(),
    unit: 'm²',
  });

  metrics.push({
    label: 'Elements',
    value: result.elementResults.length.toString(),
    unit: '',
  });

  metrics.push({
    label: 'Spaces',
    value: result.allSpaceResults.length.toString(),
    unit: '',
  });

  const finishTypes = Object.keys(result.areaByFinishType);
  metrics.push({
    label: 'Finish Types',
    value: finishTypes.length.toString(),
    unit: '',
  });

  if (summary) {
    metrics.push({
      label: 'Material Lines',
      value: summary.totalLines.toString(),
      unit: '',
    });
    metrics.push({
      label: 'Total Material Area',
      value: roundForDisplay(summary.grandTotalAreaM2, 2).toString(),
      unit: 'm²',
    });
  }

  return metrics;
}

// =========================================================
// COMPLETE VISUAL SUMMARY
// =========================================================

/**
 * Build a complete visual measurement summary.
 * Combines area charts, material charts, tables, and metrics.
 */
export function buildVisualSummary(
  result: ConstructionProjectResult,
  summary?: ProjectMaterialSummary,
): VisualMeasurementSummary {
  return {
    projectName: result.name,
    areaChart: buildAreaChart(result),
    materialChart: summary ? buildMaterialChart(summary) : {
      title: 'Material Quantities',
      total: 0,
      totalUnit: '',
      bars: [],
    },
    detailTable: buildDetailTable(result),
    metrics: buildKeyMetrics(result, summary),
  };
}

// =========================================================
// TEXT-BASED VISUAL (ASCII BARS)
// =========================================================

/**
 * Render a chart as ASCII bars.
 * This is a fallback when no chart library is available.
 */
export function chartToAscii(chart: SummaryChart): string {
  const lines: string[] = [];
  lines.push(chart.title);
  lines.push('━'.repeat(Math.max(chart.title.length, 40)));

  const maxLabelLen = Math.max(...chart.bars.map((b) => b.label.length), 10);
  const maxBarWidth = 30;

  for (const bar of chart.bars) {
    const barWidth = Math.round((bar.percent / 100) * maxBarWidth);
    const filled = '█'.repeat(barWidth);
    const empty = '░'.repeat(maxBarWidth - barWidth);
    const labelPadded = bar.label.padEnd(maxLabelLen);
    lines.push(`${labelPadded} ${filled}${empty} ${bar.value} ${bar.unit} (${bar.percent}%)`);
  }

  lines.push('');
  lines.push(`Total: ${chart.total} ${chart.totalUnit}`);

  return lines.join('\n');
}

/**
 * Render a table as ASCII text.
 */
export function tableToAscii(table: SummaryTable): string {
  const lines: string[] = [];
  lines.push(table.title);
  lines.push('━'.repeat(Math.max(table.title.length, 40)));

  // Header
  const colWidths = table.headers.map((h, i) =>
    Math.max(h.length, ...table.rows.map((r) => r.cells[i]?.length ?? 0), 10),
  );

  const headerLine = table.headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
  lines.push(headerLine);
  lines.push('─'.repeat(headerLine.length));

  for (const row of table.rows) {
    lines.push(row.cells.map((c, i) => (c ?? '').padEnd(colWidths[i] ?? 0)).join(' | '));
  }

  if (table.footerRow) {
    lines.push('─'.repeat(headerLine.length));
    lines.push(table.footerRow.cells.map((c, i) => (c ?? '').padEnd(colWidths[i] ?? 0)).join(' | '));
  }

  return lines.join('\n');
}
