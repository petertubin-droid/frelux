/**
 * FRELUX CALCULATION EXPLANATION ENGINE
 *
 * Feature 8 of 16: Calculation Explanation
 *
 * Every calculator should be capable of showing "HOW FRELUX CALCULATED THIS"
 * with the relevant steps used.
 *
 * The explanation is generated from the ACTUAL calculation result.
 * It does NOT invent explanations that don't match the calculation.
 * It does NOT expose internal code.
 */

import type { CalculationStep } from './types';
import type { SpaceResult } from './space-engine';
import type { FenceResult } from './fence-engine';
import type { MaterialCalculationResult } from './material-engine';
import type { ConstructionProjectResult } from './project-engine';

// =========================================================
// EXPLANATION TYPES
// =========================================================

/**
 * A formatted explanation section.
 */
export interface ExplanationSection {
  /** Section title (e.g. "Room Dimensions", "Area Calculation") */
  title: string;
  /** Ordered steps showing the calculation */
  steps: { label: string; formula: string; value: string }[];
}

/**
 * A complete calculation explanation.
 */
export interface CalculationExplanation {
  /** What was calculated (e.g. "Wall area for Master Bedroom") */
  subject: string;
  /** The final result summary */
  resultSummary: string;
  /** Ordered explanation sections */
  sections: ExplanationSection[];
  /** Any notes or caveats */
  notes?: string[];
}

// =========================================================
// SPACE EXPLANATION
// =========================================================

import { roundForDisplay, formatM2 } from './geometry';

/**
 * Generate an explanation for a space calculation.
 * Shows: dimensions → conversion → area → openings → waste → quantity
 */
export function explainSpaceCalculation(result: SpaceResult): CalculationExplanation {
  const sections: ExplanationSection[] = [];

  // Section 1: Input dimensions
  sections.push({
    title: 'Input Dimensions',
    steps: result.steps.filter((s) => s.label.includes('Convert')),
  });

  // Section 2: Area calculation
  sections.push({
    title: 'Area Calculation',
    steps: result.steps.filter((s) =>
      s.label.includes('area') || s.label.includes('Area')
    ),
  });

  // Section 3: Adjustments (openings, ceiling, waste)
  const adjustmentSteps = result.steps.filter((s) =>
    s.label.includes('deduction') ||
    s.label.includes('Add ceiling') ||
    s.label.includes('Waste')
  );
  if (adjustmentSteps.length > 0) {
    sections.push({
      title: 'Adjustments',
      steps: adjustmentSteps,
    });
  }

  // Section 4: Quantity multiplication
  const quantitySteps = result.steps.filter((s) => s.label.includes('Multiply'));
  if (quantitySteps.length > 0) {
    sections.push({
      title: 'Quantity',
      steps: quantitySteps,
    });
  }

  return {
    subject: `${result.name} (${result.type})`,
    resultSummary: `Total area: ${formatM2(result.totalAreaM2)} (${result.quantity}× ${result.quantity > 1 ? 'spaces' : 'space'})`,
    sections,
  };
}

// =========================================================
// FENCE EXPLANATION
// =========================================================

/**
 * Generate an explanation for a fence calculation.
 * Shows: each dimension → partition area → dimension area → total
 */
export function explainFenceCalculation(result: FenceResult): CalculationExplanation {
  const sections: ExplanationSection[] = [];

  for (const dimResult of result.dimensionResults) {
    sections.push({
      title: `Dimension: ${dimResult.label}`,
      steps: dimResult.steps,
    });
  }

  // Total
  sections.push({
    title: 'Total Fence Area',
    steps: result.steps.filter((s) => s.label.includes('Total')),
  });

  return {
    subject: `Fence: ${result.name}`,
    resultSummary: `Total fence area: ${formatM2(result.totalAreaM2)} across ${result.dimensionResults.length} dimension(s)`,
    sections,
  };
}

// =========================================================
// MATERIAL EXPLANATION
// =========================================================

/**
 * Generate an explanation for a material quantity calculation.
 * Shows: coverage → base quantity → waste → purchase quantity
 */
