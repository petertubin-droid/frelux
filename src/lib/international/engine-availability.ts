/**
 * Engine availability, one question: is this engine verified for this market?
 *
 * The inventory no longer carries soft states. Every engine in every market is
 * either verified (market wiring exists and the market has retailer-sourced
 * prices that clear the gate) or unavailable. Anything in between is a bug, and
 * `assertBinaryMatrix` fails the build's test suite if it appears.
 *
 * Statuses are produced by scripts/verify-engine-matrix.mjs, never by hand.
 */
import {
  FULL_ENGINE_INVENTORY,
  type EngineInventoryItem,
} from "./engine-inventory";
import type { MarketCode, MarketSupportStatus } from "./engine-inventory-types";

export const SHIPPED_STATUSES: readonly MarketSupportStatus[] = ["verified"];

export function findEngine(engineId: string): EngineInventoryItem | undefined {
  return FULL_ENGINE_INVENTORY.find((engine) => engine.id === engineId);
}

export function engineMarketStatus(
  engineId: string,
  marketCode: string,
): MarketSupportStatus | null {
  const engine = findEngine(engineId);
  if (!engine) return null;
  return engine.marketMatrix[marketCode as MarketCode]?.status ?? null;
}

export function isEngineVerifiedInMarket(
  engineId: string,
  marketCode: string,
): boolean {
  return engineMarketStatus(engineId, marketCode) === "verified";
}

/** Every engine/market pair whose status is neither verified nor unavailable. */
export function softStatusEntries(): Array<{
  engine: string;
  market: string;
  status: MarketSupportStatus;
}> {
  const offenders: Array<{ engine: string; market: string; status: MarketSupportStatus }> = [];
  for (const engine of FULL_ENGINE_INVENTORY) {
    for (const [market, support] of Object.entries(engine.marketMatrix)) {
      if (support.status !== "verified" && support.status !== "unavailable") {
        offenders.push({ engine: engine.id, market, status: support.status });
      }
    }
  }
  return offenders;
}
