import { describe, expect, it, vi } from "vitest";
import type { CalibrationFeedback } from "../adaptive-calibration";
import {
  CALIBRATION_FEEDBACK_KEY,
  CALIBRATION_LEGACY_KEY,
  deleteCalibrationFeedback,
  getCalibrationAudit,
  getCalibrationFeedback,
  pruneCalibrationRows,
  saveCalibrationFeedback,
  subscribeCalibrationFeedback,
  updateCalibrationFeedback,
} from "../calibration-storage";

interface FakeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  store: Map<string, string>;
}

function makeStorage(seed?: Record<string, string>): FakeStorage {
  const store = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

let sequence = 0;

const row = (over: Partial<CalibrationFeedback> = {}): CalibrationFeedback => ({
  id: `s${(sequence += 1)}`,
  projectId: "p1",
  marketCode: "NG",
  materialKey: "block",
  measure: "material",
  estimatedQuantity: 100,
  actualQuantity: 110,
  unit: "piece",
  evidence: "self_attested",
  recordedAt: new Date(2026, 10, 1, 0, 0, sequence % 60).toISOString(),
  context: "takeoff",
  status: "pending_review",
  source: "device",
  ...over,
});

const reviewed = (over: Partial<CalibrationFeedback> = {}) =>
  row({
    status: "accepted",
    evidence: "self_attested",
    reviewerId: "owner-1",
    reviewerRole: "owner",
    reviewedAt: "2026-11-02T00:00:00.000Z",
    ...over,
  });

describe("calibration storage", () => {
  it("drops unreadable rows instead of throwing at a reader", () => {
    const storage = makeStorage({
      [CALIBRATION_FEEDBACK_KEY]: JSON.stringify({
        schema: 2,
        revision: 3,
        rows: [row({ id: "keep" }), {}, null, "junk", { id: "no-market" }],
        audit: [],
      }),
    });
    const rows = getCalibrationFeedback(storage);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("keep");
    expect(() =>
      getCalibrationFeedback(makeStorage({ [CALIBRATION_FEEDBACK_KEY]: "{" })),
    ).not.toThrow();
  });

  it("reads the old device key once so nothing recorded is lost", () => {
    const storage = makeStorage({
      [CALIBRATION_LEGACY_KEY]: JSON.stringify([row({ id: "legacy" })]),
    });
    expect(getCalibrationFeedback(storage).map((entry) => entry.id)).toEqual([
      "legacy",
    ]);
  });

  it("keeps accepted evidence when the cap is reached", () => {
    const rejected = Array.from({ length: 400 }, () =>
      row({ status: "rejected" }),
    );
    const pending = Array.from({ length: 100 }, () => row());
    const accepted = Array.from({ length: 5 }, () => reviewed());
    const { rows, pruned } = pruneCalibrationRows([
      ...rejected,
      ...pending,
      ...accepted,
    ]);
    expect(pruned).toBe(5);
    expect(rows).toHaveLength(500);
    for (const kept of accepted) {
      expect(rows.some((entry) => entry.id === kept.id)).toBe(true);
    }
  });

  it("refuses a second record with the same id", () => {
    const storage = makeStorage();
    const first = saveCalibrationFeedback(row({ id: "dup" }), storage);
    const second = saveCalibrationFeedback(row({ id: "dup" }), storage);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("duplicate");
  });

  it("will not rewrite a reviewed record without reopening it", () => {
    const storage = makeStorage();
    const saved = row({ id: "edit" });
    saveCalibrationFeedback(saved, storage);
    expect(
      updateCalibrationFeedback(
        "edit",
        {
          status: "accepted",
          reviewerId: "owner-1",
          reviewerRole: "owner",
          reviewedAt: "2026-11-02T00:00:00.000Z",
          evidence: "self_attested",
        },
        { storage },
      ).ok,
    ).toBe(true);
    const blocked = updateCalibrationFeedback(
      "edit",
      { actualQuantity: 140 },
      { storage },
    );
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toBe("requires_reopen");
    expect(
      getCalibrationFeedback(storage).find((entry) => entry.id === "edit")
        ?.actualQuantity,
    ).toBe(110);

    const reopened = updateCalibrationFeedback(
      "edit",
      { actualQuantity: 140 },
      { storage, allowReopen: true },
    );
    expect(reopened.ok).toBe(true);
    const after = getCalibrationFeedback(storage).find(
      (entry) => entry.id === "edit",
    );
    expect(after?.status).toBe("pending_review");
    expect(after?.reviewerId).toBeUndefined();
    expect(after?.reviewedAt).toBeUndefined();
    expect(after?.evidence).toBe("self_attested");
  });

  it("never lets an owner stamp a record as administrator verified", () => {
    const storage = makeStorage();
    saveCalibrationFeedback(row({ id: "claim" }), storage);
    updateCalibrationFeedback(
      "claim",
      {
        status: "accepted",
        evidence: "admin_verified",
        reviewerId: "owner-1",
        reviewerRole: "owner",
        reviewedAt: "2026-11-02T00:00:00.000Z",
        evidenceReference: "self written",
      },
      { storage },
    );
    const stored = getCalibrationFeedback(storage).find(
      (entry) => entry.id === "claim",
    );
    expect(stored?.evidence).toBe("self_attested");
  });

  it("refuses to change a record's identity", () => {
    const storage = makeStorage();
    saveCalibrationFeedback(row({ id: "fixed" }), storage);
    const result = updateCalibrationFeedback(
      "fixed",
      { projectId: "other" },
      { storage },
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("immutable_field");
  });

  it("recovers a write that another tab overwrote", () => {
    const storage = makeStorage();
    const external = row({ id: "from-other-tab" });
    let raced = false;
    const original = storage.setItem;
    storage.setItem = (key, value) => {
      if (!raced) {
        raced = true;
        // The other tab lands first; our payload never reaches storage.
        original(
          key,
          JSON.stringify({
            schema: 2,
            revision: 9,
            rows: [external],
            audit: [],
          }),
        );
        return;
      }
      original(key, value);
    };
    const result = saveCalibrationFeedback(row({ id: "ours" }), storage);
    expect(result.ok).toBe(true);
    const ids = getCalibrationFeedback(storage).map((entry) => entry.id);
    expect(ids).toContain("ours");
    expect(ids).toContain("from-other-tab");
  });

  it("deletes a record and records the deletion", () => {
    const storage = makeStorage();
    saveCalibrationFeedback(row({ id: "gone" }), storage);
    expect(deleteCalibrationFeedback("gone", "owner-1", storage).ok).toBe(true);
    expect(getCalibrationFeedback(storage)).toHaveLength(0);
    expect(
      getCalibrationAudit(storage).some(
        (event) =>
          event.entityKey === "gone" && event.action === "record_deleted",
      ),
    ).toBe(true);
  });

  it("announces a write to listeners in this tab and other tabs", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCalibrationFeedback(listener);
    saveCalibrationFeedback(row({ id: "signal" }));
    expect(listener).toHaveBeenCalled();
    window.dispatchEvent(
      new StorageEvent("storage", { key: CALIBRATION_FEEDBACK_KEY }),
    );
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    window.localStorage.removeItem(CALIBRATION_FEEDBACK_KEY);
  });
});
