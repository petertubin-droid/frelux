/**
 * Shared result scaffolding so every engine adapter returns a valid
 * EngineResult. Previously duplicated (identical bodies) in
 * engines-expanded.ts and engines-structural.ts; both now import from here.
 */
import type { EngineResult } from "./types";

export function engineOk(
  id: string,
  quantities: EngineResult["quantities"],
  costs: EngineResult["costs"],
  raw: unknown,
): EngineResult {
  return {
    ok: true,
    engine: id,
    calculatedAt: new Date().toISOString(),
    quantities,
    costs,
    raw,
  };
}

export function engineFail(id: string, error: string): EngineResult {
  return {
    ok: false,
    engine: id,
    calculatedAt: new Date().toISOString(),
    quantities: [],
    costs: null,
    raw: null,
    error,
  };
}
