/**
 * Register every engine adapter the repository ships.
 *
 * The registry module itself registers ten engines. Three further modules
 * (engines-expanded, engines-phase2, engines-structural) each register their
 * own adapters, but nothing called them outside the test suite, so the running
 * application only ever saw the ten. Engine Studio therefore reported a
 * fraction of the engines that actually exist, and an operator could not run
 * electrical, plumbing, tile, POP ceiling, screeding or the structural family
 * at all.
 *
 * This module is the single place that activates them. It is idempotent:
 * registerEngine treats a repeat registration of the same id, title and domain
 * as the engine re-registering itself and replaces it quietly, which is what
 * these modules already assume. A different engine claiming a taken id still
 * throws, so activation cannot paper over a real collision.
 */
import { registerExpandedEngines } from "./engines-expanded";
import { registerPhase2Engines } from "./engines-phase2";
import { registerStructuralEngines } from "./engines-structural";

let activated = false;

export function registerAllEngines(): void {
  if (activated) return;
  registerExpandedEngines();
  registerPhase2Engines();
  registerStructuralEngines();
  activated = true;
}
