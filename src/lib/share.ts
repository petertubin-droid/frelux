import { trackShare } from "@/lib/achievements";
import { SITE_URL } from "./seo";

/**
 * WhatsApp Share Utility
 * Generates formatted WhatsApp messages from calculator results.
 */

import type {
  CalculatorResult,
  CostEstimateResult,
  CalculatorInput,
  CostEstimateInput,
} from "@/types";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface PaintCalcShareData {
  result: CalculatorResult;
  input: CalculatorInput;
  paintTypeName: string;
}

interface CostEstimateShareData {
  result: CostEstimateResult;
  input: CostEstimateInput;
  paintTypeName: string;
}

function buildPaintCalcMessage(data: PaintCalcShareData): string {
  const { result, input, paintTypeName } = data;
  const lines: string[] = [
    "🎨 *FRELUX Project Calculator Result*",
    "",
    `*Project:* ${input.projectType}`,
    `*Paint type:* ${paintTypeName}`,
    `*Coats:* ${input.coats}`,
    `*Waste margin:* ${input.wasteMargin}%`,
    "",
    `*Paintable area:* ${formatNumber(result.paintableArea)} m²`,
    `*Paint required:* ${formatNumber(result.adjustedLiters, 1)} L`,
    `*Total to purchase:* ${formatNumber(result.totalRecommendedLiters, 1)} L`,
  ];

  if (result.recommendedContainers.length > 0) {
    lines.push("");
    lines.push("*Recommended containers:*");
    for (const c of result.recommendedContainers) {
      lines.push(`  • ${c.count} × ${c.size} L`);
    }
  }

  lines.push("");
  lines.push(
    "_Estimate only. Actual amounts may vary by surface and application._",
  );
  lines.push("");
  lines.push(`🔗 ${SITE_URL}/paint-calculator?mode=room-estimate`);

  return lines.join("\n");
}

function buildCostEstimateMessage(data: CostEstimateShareData): string {
  const { result, input, paintTypeName } = data;
  const lines: string[] = [
    "💰 *FRELUX Cost Estimate*",
    "",
    `*Project:* ${input.projectType}`,
    `*Paint type:* ${paintTypeName}`,
    `*Paintable area:* ${formatNumber(input.paintableArea)} m²`,
    "",
    "*Materials:*",
    `  • Paint: ${formatCurrency(result.paintCost, result.currencySymbol)}`,
  ];

  if (result.primerCost > 0)
    lines.push(
      `  • Primer: ${formatCurrency(result.primerCost, result.currencySymbol)}`,
    );
  if (result.fillerCost > 0)
    lines.push(
      `  • Filler: ${formatCurrency(result.fillerCost, result.currencySymbol)}`,
    );
  if (result.puttyCost > 0)
    lines.push(
      `  • Putty: ${formatCurrency(result.puttyCost, result.currencySymbol)}`,
    );
  if (result.sandpaperCost > 0)
    lines.push(
      `  • Sandpaper: ${formatCurrency(result.sandpaperCost, result.currencySymbol)}`,
    );
  if (result.brushesCost > 0)
    lines.push(
      `  • Brushes: ${formatCurrency(result.brushesCost, result.currencySymbol)}`,
    );
  if (result.rollersCost > 0)
    lines.push(
      `  • Rollers: ${formatCurrency(result.rollersCost, result.currencySymbol)}`,
    );
  if (result.otherMaterialsCost > 0)
    lines.push(
      `  • Other: ${formatCurrency(result.otherMaterialsCost, result.currencySymbol)}`,
    );

  if (result.laborCost > 0) {
    lines.push("");
    lines.push(
      `*Labour:* ${formatCurrency(result.laborCost, result.currencySymbol)}`,
    );
  }

  lines.push("");
  lines.push(
    `*GRAND TOTAL: ${formatCurrency(result.total, result.currencySymbol)}*`,
  );
  lines.push("");
  lines.push("_Estimate only. Actual costs may vary._");
  lines.push("");
  lines.push(`🔗 ${SITE_URL}/paint-calculator?mode=cost`);

  return lines.join("\n");
}

export function sharePaintCalcOnWhatsApp(data: PaintCalcShareData): void {
  const message = encodeURIComponent(buildPaintCalcMessage(data));
  window.open(
    `https://wa.me/?text=${message}`,
    "_blank",
    "noopener,noreferrer",
  );
  trackShare();
}

export function shareCostEstimateOnWhatsApp(data: CostEstimateShareData): void {
  const message = encodeURIComponent(buildCostEstimateMessage(data));
  window.open(
    `https://wa.me/?text=${message}`,
    "_blank",
    "noopener,noreferrer",
  );
  trackShare();
}

export function shareTextOnWhatsApp(text: string): void {
  const message = encodeURIComponent(text);
  window.open(
    `https://wa.me/?text=${message}`,
    "_blank",
    "noopener,noreferrer",
  );
  trackShare();
}
