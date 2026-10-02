/**
 * FRELUX Mineral Stone Calculator (Phase 3)
 *
 * Thin wrapper over the shared ConfigurableFinishCalculator; all
 * calculation and data handling lives in the shared component and the
 * deterministic engine.
 */

import ConfigurableFinishCalculator from "./ConfigurableFinishCalculator";

export default function MineralStoneCalculator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  return (
    <ConfigurableFinishCalculator
      category="mineral_stone"
      refPrefix="MST"
      title="Mineral Stone Calculator"
      subtitle="Deterministic Mineral Stone estimation from database-verified product data."
      calcEvent="mineral_stone_calculated"
      calculatorType="mineral_stone"
      embedded={embedded}
    />
  );
}
