/**
 * FRELUX PROJECT COMPARISON ENGINE
 *
 * Feature 20: Project Comparison
 *
 * Compares multiple cost estimates side-by-side to help users make
 * informed decisions (e.g., different materials, configurations,
 * buildings, or scenarios).
 *
 * Architecture:
 *   MULTIPLE COST ESTIMATES
 *     ↓
 *   ALIGN BY MATERIAL/CATEGORY
 *     ↓
 *   DIFF TABLE (per-line, per-category, per-total)
 *     ↓
 *   COMPARISON RESULT (best value, most expensive, deltas)
 *
 * Pure logic — no external dependencies. Works with any CostEstimate.
 */

import type { CostEstimate, CostLineItem } from './cost-integration';

// =========================================================
// COMPARISON TYPES
// =========================================================

export interface ComparisonColumn {
  label: string;
  estimate: CostEstimate;
}

export interface ComparisonRow {
  materialName: string;
  category: string;
  values: (number | null)[];
  deltas: (number | null)[];
  cheapest: number;
  mostExpensive: number;
  spread: number;
}

export interface CategoryComparisonRow {
  category: string;
  values: (number | null)[];
  deltas: (number | null)[];
}

export interface ComparisonSummary {
  totalValues: (number | null)[];
  totalDeltas: (number | null)[];
  cheapestColumn: number;
  mostExpensiveColumn: number;
  cheapestLabel: string;
  mostExpensiveLabel: string;
  spread: number;
  materialCount: number;
  categoriesCompared: number;
}

export interface ComparisonResult {
  columns: ComparisonColumn[];
  materialRows: ComparisonRow[];
  categoryRows: CategoryComparisonRow[];
  summary: ComparisonSummary;
  explanation: string[];
}

// =========================================================
// COMPARISON BUILDER
// =========================================================

export function compareEstimates(
  columns: ComparisonColumn[],
): ComparisonResult {
  if (columns.length < 2) {
    return {
      columns,
      materialRows: [],
      categoryRows: [],
      summary: {
        totalValues: columns.map((c) => c.estimate.grandTotal),
        totalDeltas: [],
        cheapestColumn: 0,
        mostExpensiveColumn: 0,
        cheapestLabel: columns[0]?.label ?? '',
        mostExpensiveLabel: columns[0]?.label ?? '',
        spread: 0,
        materialCount: 0,
        categoriesCompared: 0,
      },
      explanation: ['Need at least 2 estimates to compare.'],
    };
  }

  // Collect all unique material names
  const allMaterials = new Set<string>();
  for (const col of columns) {
    for (const item of col.estimate.lineItems) {
      allMaterials.add(item.materialName);
    }
  }

  // Build material rows
  const materialRows: ComparisonRow[] = [];
  for (const materialName of allMaterials) {
    const values: (number | null)[] = [];
    let category = '';
    let cheapest = Infinity;
    let mostExpensive = -Infinity;

    for (const col of columns) {
      const item = col.estimate.lineItems.find((i) => i.materialName === materialName);
      if (item) {
        values.push(item.lineTotal);
        category = item.category;
        if (item.lineTotal < cheapest) cheapest = item.lineTotal;
        if (item.lineTotal > mostExpensive) mostExpensive = item.lineTotal;
      } else {
        values.push(null);
      }
    }

    const deltas: (number | null)[] = [];
    const first = values[0];
    for (let i = 0; i < values.length; i++) {
      deltas.push(first !== null && values[i] !== null ? values[i]! - first : null);
    }

    if (cheapest === Infinity) cheapest = 0;
    if (mostExpensive === -Infinity) mostExpensive = 0;

    materialRows.push({
      materialName,
      category,
      values,
      deltas,
      cheapest,
      mostExpensive,
      spread: mostExpensive - cheapest,
    });
  }

  // Build category rows
  const allCategories = new Set<string>();
  for (const col of columns) {
    for (const cat of col.estimate.categories) {
      allCategories.add(cat.name);
    }
  }

  const categoryRows: CategoryComparisonRow[] = [];
  for (const category of allCategories) {
    const values: (number | null)[] = [];
    for (const col of columns) {
      const cat = col.estimate.categories.find((c) => c.name === category);
      values.push(cat ? cat.subtotal : null);
    }

    const deltas: (number | null)[] = [];
    const first = values[0];
    for (let i = 0; i < values.length; i++) {
      deltas.push(first !== null && values[i] !== null ? values[i]! - first : null);
    }

    categoryRows.push({ category, values, deltas });
  }

  // Build summary
  const totalValues = columns.map((c) => c.estimate.grandTotal);
  const totalDeltas: (number | null)[] = [];
  const firstTotal = totalValues[0];
  for (let i = 0; i < totalValues.length; i++) {
    totalDeltas.push(totalValues[i] - firstTotal);
  }

  let cheapestColumn = 0;
  let mostExpensiveColumn = 0;
  for (let i = 1; i < totalValues.length; i++) {
    if (totalValues[i] < totalValues[cheapestColumn]) cheapestColumn = i;
    if (totalValues[i] > totalValues[mostExpensiveColumn]) mostExpensiveColumn = i;
  }

  const spread = totalValues[mostExpensiveColumn] - totalValues[cheapestColumn];

  const explanation: string[] = [];
  explanation.push(`Comparing ${columns.length} estimates`);
  explanation.push(`Cheapest: ${columns[cheapestColumn].label} at ${totalValues[cheapestColumn].toFixed(2)}`);
  explanation.push(`Most expensive: ${columns[mostExpensiveColumn].label} at ${totalValues[mostExpensiveColumn].toFixed(2)}`);
  explanation.push(`Spread: ${spread.toFixed(2)}`);
  explanation.push(`Materials compared: ${materialRows.length}`);
  explanation.push(`Categories compared: ${categoryRows.length}`);

  return {
    columns,
    materialRows,
    categoryRows,
    summary: {
      totalValues,
      totalDeltas,
      cheapestColumn,
      mostExpensiveColumn,
      cheapestLabel: columns[cheapestColumn].label,
      mostExpensiveLabel: columns[mostExpensiveColumn].label,
      spread,
      materialCount: materialRows.length,
      categoriesCompared: categoryRows.length,
    },
    explanation,
  };
}
