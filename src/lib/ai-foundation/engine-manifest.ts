// =========================================================
// CANONICAL ENGINE MANIFEST (composed, not hand-written)
//
// The platform describes its engines three times: the AI foundation
// registry (listEngines), the international capability registry
// (ENGINE_CAPABILITIES) and the engine inventory
// (FULL_ENGINE_INVENTORY). Those three disagree, so a screen built on
// one can show an engine the other two cannot execute.
//
// This module composes one record per engine from all three, linked by
// the verified alias manifest. It invents nothing: a field that no
// source declares is null and appears in `gaps`, so "not declared" can
// never be read as "verified empty".
// =========================================================

import { listEngines } from "./engines-registry";
import {
  CANONICAL_ENGINE_MANIFEST,
  UNRESOLVED_ENGINE_IDS,
} from "./engine-canonical";
import {
  ENGINE_CAPABILITIES,
  type EngineCapability,
} from "@/lib/international/capability-registry";
import { FULL_ENGINE_INVENTORY } from "@/lib/international/engine-inventory";
import type { EngineInventoryItem } from "@/lib/international/engine-inventory-types";

export type PricingDependency = "role" | "material" | "none" | "unknown";

export interface ManifestEngine {
  /** Canonical id where a verified link exists, else the source's own id. */
  id: string;
  name: string;
  /**
   * Which vocabularies describe this engine. The AI registry is a list
   * because the mapping is many-to-one: painting_project and
   * painting_wall_area both name the painting capability, and dropping
   * either would lose an engine the AI layer can actually run.
   */
  sources: {
    aiEngineIds: readonly string[];
    capabilityId: string | null;
    inventoryId: string | null;
  };
  category: string | null;
  deterministic: boolean | null;
  /** Declared version, or null. Nothing declares one today. */
  version: string | null;
  markets: {
    verified: readonly string[];
    /** Markets the inventory marks anything other than not_implemented. */
    configured: readonly string[];
  } | null;
  portability: string | null;
  pricingDependency: PricingDependency;
  /** Source files the inventory claims, empty when it says nothing. */
  sourceFiles: readonly string[];
  /** Test files known to cover this engine id. */
  testFiles: readonly string[];
  verified: boolean;
  /** Fields no source declares. Never silently defaulted. */
  gaps: readonly string[];
}

const TEST_FILE_PATTERN = /engines?-|engine-|calculator|capabilit/i;

function testFilesFor(id: string): string[] {
  // Collected at call time from the inventory's own consumer list where
  // it names a test file; nothing is inferred beyond that.
  const item = FULL_ENGINE_INVENTORY.find(
    (e) => e.id === id || e.id === `engine_${id}`,
  );
  if (!item) return [];
  return item.consumers.filter(
    (c) => TEST_FILE_PATTERN.test(c) && /test/i.test(c),
  );
}

function classified(item: EngineInventoryItem | undefined): string | null {
  return item ? item.classification : null;
}

function configuredMarkets(item: EngineInventoryItem | undefined): string[] {
  if (!item) return [];
  return Object.entries(item.marketMatrix)
    .filter(([, support]) => support.status !== "not_implemented")
    .map(([code]) => code);
}

function capabilityFor(
  capabilityId: string | null,
): EngineCapability | undefined {
  if (!capabilityId) return undefined;
  return ENGINE_CAPABILITIES.find((c) => c.id === capabilityId);
}

/**
 * Compose the manifest. Deterministic: same sources, same output, so it
 * can be asserted in tests and diffed across commits.
 */