export function explainMaterialCalculation(
  result: MaterialCalculationResult,
  materialName: string,
): CalculationExplanation {
  const sections: ExplanationSection[] = [];

  // Section 1: Input
  sections.push({
    title: 'Input',
    steps: [
      { label: 'Surface area', formula: '', value: `${roundForDisplay(result.areaM2, 2)} m²` },
      { label: 'Coats', formula: '', value: `${result.coats}` },
    ],
  });

  // Section 2: Coverage and base quantity
  const coverageSteps = result.steps.filter((s) =>
    s.label.includes('Coverage') || s.label.includes('Base')
  );
  if (coverageSteps.length > 0) {
    sections.push({
      title: 'Coverage & Base Quantity',
      steps: coverageSteps,
    });
  }

  // Section 3: Waste and final quantity
  const wasteSteps = result.steps.filter((s) =>
    s.label.includes('Waste') || s.label.includes('Purchase')
  );
  if (wasteSteps.length > 0) {
    sections.push({
      title: 'Waste & Purchase Quantity',
      steps: wasteSteps,
    });
  }

  return {
    subject: `Material: ${materialName}`,
    resultSummary: `Purchase quantity: ${result.purchaseQuantity} ${result.quantityUnit}`,
    sections,
  };
}

// =========================================================
// PROJECT EXPLANATION
// =========================================================

/**
 * Generate an explanation for a full construction project.
 * Shows: each element → total → breakdown by finish type
 */
export function explainProjectCalculation(
  result: ConstructionProjectResult,
): CalculationExplanation {
  const sections: ExplanationSection[] = [];

  // Section per element
  for (const elementResult of result.elementResults) {
    sections.push({
      title: `Element: ${elementResult.name}`,
      steps: elementResult.steps.filter((s) =>
        !s.label.includes('Convert') && !s.label.includes('Partition area')
      ),
    });
  }

  // Total
  sections.push({
    title: 'Project Total',
    steps: result.steps.filter((s) => s.label.includes('Total')),
  });

  // Breakdown by finish type
  const finishTypeSteps = Object.entries(result.areaByFinishType).map(([finish, area]) => ({
    label: finish,
    formula: 'area by finish type',
    value: formatM2(area),
  }));
  if (finishTypeSteps.length > 0) {
    sections.push({
      title: 'Breakdown by Finish Type',
      steps: finishTypeSteps,
    });
  }

  return {
    subject: `Project: ${result.name}`,
    resultSummary: `Total project area: ${formatM2(result.totalAreaM2)}`,
    sections,
  };
}

// =========================================================
// GENERIC EXPLANATION FROM STEPS
// =========================================================

/**
 * Generate a simple explanation from a list of calculation steps.
 * This is the fallback when no specific explanation function applies.
 */
export function explainFromSteps(
  subject: string,
  resultSummary: string,
  steps: CalculationStep[],
): CalculationExplanation {
  return {
    subject,
    resultSummary,
    sections: [{
      title: 'Calculation Steps',
      steps: steps.map((s) => ({ label: s.label, formula: s.formula, value: s.value })),
    }],
  };
}

// =========================================================
// TEXT FORMATTING
// =========================================================

/**
 * Format a calculation explanation as readable text.
 * This can be displayed in a tooltip, modal, or printed report.
 * Does NOT expose internal code.
 */
export function explanationToText(explanation: CalculationExplanation): string {
  const lines: string[] = [];

  lines.push(`HOW FRELUX CALCULATED THIS`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Subject: ${explanation.subject}`);
  lines.push(`Result: ${explanation.resultSummary}`);
  lines.push('');

  for (const section of explanation.sections) {
    lines.push(`▸ ${section.title}`);
    for (const step of section.steps) {
      const formulaPart = step.formula ? ` (${step.formula})` : '';
      lines.push(`  ${step.label}${formulaPart}: ${step.value}`);
    }
    lines.push('');
  }

  if (explanation.notes && explanation.notes.length > 0) {
    lines.push('Notes:');
    for (const note of explanation.notes) {
      lines.push(`  • ${note}`);
    }
  }

  return lines.join('\n');
}
