/**
 * FRELUX ESTIMATE REPORT ENGINE
 *
 * Feature 14 of 16: Estimate Report Engine
 *
 * The system generates structured report data for estimates:
 * - Project information
 * - Element breakdown
 * - Material list
 * - Calculation explanation
 * - Confidence assessment
 * - Rule traceability
 *
 * The report is a structured data object — the UI renders it as PDF,
 * HTML, or on-screen. The engine does NOT hardcode PDF formatting.
 *
 * Saved estimates remain reproducible through rule version references.
 */

import type { ConstructionProjectResult } from './project-engine';
import type { ProjectMaterialSummary } from './material-summary';
import type { CalculationExplanation } from './explanation-engine';
import type { ConfidenceAssessment } from './confidence-engine';
import type { RuleVersionReference } from './rule-versioning';
import { explainProjectCalculation } from './explanation-engine';
import { formatM2, roundForDisplay } from './geometry';

// =========================================================
// REPORT TYPES
// =========================================================

/**
 * Report section type.
 */
export type ReportSectionType =
  | 'header'
  | 'project_info'
  | 'element_breakdown'
  | 'material_list'
  | 'calculation_explanation'
  | 'confidence_assessment'
  | 'rule_traceability'
  | 'waste_summary'
  | 'already_have'
  | 'footer';

/**
 * A report section.
 */
export interface ReportSection {
  type: ReportSectionType;
  title: string;
  /** Key-value pairs for structured data */
  fields: { label: string; value: string }[];
  /** Optional table within this section */
  table?: {
    headers: string[];
    rows: string[][];
  };
  /** Optional explanation text */
  text?: string;
}

/**
 * A complete estimate report.
 */
export interface EstimateReport {
  /** Report ID */
  reportId: string;
  /** Project name */
  projectName: string;
  /** Report generation date (ISO 8601) */
  generatedAt: string;
  /** Report sections in order */
  sections: ReportSection[];
  /** Rule version references for reproducibility */
  ruleReferences: RuleVersionReference[];
  /** Summary metrics */
  metrics: { label: string; value: string }[];
}

// =========================================================
// REPORT BUILDER
// =========================================================

let reportIdCounter = 0;

function nextReportId(): string {
  reportIdCounter++;
  return `report-${Date.now()}-${reportIdCounter}`;
}

/**
 * Build a complete estimate report.
 *
 * @param projectResult - The project calculation result
 * @param materialSummary - The material summary (optional)
 * @param confidence - The confidence assessment (optional)
 * @param ruleReferences - Rule version references for traceability
 * @param options - Report options
 * @returns Complete estimate report
 */