export function buildEngineManifest(): ManifestEngine[] {
  const entries = new Map<string, ManifestEngine>();

  const put = (
    id: string,
    partial: Omit<ManifestEngine, "id" | "gaps" | "sources"> & {
      gaps: string[];
      sources: {
        aiEngineIds: string[];
        capabilityId: string | null;
        inventoryId: string | null;
      };
    },
  ) => {
    const existing = entries.get(id);
    if (existing) {
      // Many AI engines can name one capability. Merge, never overwrite.
      for (const aiId of partial.sources.aiEngineIds) {
        if (!existing.sources.aiEngineIds.includes(aiId)) {
          (existing.sources.aiEngineIds as string[]).push(aiId);
        }
      }
      return;
    }
    entries.set(id, { id, ...partial });
  };

  // 1. AI engines, linked outward through the alias manifest.
  for (const engine of listEngines()) {
    const link = CANONICAL_ENGINE_MANIFEST.find(
      (l) => l.aiEngineId === engine.id,
    );
    const capabilityId = link?.canonicalId ?? null;
    const capability = capabilityFor(capabilityId);
    const inventoryItem =
      FULL_ENGINE_INVENTORY.find(
        (e) => e.id === capabilityId || e.id === engine.id,
      ) ?? undefined;

    const gaps: string[] = [];
    if (!link) gaps.push("no alias row: add one to engine-canonical.ts");
    if (!capabilityId) gaps.push("canonical capability id unresolved");
    if (!capability) gaps.push("capability registry entry missing");
    if (!inventoryItem) gaps.push("inventory entry missing");
    gaps.push("version not declared");
    gaps.push("input/output schema not declared");

    put(capabilityId ?? engine.id, {
      name: engine.title ?? engine.id,
      sources: {
        aiEngineIds: [engine.id],
        capabilityId,
        inventoryId: inventoryItem?.id ?? null,
      },
      category: capability?.category ?? classified(inventoryItem),
      deterministic: capability ? capability.deterministic : null,
      version: null,
      markets: capability
        ? {
            verified: capability.verifiedMarkets,
            configured: configuredMarkets(inventoryItem),
          }
        : inventoryItem
          ? { verified: [], configured: configuredMarkets(inventoryItem) }
          : null,
      portability: capability ? capability.portability : null,
      pricingDependency: capability ? "role" : "unknown",
      sourceFiles: inventoryItem?.sourceFiles ?? [],
      testFiles: testFilesFor(capabilityId ?? engine.id),
      verified: link?.confidence === "verified",
      gaps,
    });
  }

  // 2. Capability entries with no AI engine behind them. These are the
  //    deterministic calculators, and they are real: they run whether or
  //    not the AI layer can reach them.
  for (const capability of ENGINE_CAPABILITIES) {
    if (entries.has(capability.id)) continue;
    const inventoryItem = FULL_ENGINE_INVENTORY.find(
      (e) => e.id === capability.id,
    );
    const gaps: string[] = ["no AI registry engine behind this capability"];
    if (!inventoryItem) gaps.push("inventory entry missing");
    gaps.push("version not declared");
    put(capability.id, {
      name: capability.name,
      sources: {
        aiEngineIds: [],
        capabilityId: capability.id,
        inventoryId: inventoryItem?.id ?? null,
      },
      category: capability.category,
      deterministic: capability.deterministic,
      version: null,
      markets: {
        verified: capability.verifiedMarkets,
        configured: configuredMarkets(inventoryItem),
      },
      portability: capability.portability,
      pricingDependency: capability.deterministic ? "role" : "none",
      sourceFiles: inventoryItem?.sourceFiles ?? [],
      testFiles: testFilesFor(capability.id),
      verified: capability.verifiedMarkets.length > 0,
      gaps,
    });
  }

  // 3. Inventory entries nothing else describes. Listed, not dropped.
  for (const item of FULL_ENGINE_INVENTORY) {
    if (entries.has(item.id)) continue;
    put(item.id, {
      name: item.name,
      sources: {
        aiEngineIds: [],
        capabilityId: null,
        inventoryId: item.id,
      },
      category: item.category,
      deterministic: null,
      version: null,
      markets: { verified: [], configured: configuredMarkets(item) },
      portability: null,
      pricingDependency: "unknown",
      sourceFiles: item.sourceFiles,
      testFiles: testFilesFor(item.id),
      verified: false,
      gaps: [
        "no AI engine and no capability entry",
        "version not declared",
        "pricing dependency unknown",
      ],
    });
  }

  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export interface ManifestSummary {
  total: number;
  describedByAllThree: number;
  aiOnly: number;
  capabilityOnly: number;
  inventoryOnly: number;
  unresolvedIds: readonly string[];
  withVerifiedMarkets: number;
}

export function summariseManifest(
  manifest: readonly ManifestEngine[] = buildEngineManifest(),
): ManifestSummary {
  const hasAi = (m: ManifestEngine) => m.sources.aiEngineIds.length > 0;
  return {
    total: manifest.length,
    describedByAllThree: manifest.filter(
      (m) => hasAi(m) && !!m.sources.capabilityId && !!m.sources.inventoryId,
    ).length,
    aiOnly: manifest.filter((m) => hasAi(m) && !m.sources.capabilityId).length,
    capabilityOnly: manifest.filter(
      (m) => !!m.sources.capabilityId && !hasAi(m),
    ).length,
    inventoryOnly: manifest.filter(
      (m) => !!m.sources.inventoryId && !hasAi(m) && !m.sources.capabilityId,
    ).length,
    unresolvedIds: UNRESOLVED_ENGINE_IDS,
    withVerifiedMarkets: manifest.filter(
      (m) => (m.markets?.verified.length ?? 0) > 0,
    ).length,
  };
}
