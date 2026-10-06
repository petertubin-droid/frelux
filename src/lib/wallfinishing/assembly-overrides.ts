// =========================================================
// FRELUX Wall Finishing — assembly override application.
//
// A wall's finishing assembly is a data template; the user can
// remove layers, add them back and reorder them. This module is
// the SINGLE place that applies those overrides so the estimator
// loop, the project aggregate and the checklists all agree on
// the effective layer sequence. Everything invalid produces a
// loud warning — never a silent guess.
// =========================================================

import type {
  WallAssemblyTemplate,
  WallLayerTemplate,
  WallSpecOverrides,
} from "@/types/wallfinishing";

export interface ResolvedAssemblyLayers {
  /** effective layer sequence after removals, add-backs and reordering */
  layers: WallLayerTemplate[];
  /** loud, user-readable warnings (unknown ids, duplicates) */
  warnings: string[];
  /** layer ids whose final position differs from the template order */
  reorderedIds: Set<string>;
}

/**
 * Apply user overrides (remove / add back / reorder) to an assembly
 * template. Pure and synchronous — the estimator calls it once per
 * wall so UI, aggregate and checklists share one layer list.
 */
export function resolveAssemblyLayers(
  assembly: WallAssemblyTemplate,
  overrides?: WallSpecOverrides,
): ResolvedAssemblyLayers {
  const warnings: string[] = [];
  const removed = overrides?.removedLayers ?? [];
  const added = overrides?.addedLayers ?? [];
  const order = overrides?.layerOrder ?? [];
  const templateIds = new Set(assembly.layers.map((l) => l.id));

  // unknown ids → loud warnings, never silently ignored
  const unknown = [...removed, ...added, ...order].filter(
    (id) => !templateIds.has(id),
  );
  for (const id of new Set(unknown)) {
    warnings.push(
      `Assembly '${assembly.name}': unknown layer '${id}' in overrides — ignored.`,
    );
  }

  const effectiveRemoved = removed.filter((id) => templateIds.has(id));
  let layers = assembly.layers.filter((l) => !effectiveRemoved.includes(l.id));

  // add-backs: clone a template layer back into the sequence at its
  // template position (after the last surviving earlier layer)
  for (const id of added.filter((id) => templateIds.has(id))) {
    if (layers.some((l) => l.id === id)) {
      warnings.push(
        `Assembly '${assembly.name}': layer '${id}' is already present — duplicate add ignored.`,
      );
      continue;
    }
    const template = assembly.layers.find((l) => l.id === id)!;
    const templateIdx = assembly.layers.findIndex((l) => l.id === id);
    let insertAt = layers.length;
    for (let i = layers.length - 1; i >= 0; i--) {
      const idx = assembly.layers.findIndex((l) => l.id === layers[i].id);
      if (idx < templateIdx) {
        insertAt = i + 1;
        break;
      }
    }
    layers = [
      ...layers.slice(0, insertAt),
      template,
      ...layers.slice(insertAt),
    ];
  }

  // reorder: listed ids sort first in the listed order; unlisted
  // layers keep their relative order behind them (stable sort)
  if (order.length > 0) {
    const rank = (id: string) => {
      const i = order.indexOf(id);
      return i === -1 ? order.length : i;
    };
    layers = [...layers].sort((a, b) => rank(a.id) - rank(b.id));
  }

  // flag layers whose final position differs from the template —
  // the UI shows a small 'edited: order' indicator for them
  const reorderedIds = new Set<string>();
  if (order.length > 0) {
    const finalPos = new Map(layers.map((l, i) => [l.id, i]));
    for (const l of assembly.layers) {
      const pos = finalPos.get(l.id);
      if (pos !== undefined) {
        const templatePos = assembly.layers.findIndex((t) => t.id === l.id);
        if (pos !== templatePos) reorderedIds.add(l.id);
      }
    }
  }

  return { layers, warnings, reorderedIds };
}
