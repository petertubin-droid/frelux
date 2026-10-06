// =========================================================
// FRELUX Wall Finishing — orchestrator.
//
// estimateWallFinishingProject() runs the full workflow:
//   walls → areas → layer quantities → prices → labour → costs
//
// Prices/labour are injected as a resolution context so the
// engine stays pure and fully testable; the page supplies the
// DB-backed resolver (see prices.ts).
// =========================================================

import type {
  CalcStep,
  LayerCostResult,
  LayerQuantityResult,
  ResolvedLabourRate,
  ResolvedLayerPrice,
  RoomResult,
  WallFinProjectResult,
  WallFinProjectSpec,
  WallResult,
  WallSpecOverrides,
} from "@/types/wallfinishing";
import { getAssembly } from "./assemblies";
import { getWallSystem } from "./wall-systems";
import {
  calculateWallAreas,
  calculateLayerQuantity,
  round,
} from "./quantity-engine";
import { mixComponentQuantity } from "./quantity-engine";
import { calculateLayerCost, calculateProjectCost } from "./cost-engine";
import { buildChecklist } from "./checklists";
import { resolveAssemblyLayers } from "./assembly-overrides";
import { checkCompatibility } from "./compatibility";

export interface WallFinResolutionContext {
  /** resolve a material role price for the project market */
  resolvePrice: (
    role: string,
  ) => Promise<ResolvedLayerPrice> | ResolvedLayerPrice;
  /** resolve a labour task rate for the project market */
  resolveLabour: (
    taskKey: string,
  ) => Promise<ResolvedLabourRate | null> | ResolvedLabourRate | null;
  currency: string;
}

export interface WallOverridesByWall {
  [wallSpecId: string]: WallSpecOverrides | undefined;
}

