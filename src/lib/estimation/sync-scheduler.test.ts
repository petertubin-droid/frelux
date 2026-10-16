/**
 * Sync scheduler tests (Engine #11)
 *
 * Backoff progression and cap, deterministic seeded jitter inside
 * bounds, and every auto-sync refusal states its honest reason.
 */

import { describe, it, expect } from "vitest";
import {
  BACKOFF_BASE_MS,
  BACKOFF_CAP_MS,
  backoffDelayMs,
  describeNextAttempt,
  nextAttemptDelayMs,
  shouldAutoSync,
} from "./sync-scheduler";

const NOW = new Date("2026-10-16T10:00:00Z");

describe("backoffDelayMs", () => {
  it("no delay when nothing failed", () => {
    expect(backoffDelayMs(0)).toBe(0);
  });

  it("progresses 1 min, 2, 4, 8, 16, then caps at 30 min", () => {
    expect(backoffDelayMs(1)).toBe(60_000);
    expect(backoffDelayMs(2)).toBe(120_000);
    expect(backoffDelayMs(3)).toBe(240_000);
    expect(backoffDelayMs(4)).toBe(480_000);
    expect(backoffDelayMs(5)).toBe(960_000);
    expect(backoffDelayMs(6)).toBe(BACKOFF_CAP_MS);
    expect(backoffDelayMs(50)).toBe(BACKOFF_CAP_MS);
  });
});

describe("nextAttemptDelayMs (jittered, deterministic)", () => {
  it("same seed and failures give the same delay", () => {
    expect(nextAttemptDelayMs(3, "capture-1")).toBe(
      nextAttemptDelayMs(3, "capture-1"),
    );
  });

  it("jitter stays inside ±20% of the base delay", () => {
    const base = backoffDelayMs(3);
    for (const seed of ["a", "b", "seed-123", "queue-front", "zzz9"]) {
      const d = nextAttemptDelayMs(3, seed);
      expect(d).toBeGreaterThanOrEqual(base * 0.8);
      expect(d).toBeLessThanOrEqual(base * 1.2);
    }
  });

  it("never drops below half the base or exceeds the cap", () => {
    expect(nextAttemptDelayMs(20, "edge-seed")).toBeLessThanOrEqual(BACKOFF_CAP_MS);
    expect(nextAttemptDelayMs(1, "edge-seed")).toBeGreaterThanOrEqual(
      BACKOFF_BASE_MS / 2,
    );
  });

  it("failure count 0 needs no wait", () => {
    expect(nextAttemptDelayMs(0, "seed")).toBe(0);
  });
});

describe("describeNextAttempt (honest UI copy)", () => {
  it("no failures: connectivity-return copy", () => {
    expect(describeNextAttempt(0, "seed")).toContain("connectivity returns");
  });

  it("failures: states the wait and the failure count", () => {
    const text = describeNextAttempt(2, "seed");
    expect(text).toContain("minute");
    expect(text).toContain("2 failed attempts");
  });

  it("singular attempt wording", () => {
    expect(describeNextAttempt(1, "seed")).toContain("1 failed attempt");
  });
});

describe("shouldAutoSync", () => {
  const base = {
    autoSync: true,
    online: true,
    queueCount: 3,
    history: { consecutiveFailures: 0, lastAttemptAt: null },
    seed: "capture-1",
    now: NOW,
  };

  it("runs when connectivity is back and there is work", () => {
    const d = shouldAutoSync(base);
    expect(d.shouldSync).toBe(true);
    expect(d.reason).toContain("queue has work");
  });

  it("refuses when the admin disabled auto-sync, saying so", () => {
    const d = shouldAutoSync({ ...base, autoSync: false });
    expect(d.shouldSync).toBe(false);
    expect(d.reason).toContain("disabled");
  });

  it("refuses offline and says captures stay on the device", () => {
    const d = shouldAutoSync({ ...base, online: false });
    expect(d.shouldSync).toBe(false);
    expect(d.reason).toContain("offline");
  });

  it("refuses when the queue is empty", () => {
    const d = shouldAutoSync({ ...base, queueCount: 0 });
    expect(d.shouldSync).toBe(false);
    expect(d.reason).toContain("Nothing to sync");
  });

  it("refuses inside the backoff window and says how long is left", () => {
    const d = shouldAutoSync({
      ...base,
      history: {
        consecutiveFailures: 2,
        lastAttemptAt: new Date("2026-10-16T09:59:00Z").toISOString(),
      },
    });
    expect(d.shouldSync).toBe(false);
    expect(d.reason).toContain("backoff");
  });

  it("runs again once the backoff window has elapsed", () => {
    const d = shouldAutoSync({
      ...base,
      history: {
        consecutiveFailures: 2,
        lastAttemptAt: new Date("2026-10-16T09:40:00Z").toISOString(),
      },
    });
    expect(d.shouldSync).toBe(true);
    expect(d.reason).toContain("retrying");
  });

  it("runs immediately after a first failure (1-minute backoff elapsed)", () => {
    const d = shouldAutoSync({
      ...base,
      history: {
        consecutiveFailures: 1,
        lastAttemptAt: new Date("2026-10-16T09:58:00Z").toISOString(),
      },
    });
    expect(d.shouldSync).toBe(true);
  });

  it("an unreadable last-attempt timestamp is treated as try-now, honestly", () => {
    const d = shouldAutoSync({
      ...base,
      history: { consecutiveFailures: 1, lastAttemptAt: "garbage" },
    });
    expect(d.shouldSync).toBe(true);
    expect(d.reason).toContain("unreadable");
  });
});
