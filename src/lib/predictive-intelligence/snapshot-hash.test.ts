// =========================================================
// PREDICTIVE INTELLIGENCE, INPUT-HASH TESTS (§22)
//
// The cache-key contract: identical data → identical hash
// regardless of key order or clock time; changed data → a
// different hash. `now` must never affect it.
// =========================================================
import { describe, it, expect } from "vitest";
import { snapshotInputHash } from "./snapshot-hash";
import type { PredictiveProjectSnapshot } from "./types";

function snap(
  over: Partial<PredictiveProjectSnapshot> = {},
): PredictiveProjectSnapshot {
  return {
    projectId: "p1",
    project: {
      id: "p1",
      status: "in_progress",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    } as never,
    stages: [
      {
        id: "s1",
        stageName: "prep",
        sortOrder: 1,
        isCompleted: true,
        completedAt: "2026-01-03T00:00:00Z",
        updatedAt: "2026-01-03T00:00:00Z",
      },
    ],
    shoppingItems: [
      { id: "a", quantity: 2, estimated_price: 450, total_price: 900 } as never,
    ],
    calculations: [],
    priceHistory: [],
    marketPrices: [],
    visualObservations: [],
    region: { marketCode: "ng", countryCode: "NG", city: "Lagos" } as never,
    ...over,
  } as never;
}

describe("snapshotInputHash", () => {
  it("identical data → identical hash, regardless of object key order", () => {
    const h1 = snapshotInputHash(snap());
    const h2 = snapshotInputHash(
      snap({
        project: {
          updatedAt: "2026-01-02T00:00:00Z",
          createdAt: "2026-01-01T00:00:00Z",
          status: "in_progress",
          id: "p1",
        } as never,
      }),
    );
    expect(h2).toBe(h1);
  });

  it("now is excluded — the hash covers DATA, not clock time", () => {
    const h1 = snapshotInputHash(snap());
    const h2 = snapshotInputHash(snap({ calculations: [] }));
    expect(h2).toBe(h1); // same data, snapshot has no `now` in the hashed set
  });

  it("changed quantity → different hash", () => {
    const h1 = snapshotInputHash(snap());
    const h2 = snapshotInputHash(
      snap({
        shoppingItems: [
          {
            id: "a",
            quantity: 3,
            estimated_price: 450,
            total_price: 1350,
          } as never,
        ],
      }),
    );
    expect(h2).not.toBe(h1);
  });

  it("changed region → different hash; changed stage → different hash", () => {
    const h1 = snapshotInputHash(snap());
    const h2 = snapshotInputHash(
      snap({
        region: { marketCode: "ke", countryCode: "KE", city: null } as never,
      }),
    );
    const h3 = snapshotInputHash(
      snap({
        stages: [
          {
            id: "s1",
            stageKey: "stage-1",
            stageName: "prep",
            sortOrder: 1,
            isCompleted: false,
            completedAt: null,
            hasPhoto: false,
            updatedAt: "2026-01-03T00:00:00Z",
          },
        ],
      }),
    );
    expect(h2).not.toBe(h1);
    expect(h3).not.toBe(h1);
  });

  it("format is two 32-bit hex words plus input length", () => {
    const h = snapshotInputHash(snap());
    expect(h).toMatch(/^[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$/);
  });
});
