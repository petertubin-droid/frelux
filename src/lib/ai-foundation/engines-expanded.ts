/**
 * FRELUX AI Foundation, Expanded Engine Registrations
 *
 * Wraps authoritative deterministic calculation engines for AI orchestration.
 * Guarantees that AI features (conversational estimator, photo estimator, etc.)
 * execute physical formulas and calculations deterministically without hallucination.
 */

import type { EngineQuantityLine, EngineCostSummary } from "./types";
import { registerEngine, quantityLine } from "./engines-registry";

export function registerExpandedEngines(): void {
  // ── Electrical Wiring Engine ──
  registerEngine({
    id: "electrical",
    domain: "building",
    title: "FRELUX International Electrical Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX electrical engine",
    async run(rawInput) {
      const { calculateElectrical } =
        await import("@/lib/estimation/electrical-engine");
      const input = rawInput as Parameters<typeof calculateElectrical>[0];
      const result = calculateElectrical(input);

      const quantities: EngineQuantityLine[] = [];
      for (const line of result.cable_lines ?? []) {
        if (line.final_length_m != null && line.final_length_m > 0) {
          quantities.push(
            quantityLine(
              line.label,
              line.final_length_m,
              line.unit || "m",
              line.material_name,
            ),
          );
        }
      }
      for (const box of result.box_lines ?? []) {
        if (box.count > 0) {
          quantities.push(
            quantityLine(box.label, box.count, "pcs", box.material_name),
          );
        }
      }

      const costs: EngineCostSummary = {
        totalMaterials: result.total_material_cost,
        currency: (rawInput as { currency?: string })?.currency || "USD",
        lines: [],
      };

      return {
        quantities,
        costs,
        disclaimers: result.warnings ?? [],
        raw: result,
      };
    },
  });

  // ── Plumbing Sanitary & Supply Engine ──
  registerEngine({
    id: "plumbing",
    domain: "building",
    title: "FRELUX International Plumbing Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX plumbing engine",
    async run(rawInput) {
      const { calculatePlumbing } =
        await import("@/lib/estimation/plumbing-engine");
      const input = rawInput as Parameters<typeof calculatePlumbing>[0];
      const result = calculatePlumbing(input);

      const quantities: EngineQuantityLine[] = [];
      for (const line of result.pipe_lines ?? []) {
        if (line.final_length_m != null && line.final_length_m > 0) {
          quantities.push(
            quantityLine(
              line.label,
              line.final_length_m,
              line.unit || "m",
              line.material_name,
            ),
          );
        }
      }
      for (const fit of result.fitting_allowances ?? []) {
        if (fit.estimated_count > 0) {
          quantities.push(
            quantityLine(fit.category, fit.estimated_count, "pcs", fit.notes),
          );
        }
      }

      const costs: EngineCostSummary = {
        totalMaterials: result.total_material_cost,
        currency: (rawInput as { currency?: string })?.currency || "USD",
        lines: [],
      };

      return {
        quantities,
        costs,
        disclaimers: result.warnings ?? [],
        raw: result,
      };
    },
  });

  // ── Regional Cost Index Engine ──
  registerEngine({
    id: "regional_cost",
    domain: "cost",
    title: "FRELUX Regional Cost Index Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX regional cost engine",
    async run(rawInput) {
      const { applyRegionalCost } =
        await import("@/lib/estimation/regional-cost-engine");
      const input = rawInput as Parameters<typeof applyRegionalCost>[0];
      const result = applyRegionalCost(input);

      const quantities: EngineQuantityLine[] = [
        quantityLine(
          "Applied Multiplier",
          result.applied_factor ?? 1,
          "factor",
          result.applied_source ?? "national_baseline",
        ),
      ];

      const costs: EngineCostSummary = {
        totalMaterials: result.adjusted_cost,
        currency: (rawInput as { currency?: string })?.currency || "USD",
        lines: [
          {
            label: "Location-Adjusted Cost",
            amount: result.adjusted_cost ?? 0,
          },
        ],
      };

      return {
        quantities,
        costs,
        disclaimers: result.warnings ?? [],
        raw: result,
      };
    },
  });

  // ── Roof Geometry Engine ──
  registerEngine({
    id: "roof_geometry_calculation",
    domain: "roof",
    title: "FRELUX Deterministic Roof Geometry Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX roof geometry engine",
    async run(rawInput) {
      const { calculatePitchMultiplier } =
        await import("@/lib/roof/geometry-engine");
      const input = rawInput as {
        pitchDegrees: number;
        projectedArea: number;
      };
      const mult = calculatePitchMultiplier(input.pitchDegrees ?? 20);
      const trueArea = (input.projectedArea ?? 100) * mult;

      const quantities: EngineQuantityLine[] = [
        quantityLine(
          "Pitch Multiplier",
          mult,
          "factor",
          `${input.pitchDegrees}° pitch`,
        ),
        quantityLine(
          "True 3D Surface Area",
          Math.round(trueArea * 100) / 100,
          "m²",
          "Slope area",
        ),
      ];

      return {
        quantities,
        costs: { totalMaterials: 0, currency: "USD", lines: [] },
        disclaimers: [],
        raw: { pitchMultiplier: mult, trueArea },
      };
    },
  });

  // ── Contractor Margin & Markup Engine ──
  registerEngine({
    id: "margin_calculator",
    domain: "cost",
    title: "FRELUX Contractor Margin & Markup Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX margin engine",
    async run(rawInput) {
      const { calculateMargin } =
        await import("@/lib/estimation/margin-engine");
      const input = rawInput as Parameters<typeof calculateMargin>[0];
      const result = calculateMargin(input);

      const quantities: EngineQuantityLine[] = [
        quantityLine(
          "Gross Margin Percentage",
          result.gross_margin_percent,
          "%",
          "Margin",
        ),
        quantityLine("Markup Percentage", result.markup_percent, "%", "Markup"),
      ];

      const costs: EngineCostSummary = {
        totalMaterials: result.selling_price,
        currency: (rawInput as { currency?: string })?.currency || "USD",
        lines: [
          { label: "Direct Cost", amount: result.direct_cost },
          { label: "Overhead", amount: result.overhead_amount },
          { label: "Net Profit", amount: result.net_profit },
          { label: "Selling Price", amount: result.selling_price },
        ],
      };

      return {
        quantities,
        costs,
        disclaimers: [],
        raw: result,
      };
    },
  });
}
