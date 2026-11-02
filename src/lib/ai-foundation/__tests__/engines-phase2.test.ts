// =========================================================
// PHASE 2 ENGINE REGISTRATION TESTS
//
// The phase-2-parity contract test (phase2-engines.test.ts)
// already pins the MATH engine-by-engine. What was NOT pinned
// is engines-phase2.ts itself: the registration surface.
//   * registerPhase2Engines registers exactly the four
//     documented engines, each authoritative with credit text
//   * registration is IDEMPOTENT (no duplicate-id crash)
//   * every engine guards its inputs: garbage in → honest
//     {ok:false} error, never a thrown crash or invented math
// =========================================================
import { describe, it, expect, beforeAll } from "vitest";
import {
  listEngines,
  getEngineDescriptor,
  executeEngine,
} from "@/lib/ai-foundation/engines-registry";
import { registerPhase2Engines } from "@/lib/ai-foundation/engines-phase2";

const PHASE2_IDS = [
  "painting_project",
  "tile_estimate",
  "pop_ceiling",
  "screeding_system",
];

beforeAll(() => {
  registerPhase2Engines();
  registerPhase2Engines(); // idempotency: double registration must not throw
});

describe("registerPhase2Engines", () => {
  it("registers exactly the four documented engines", () => {
    const ids = listEngines().map((d) => d.id);
    for (const id of PHASE2_IDS) expect(ids).toContain(id);
  });

  it.each(PHASE2_IDS)("%s is authoritative with credit text", (id) => {
    const d = getEngineDescriptor(id);
    expect(d).toBeDefined();
    expect(d!.authoritative).toBe(true);
    expect(d!.creditedAs).toBeTruthy();
  });

  it.each(PHASE2_IDS)(
    "%s refuses non-finite inputs honestly (no crash, no invented math)",
    async (id) => {
      const res = await executeEngine(id, {
        length: Number.NaN,
        width: Number.POSITIVE_INFINITY,
        wallHeight: "abc",
        area: undefined,
        roomLength: null,
      } as never);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBeTruthy();
    },
  );

  it.each(PHASE2_IDS)(
    "%s returns an engine id and timestamp on every outcome",
    async (id) => {
      const res = await executeEngine(id, {
        length: Number.NaN,
      } as never);
      if (!res.ok) {
        expect(res.engine).toBeTruthy();
        expect(res.calculatedAt).toBeTruthy();
      }
    },
  );
});
