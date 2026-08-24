/**
 * FRELUX MEASUREMENT → CALCULATION ENGINE BRIDGES
 *
 * These bridge functions connect the unified measurement system to the
 * existing FRELUX calculation engines. They take a MeasurementProjectResult
 * (normalised area in m²) and feed it to the appropriate engine.
 *
 * Existing FRELUX calculation rules are PRESERVED — these bridges only
 * provide the normalised input, they do NOT change the calculation logic.
 */

import type { MeasurementProjectResult } from './types';
import type {
  ScreedingEstimateInput,
  ScreedingEstimateResult,
} from '@/types';
import { calculateScreedingEstimate } from '@/lib/utils';
import { calculateTileRequirement, type TileCalculationResult } from './hierarchy';
import type { MeasurementEntry } from './types';

// =========================================================
// Screeding Bridge
// =========================================================

/**
 * Bridge: measurement result → existing screeding material calculation.
 *
 * The measurement system provides the total wall/surface area in m².
 * The existing FRELUX screeding material rules then calculate material quantity.
 *
 * The existing calculateScreedingEstimate() is PRESERVED — we just feed it
 * the normalised m² value from the measurement system.
 */
export function bridgeScreeding(
  projectResult: MeasurementProjectResult,
  screedingConfig: Omit<ScreedingEstimateInput, 'netScreedingArea'>,
): ScreedingEstimateResult {
  return calculateScreedingEstimate({
    ...screedingConfig,
    netScreedingArea: projectResult.totalAreaM2,
  });
}

// =========================================================
// Tiling Bridge
// =========================================================

/**
 * Bridge: measurement result → tiling calculation.
 *
 * For tiling, we need the tile config from the measurement entries
 * (not just the aggregate area), because different surfaces might have
 * different tile configs. For now, we use the first entry's tile config.
 *
 * The tiling engine (calculateTileRequirement) handles the tile math —
 * this bridge extracts the config and passes it through.
 */
export function bridgeTiling(
  projectResult: MeasurementProjectResult,
  entries: MeasurementEntry[],
): TileCalculationResult[] {
  const results: TileCalculationResult[] = [];

  for (const entryResult of projectResult.entryResults) {
    const entry = entries.find((e) => e.id === entryResult.entryId);
    if (!entry?.tileConfig) continue;

    const tileResult = calculateTileRequirement(
      entryResult.totalAreaM2,
      entry.tileConfig,
    );
    results.push(tileResult);
  }

  return results;
}

/**
 * Aggregate tiling results across all surfaces.
 */
export function aggregateTilingResults(results: TileCalculationResult[]): {
  totalAreaM2: number;
  totalTiles: number;
  totalCartons: number;
  perSurface: TileCalculationResult[];
} {
  return {
    totalAreaM2: results.reduce((sum, r) => sum + r.surfaceAreaM2, 0),
    totalTiles: results.reduce((sum, r) => sum + r.tilesRequired, 0),
    totalCartons: results.reduce((sum, r) => sum + r.cartonsRequired, 0),
    perSurface: results,
  };
}

// =========================================================
// Painting Bridge
// =========================================================

/**
 * Bridge: measurement result → painting engine.
 *
 * Painting uses the EXISTING FRELUX paint calculation engine (paint-engine.ts)
 * which follows FRELUX's bucket-based rules. This bridge provides the normalised
 * room dimensions from the measurement system, which the paint engine uses
 * according to its own room-based/bucket-based logic.
 *
 * The paint engine receives normalised dimensions (in metres) because
 * the measurement system already converted the user's input.
 *
 * NOTE: The paint engine uses room-level inputs (length, width, height)
 * not aggregate m². So we pass individual entry results, not just total area.
 */
export function bridgePainting(
  projectResult: MeasurementProjectResult,
): Array<{
  entryId: string;
  lengthM: number;
  widthM: number | undefined;
  heightM: number | undefined;
  areaM2: number;
}> {
  return projectResult.entryResults.map((er) => ({
    entryId: er.entryId,
    lengthM: er.normalizedLengthM,
    widthM: er.normalizedWidthM,
    heightM: er.normalizedHeightM,
    areaM2: er.totalAreaM2,
  }));
}

// =========================================================
// Grafitex Bridge
// =========================================================

/**
 * Bridge: measurement result → Grafitex configurable calculation.
 *
 * Grafitex area is computed in m². The material coverage/yield rule is
 * NOT yet defined (spec section 16, 29, 30). This bridge returns the
 * total area and a configurable slot for the future material rule.
 *
 * DO NOT invent a coverage ratio here.
 */
export interface GrafitexBridgeResult {
  totalAreaM2: number;
  /** Material quantity = null means the Grafitex material rule is not yet configured */
  materialQuantity: null;
  /** Human-readable note about the missing rule */
  materialRuleStatus: 'NOT_CONFIGURED';
  breakdown: MeasurementProjectResult['steps'];
}

export function bridgeGrafitex(
  projectResult: MeasurementProjectResult,
): GrafitexBridgeResult {
  return {
    totalAreaM2: projectResult.totalAreaM2,
    materialQuantity: null,
    materialRuleStatus: 'NOT_CONFIGURED',
    breakdown: projectResult.steps,
  };
}