export async function estimateWallFinishingProject(
  spec: WallFinProjectSpec,
  ctx: WallFinResolutionContext,
  overridesByWall: WallOverridesByWall = {},
): Promise<WallFinProjectResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const rooms: RoomResult[] = [];
  let materialsTotal = 0;
  let labourTotal = 0;

  for (const room of spec.rooms) {
    const wallResults: WallResult[] = [];
    for (const wall of room.walls) {
      const assembly = getAssembly(wall.assemblyId);
      const system = getWallSystem(wall.wallSystemId);
      if (!assembly) {
        errors.push(
          `Wall '${wall.label}': unknown finishing assembly '${wall.assemblyId}'.`,
        );
        continue;
      }
      if (!system) {
        errors.push(
          `Wall '${wall.label}': unknown wall system '${wall.wallSystemId}'.`,
        );
        continue;
      }

      const areas = calculateWallAreas(wall);
      if (!areas.ok) {
        errors.push(...areas.errors);
        continue;
      }
      const overrides = overridesByWall[wall.id];
      const wallLayers: (LayerQuantityResult & LayerCostResult)[] = [];
      let wallCost = 0;

      // one effective layer list per wall: removals, add-backs and
      // reordering are applied here so rows, costs and checklists agree
      const effective = resolveAssemblyLayers(assembly, overrides);
      warnings.push(...effective.warnings);

      for (const layerTemplate of effective.layers) {
        const layerOverrides = overrides?.layers?.[layerTemplate.id];

        // surface compatibility — warns, never silently hides
        const compat = checkCompatibility(
          layerOverrides?.materialRole ?? layerTemplate.materialRole,
          wall.surface,
          system.substrates,
          room.isWetArea,
        );
        for (const w of compat.warnings) {
          warnings.push(`Wall '${wall.label}': ${w}`);
        }

        const qty = calculateLayerQuantity({
          layer: layerTemplate,
          areaM2: areas.finishingAreaM2,
          overrides: layerOverrides,
          includeOptional: true,
        });
        if (effective.reorderedIds.has(layerTemplate.id)) {
          qty.overridden = [...qty.overridden, "order"];
        }
        if (qty.surfaceWarning)
          warnings.push(`Wall '${wall.label}': ${qty.surfaceWarning}`);
        if (qty.purchaseQuantity === 0) continue;

        const role = layerOverrides?.materialRole ?? layerTemplate.materialRole;
        const price = await ctx.resolvePrice(role);

        // volume layers price their mix components
        if (layerTemplate.quantityMode === "volume" && layerTemplate.mix) {
          const comps = mixComponentQuantity(
            qty.baseQuantity,
            layerTemplate.mix,
          );
          for (const c of comps) {
            const compPrice = await ctx.resolvePrice(c.component.role);
            const compQty = round(
              c.quantity *
                (1 +
                  (layerOverrides?.wastePercent ?? layerTemplate.wastePercent) /
                    100),
              3,
            );
            const labour = await ctx.resolveLabour(layerTemplate.labourTask);
            const cost = calculateLayerCost({
              quantity: compQty,
              purchaseUnit: c.unit,
              price: compPrice,
              labour,
              areaM2: areas.finishingAreaM2,
              labourRateOverride: layerOverrides?.labourRateOverride,
              layerName: `${layerTemplate.name} — ${c.component.role}`,
            });
            errors.push(...cost.errors);
            // attribute mix-component costs to the parent layer line
            if (cost.materialCost !== null) {
              materialsTotal += cost.materialCost;
              wallCost += cost.materialCost;
            }
          }
          // labour for a volumetric layer is on the layer, not per component
          const labour = await ctx.resolveLabour(layerTemplate.labourTask);
          const labourOnly = calculateLayerCost({
            quantity: 0,
            purchaseUnit: layerTemplate.unit,
            price: { ...price, unitPrice: 0, unpriced: false },
            labour,
            areaM2: areas.finishingAreaM2,
            labourRateOverride: layerOverrides?.labourRateOverride,
            layerName: layerTemplate.name,
          });
          if (labourOnly.labourCost !== null) {
            labourTotal += labourOnly.labourCost;
            wallCost += labourOnly.labourCost;
          }
          wallLayers.push({
            ...qty,
            materialCost: null,
            labourCost: labourOnly.labourCost,
            labourSteps: [...qty.steps, ...labourOnly.labourSteps],
            currency: ctx.currency,
            overridden: [
              ...qty.overridden,
              ...(layerOverrides?.materialRole ? (["material"] as const) : []),
            ],
          });
          continue;
        }

        const labour = await ctx.resolveLabour(layerTemplate.labourTask);
        const cost = calculateLayerCost({
          quantity: qty.purchaseQuantity,
          purchaseUnit: qty.purchaseUnit,
          price:
            layerOverrides?.unitPriceOverride !== undefined
              ? {
                  ...price,
                  unitPrice: layerOverrides.unitPriceOverride,
                  isManualPrice: true,
                  priceSource: "Manual entry",
                  unpriced: false,
                }
              : price,
          labour,
          areaM2: areas.finishingAreaM2,
          labourRateOverride: layerOverrides?.labourRateOverride,
          layerName: layerTemplate.name,
        });
        errors.push(...cost.errors);
        if (cost.materialCost !== null) {
          materialsTotal += cost.materialCost;
          wallCost += cost.materialCost;
        }
        if (cost.labourCost !== null) {
          labourTotal += cost.labourCost;
          wallCost += cost.labourCost;
        }
        wallLayers.push({
          ...qty,
          materialCost: cost.materialCost,
          labourCost: cost.labourCost,
          labourSteps: [...qty.steps, ...cost.labourSteps],
          currency: ctx.currency,
          overridden: [
            ...qty.overridden,
            ...(layerOverrides?.materialRole ? (["material"] as const) : []),
            ...(layerOverrides?.unitPriceOverride !== undefined
              ? (["price"] as const)
              : []),
          ],
        });
      }

      wallResults.push({
        wallSpecId: wall.id,
        label: wall.label,
        grossAreaM2: areas.grossAreaM2,
        openingAreaM2: areas.openingAreaM2,
        excludedAreaM2: areas.excludedAreaM2,
        netAreaM2: areas.netAreaM2,
        revealAreaM2: areas.revealAreaM2,
        finishingAreaM2: areas.finishingAreaM2,
        steps: areas.steps,
        layers: wallLayers,
        wallCost: round(wallCost, 2),
        warnings: [],
        checklists: effective.layers.map(buildChecklist),
      });
    }
    rooms.push({
      roomSpecId: room.id,
      name: room.name,
      walls: wallResults,
      totalCost: round(
        wallResults.reduce((s, w) => s + w.wallCost, 0),
        2,
      ),
      currency: ctx.currency,
    });
  }

  const cost = calculateProjectCost({
    roomTotals: rooms.map((r) => ({
      roomId: r.roomSpecId,
      name: r.name,
      total: r.totalCost,
      currency: r.currency,
    })),
    projectCurrency: ctx.currency,
    materialsTotal,
    labourTotal,
    extraCosts: spec.extraCosts,
    contingencyPercent: spec.contingencyPercent,
  });

  return {
    ok: errors.length === 0,
    currency: ctx.currency,
    rooms,
    cost,
    warnings,
    errors,
  };
}