export function buildEstimateReport(
  projectResult: ConstructionProjectResult,
  materialSummary?: ProjectMaterialSummary,
  confidence?: ConfidenceAssessment,
  ruleReferences: RuleVersionReference[] = [],
  options: {
    projectName?: string;
    includeExplanation?: boolean;
    includeConfidence?: boolean;
    includeRuleTrace?: boolean;
  } = {},
): EstimateReport {
  const sections: ReportSection[] = [];
  const metrics: { label: string; value: string }[] = [];
  const projectName = options.projectName ?? projectResult.name;
  const generatedAt = new Date().toISOString();

  // Section: Header
  sections.push({
    type: 'header',
    title: 'FRELUX ESTIMATE REPORT',
    fields: [
      { label: 'Project', value: projectName },
      { label: 'Generated', value: new Date(generatedAt).toLocaleString() },
      { label: 'Report ID', value: nextReportId() },
    ],
  });

  // Section: Project Info
  sections.push({
    type: 'project_info',
    title: 'Project Information',
    fields: [
      { label: 'Total Area', value: formatM2(projectResult.totalAreaM2) },
      { label: 'Elements', value: projectResult.elementResults.length.toString() },
      { label: 'Spaces', value: projectResult.allSpaceResults.length.toString() },
      { label: 'Finish Types', value: Object.keys(projectResult.areaByFinishType).length.toString() },
    ],
  });

  metrics.push({ label: 'Total Area', value: formatM2(projectResult.totalAreaM2) });
  metrics.push({ label: 'Elements', value: projectResult.elementResults.length.toString() });

  // Section: Element Breakdown
  const elementRows = projectResult.elementResults.map((e) => [
    e.name,
    formatM2(e.totalAreaM2),
    `${e.spaceResults.length} space${e.spaceResults.length !== 1 ? 's' : ''}`,
  ]);
  sections.push({
    type: 'element_breakdown',
    title: 'Element Breakdown',
    fields: [],
    table: {
      headers: ['Element', 'Area (m²)', 'Spaces'],
      rows: elementRows,
    },
  });

  // Section: Finish Type Breakdown
  const finishRows = Object.entries(projectResult.areaByFinishType).map(([finish, area]) => [
    finish,
    formatM2(area),
  ]);
  if (finishRows.length > 0) {
    sections.push({
      type: 'element_breakdown',
      title: 'Area by Finish Type',
      fields: [],
      table: {
        headers: ['Finish Type', 'Area (m²)'],
        rows: finishRows,
      },
    });
  }

  // Section: Material List
  if (materialSummary && materialSummary.lineItems.length > 0) {
    const materialRows = materialSummary.lineItems.map((l) => [
      l.materialName,
      l.category,
      `${l.purchaseQuantity} ${l.quantityUnit}`,
      `${l.alreadyHaveQuantity} ${l.quantityUnit}`,
      `${l.buyQuantity} ${l.quantityUnit}`,
    ]);
    const totalPurchase = materialSummary.lineItems.reduce((s, l) => s + l.purchaseQuantity, 0);
    const totalBuy = materialSummary.lineItems.reduce((s, l) => s + l.buyQuantity, 0);
    sections.push({
      type: 'material_list',
      title: 'Material List',
      fields: [
        { label: 'Total Lines', value: materialSummary.totalLines.toString() },
        { label: 'Total Purchase', value: totalPurchase.toString() },
        { label: 'Total Buy', value: totalBuy.toString() },
      ],
      table: {
        headers: ['Material', 'Category', 'Purchase', 'Have', 'Buy'],
        rows: materialRows,
      },
    });

    metrics.push({ label: 'Material Lines', value: materialSummary.totalLines.toString() });
    metrics.push({ label: 'Total Buy', value: totalBuy.toString() });
  }

  // Section: Calculation Explanation
  if (options.includeExplanation !== false) {
    const explanation = explainProjectCalculation(projectResult);
    const explanationText = explanation.sections.map((s) => {
      const steps = s.steps.map((st) => `  ${st.label}: ${st.value}`).join('\n');
      return `${s.title}\n${steps}`;
    }).join('\n\n');

    sections.push({
      type: 'calculation_explanation',
      title: 'How FRELUX Calculated This',
      fields: [],
      text: explanationText,
    });
  }

  // Section: Confidence Assessment
  if (options.includeConfidence !== false && confidence) {
    const factorRows = confidence.factors.map((f) => [
      f.name,
      f.passed ? '✓' : '✗',
      f.detail,
    ]);
    sections.push({
      type: 'confidence_assessment',
      title: 'Confidence Assessment',
      fields: [
        { label: 'Overall', value: confidence.level.toUpperCase() },
        { label: 'Calculation', value: confidence.calculationConfidence.toUpperCase() },
        { label: 'Price', value: confidence.priceConfidence === 'unavailable' ? 'N/A' : confidence.priceConfidence.toUpperCase() },
        { label: 'Summary', value: confidence.summary },
      ],
      table: factorRows.length > 0 ? {
        headers: ['Factor', 'Status', 'Detail'],
        rows: factorRows,
      } : undefined,
    });
  }

  // Section: Rule Traceability
  if (options.includeRuleTrace !== false && ruleReferences.length > 0) {
    const ruleRows = ruleReferences.map((ref) => [
      ref.baseRuleId,
      `v${ref.version}`,
      ref.snapshot.ruleName,
    ]);
    sections.push({
      type: 'rule_traceability',
      title: 'Rule Traceability',
      fields: [
        { label: 'Rules Referenced', value: ruleReferences.length.toString() },
      ],
      table: {
        headers: ['Rule ID', 'Version', 'Rule Name'],
        rows: ruleRows,
      },
    });
  }

  // Section: Footer
  sections.push({
    type: 'footer',
    title: 'Report End',
    fields: [
      { label: 'Generated by', value: 'FRELUX Estimation Engine' },
      { label: 'Date', value: new Date(generatedAt).toLocaleString() },
    ],
  });

  return {
    reportId: sections[0].fields.find((f) => f.label === 'Report ID')?.value ?? nextReportId(),
    projectName,
    generatedAt,
    sections,
    ruleReferences,
    metrics,
  };
}

// =========================================================
// REPORT FORMATTING
// =========================================================

/**
 * Format a report as plain text.
 * This can be displayed, printed, or saved as .txt.
 */
export function reportToText(report: EstimateReport): string {
  const lines: string[] = [];

  for (const section of report.sections) {
    lines.push(section.title);
    lines.push('━'.repeat(Math.max(section.title.length, 40)));

    if (section.fields.length > 0) {
      for (const field of section.fields) {
        lines.push(`  ${field.label}: ${field.value}`);
      }
      lines.push('');
    }

    if (section.table) {
      lines.push(`  ${section.table.headers.join(' | ')}`);
      lines.push(`  ${'─'.repeat(section.table.headers.join(' | ').length)}`);
      for (const row of section.table.rows) {
        lines.push(`  ${row.join(' | ')}`);
      }
      lines.push('');
    }

    if (section.text) {
      lines.push(section.text);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format a report as Markdown.
 */
export function reportToMarkdown(report: EstimateReport): string {
  const lines: string[] = [];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');

    if (section.fields.length > 0) {
      for (const field of section.fields) {
        lines.push(`- **${field.label}**: ${field.value}`);
      }
      lines.push('');
    }

    if (section.table) {
      lines.push(`| ${section.table.headers.join(' | ')} |`);
      lines.push(`| ${section.table.headers.map(() => '---').join(' | ')} |`);
      for (const row of section.table.rows) {
        lines.push(`| ${row.join(' | ')} |`);
      }
      lines.push('');
    }

    if (section.text) {
      lines.push('```');
      lines.push(section.text);
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}
