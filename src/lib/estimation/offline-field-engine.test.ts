/**
 * Offline-First Field Engine tests (Future Engine 17)
 *
 * Hand-verified scenarios: field capture queuing, capacity and
 * retention eviction (never silent), idempotent sync (client UUID
 * as server PK), honest failure handling, rule parsing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_FIELD_SYNC_RULES,
  FIELD_CAPTURE_KINDS,
  MAX_DETAIL_CHARS,
  MAX_PHOTOS_PER_CAPTURE,
  MAX_PAYLOAD_BYTES,
  MAX_PHOTO_BYTES,
  enqueueFieldCapture,
  exportQueueDocument,
  listQueuedCaptures,
  parseFieldSyncRules,
  pruneExpiredCaptures,
  queuedCaptureCount,
  removeQueuedCapture,
  syncFieldCaptures,
  validateCapturePayload,
  clearQueuedCaptures,
  getQueuedCapture,
  type FieldSyncRules,
  type PersistOutcome,
} from "./offline-field-engine";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

const rules = (over: Partial<FieldSyncRules> = {}): FieldSyncRules => ({
  ...DEFAULT_FIELD_SYNC_RULES,
  ...over,
});

describe("rules parsing", () => {
  it("falls back to built-in defaults when nothing is configured", () => {
    const parsed = parseFieldSyncRules([]);
    expect(parsed).toEqual(DEFAULT_FIELD_SYNC_RULES);
  });

  it("honors active admin-configured rows and ignores inactive ones", () => {
    const parsed = parseFieldSyncRules([
      { rule_key: "auto_sync", rule_value: { value: false }, is_active: true },
      { rule_key: "max_queue", rule_value: { value: 25 }, is_active: true },
      {
        rule_key: "retention_days",
        rule_value: { value: 30 },
        is_active: true,
      },
      { rule_key: "sync_batch", rule_value: { value: 5 }, is_active: true },
      // inactive row must be ignored: falls back to default
      { rule_key: "max_queue", rule_value: { value: 999 }, is_active: false },
    ]);
    expect(parsed.auto_sync).toBe(false);
    expect(parsed.max_queue).toBe(25);
    expect(parsed.retention_days).toBe(30);
    expect(parsed.sync_batch).toBe(5);
  });

  it("refuses nonsense rule values: invalid falls back to defaults", () => {
    const parsed = parseFieldSyncRules([
      { rule_key: "max_queue", rule_value: { value: -3 }, is_active: true },
      {
        rule_key: "sync_batch",
        rule_value: { value: "lots" },
        is_active: true,
      },
    ]);
    expect(parsed.max_queue).toBe(DEFAULT_FIELD_SYNC_RULES.max_queue);
    expect(parsed.sync_batch).toBe(DEFAULT_FIELD_SYNC_RULES.sync_batch);
  });
});

describe("queue operations", () => {
  it("enqueues a capture with a client UUID and reports it honestly", () => {
    const result = enqueueFieldCapture({
      kind: "measurement",
      project_label: "Ikeja duplex",
      payload: { length: 4.2 },
    });
    expect(result.accepted).not.toBeNull();
    expect(result.dropped).toBeNull();
    expect(result.evicted_expired).toBe(0);
    expect(result.accepted!.id).toMatch(/^[a-z0-9_-]{8,}$/);
    expect(result.accepted!.kind).toBe("measurement");
    expect(queuedCaptureCount()).toBe(1);
  });

  it("normalizes empty labels instead of storing blank data", () => {
    const result = enqueueFieldCapture({
      kind: "progress_note",
      project_label: "   ",
      payload: { note: "primed wall 2" },
    });
    expect(result.accepted!.project_label).toBe("Untitled job");
    expect(result.accepted!.device_label).toBe("This device");
  });

  it("accepts all four field capture kinds", () => {
    for (const kind of FIELD_CAPTURE_KINDS) {
      enqueueFieldCapture({ kind, project_label: "job", payload: {} });
    }
    expect(queuedCaptureCount()).toBe(4);
    const kinds = listQueuedCaptures()
      .map((c) => c.kind)
      .sort();
    expect(kinds).toEqual([...FIELD_CAPTURE_KINDS].sort());
  });

  it("lists captures oldest-first: sync order is field order", () => {
    const t0 = new Date("2026-10-01T08:00:00Z");
    enqueueFieldCapture(
      { kind: "progress_note", project_label: "third", payload: {} },
      rules(),
      new Date(t0.getTime() + 2 * 3600_000),
    );
    enqueueFieldCapture(
      { kind: "progress_note", project_label: "first", payload: {} },
      rules(),
      t0,
    );
    enqueueFieldCapture(
      { kind: "progress_note", project_label: "second", payload: {} },
      rules(),
      new Date(t0.getTime() + 3600_000),
    );
    const labels = listQueuedCaptures().map((c) => c.project_label);
    expect(labels).toEqual(["first", "second", "third"]);
  });

  it("removes exactly the requested capture and reports misses", () => {
    const { accepted } = enqueueFieldCapture({
      kind: "material_used",
      project_label: "job",
      payload: {},
    });
    expect(removeQueuedCapture(accepted!.id)).toBe(true);
    expect(removeQueuedCapture(accepted!.id)).toBe(false);
    expect(queuedCaptureCount()).toBe(0);
    expect(getQueuedCapture(accepted!.id)).toBeNull();
  });
});

describe("capacity and retention: eviction is never silent", () => {
  it("drops the OLDEST capture when the queue hits max_queue, and says which", () => {
    const small = rules({ max_queue: 2 });
    const t0 = new Date("2026-10-01T08:00:00Z");
    enqueueFieldCapture(
      { kind: "measurement", project_label: "oldest", payload: {} },
      small,
      t0,
    );
    enqueueFieldCapture(
      { kind: "measurement", project_label: "middle", payload: {} },
      small,
      new Date(t0.getTime() + 1000),
    );
    const third = enqueueFieldCapture(
      { kind: "measurement", project_label: "newest", payload: {} },
      small,
      new Date(t0.getTime() + 2000),
    );
    expect(third.dropped!.project_label).toBe("oldest");
    expect(queuedCaptureCount()).toBe(2);
    const labels = listQueuedCaptures().map((c) => c.project_label);
    expect(labels).toEqual(["middle", "newest"]);
  });

  it("prunes captures past retention_days before capacity is considered", () => {
    const strict = rules({ retention_days: 7 });
    const now = new Date("2026-10-03T07:00:00Z");
    // Plant an ancient capture directly (enqueue would prune it on arrival)
    localStorage.setItem(
      "frelux_field_queue",
      JSON.stringify([
        {
          id: "fc_ancient",
          kind: "progress_note",
          project_label: "ancient",
          device_label: "d",
          payload: {},
          captured_at: "2026-09-01T08:00:00Z",
          queued_at: "2026-09-01T08:00:00Z",
        },
        {
          id: "fc_recent",
          kind: "progress_note",
          project_label: "recent",
          device_label: "d",
          payload: {},
          captured_at: now.toISOString(),
          queued_at: now.toISOString(),
        },
      ]),
    );
    const removed = pruneExpiredCaptures(strict, now);
    expect(removed).toBe(1);
    expect(listQueuedCaptures().map((c) => c.project_label)).toEqual([
      "recent",
    ]);
    // And a fresh enqueue into the pruned queue reports zero extra eviction
    const added = enqueueFieldCapture(
      { kind: "progress_note", project_label: "new", payload: {} },
      strict,
      now,
    );
    expect(added.evicted_expired).toBe(0);
  });

  it("a fresh queue reports zero pruned: no phantom eviction", () => {
    const now = new Date();
    expect(pruneExpiredCaptures(rules(), now)).toBe(0);
  });
});

describe("sync: idempotent, honest, batched", () => {
  it("removes confirmed-synced captures and reports them", async () => {
    enqueueFieldCapture({
      kind: "measurement",
      project_label: "a",
      payload: {},
    });
    enqueueFieldCapture({
      kind: "material_used",
      project_label: "b",
      payload: {},
    });
    const report = await syncFieldCaptures(async () => "synced");
    expect(report).toEqual({
      attempted: 2,
      synced: 2,
      duplicates: 0,
      failed: 0,
      remaining: 0,
    });
    expect(queuedCaptureCount()).toBe(0);
  });

  it("treats a duplicate (server already has the UUID) as safe: partial-retry never double-records", async () => {
    enqueueFieldCapture({
      kind: "measurement",
      project_label: "a",
      payload: {},
    });
    const report = await syncFieldCaptures(async () => "duplicate");
    expect(report.duplicates).toBe(1);
    expect(report.synced).toBe(0);
    expect(report.remaining).toBe(0);
    expect(queuedCaptureCount()).toBe(0);
  });

  it("keeps failed captures in the queue with the attempt and reason recorded", async () => {
    const { accepted } = enqueueFieldCapture({
      kind: "progress_note",
      project_label: "a",
      payload: {},
    });
    const now = new Date("2026-10-03T07:30:00Z");
    const report = await syncFieldCaptures(async () => "failed", rules(), now);
    expect(report.failed).toBe(1);
    expect(report.remaining).toBe(1);
    const kept = getQueuedCapture(accepted!.id);
    expect(kept).not.toBeNull();
    expect(kept!.last_attempt).toBe(now.toISOString());
    expect(kept!.last_error).toMatch(/kept in queue/i);
  });

  it("a thrown persist function is a failure, not a crash: the capture survives", async () => {
    enqueueFieldCapture({
      kind: "measurement",
      project_label: "a",
      payload: {},
    });
    const report = await syncFieldCaptures(async () => {
      throw new Error("network down");
    });
    expect(report.failed).toBe(1);
    expect(queuedCaptureCount()).toBe(1);
  });

  it("syncs oldest-first in batches of rules.sync_batch", async () => {
    const small = rules({ sync_batch: 2 });
    const t0 = new Date("2026-10-01T08:00:00Z");
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      enqueueFieldCapture(
        { kind: "measurement", project_label: `job-${i}`, payload: {} },
        small,
        new Date(t0.getTime() + i * 1000),
      );
    }
    const seenOrder: string[] = [];
    const report = await syncFieldCaptures(async (c) => {
      seenOrder.push(c.project_label);
      return "synced" as PersistOutcome;
    }, small);
    expect(report.attempted).toBe(2);
    expect(seenOrder).toEqual(["job-0", "job-1"]);
    expect(report.remaining).toBe(1);
    expect(listQueuedCaptures().map((c) => c.project_label)).toEqual(["job-2"]);
  });

  it("a later sync run picks up what the first one left behind", async () => {
    enqueueFieldCapture({
      kind: "material_used",
      project_label: "a",
      payload: {},
    });
    enqueueFieldCapture({
      kind: "material_used",
      project_label: "b",
      payload: {},
    });
    const seen: string[] = [];
    const failOnce = async (c: {
      project_label: string;
    }): Promise<PersistOutcome> => {
      seen.push(c.project_label);
      return seen.length <= 1 ? "failed" : "synced";
    };
    await syncFieldCaptures(failOnce, rules({ sync_batch: 1 }));
    const report2 = await syncFieldCaptures(failOnce, rules({ sync_batch: 1 }));
    expect(report2.synced).toBe(1);
    // batch size 1: 'b' is still queued for the NEXT run - the report says so
    expect(report2.remaining).toBe(1);
    const report3 = await syncFieldCaptures(
      async () => "synced",
      rules({ sync_batch: 1 }),
    );
    expect(report3.synced).toBe(1);
    expect(queuedCaptureCount()).toBe(0);
  });

  it("an empty queue reports an honest zero-run", async () => {
    const report = await syncFieldCaptures(async () => "synced");
    expect(report).toEqual({
      attempted: 0,
      synced: 0,
      duplicates: 0,
      failed: 0,
      remaining: 0,
    });
  });
});

describe("corrupted storage: nothing is invented", () => {
  it("discards a corrupted queue instead of parsing fake data", () => {
    localStorage.setItem("frelux_field_queue", "{not json at all");
    expect(listQueuedCaptures()).toEqual([]);
    expect(queuedCaptureCount()).toBe(0);
  });

  it("filters out malformed entries and keeps the valid ones", () => {
    localStorage.setItem(
      "frelux_field_queue",
      JSON.stringify([
        { garbage: true },
        {
          id: "fc_valid",
          kind: "measurement",
          project_label: "ok",
          device_label: "d",
          payload: {},
          captured_at: "2026-10-01T08:00:00Z",
          queued_at: "2026-10-01T08:00:00Z",
        },
      ]),
    );
    const captures = listQueuedCaptures();
    expect(captures.length).toBe(1);
    expect(captures[0].id).toBe("fc_valid");
    expect(clearQueuedCaptures()).toBeUndefined();
    expect(queuedCaptureCount()).toBe(0);
  });
});

describe("end-to-end scenario: capture in the field, sync at the hotel", () => {
  it("queues offline work and syncs all of it when the network returns", async () => {
    enqueueFieldCapture({
      kind: "measurement",
      project_label: "Site A",
      payload: { length: 5, width: 4 },
    });
    enqueueFieldCapture({
      kind: "material_used",
      project_label: "Site A",
      payload: { paint_litres: 12 },
    });
    enqueueFieldCapture({
      kind: "progress_note",
      project_label: "Site A",
      payload: { note: "second coat done" },
    });
    const report = await syncFieldCaptures(async () => "synced");
    expect(report.synced).toBe(3);
    expect(report.remaining).toBe(0);
    expect(queuedCaptureCount()).toBe(0);
  });
});

describe("engine #11: device identity on captures", () => {
  it("records the device_id provided at enqueue time", () => {
    const result = enqueueFieldCapture({
      kind: "measurement",
      project_label: "Pergola",
      device_id: "11111111-2222-3333-4444-555555555555",
      payload: { detail: "2.4 m" },
    });
    expect(result.accepted?.device_id).toBe(
      "11111111-2222-3333-4444-555555555555",
    );
  });

  it("leaves device_id unset when none is provided (no invented identity)", () => {
    const result = enqueueFieldCapture({
      kind: "progress_note",
      project_label: "Pergola",
      payload: { detail: "Bricklaying started" },
    });
    expect(result.accepted?.device_id).toBeUndefined();
  });
});

describe("engine #11: payload limits refuse, never truncate", () => {
  it("refuses a detail longer than the text cap with an honest reason", () => {
    const result = validateCapturePayload("measurement", {
      detail: "x".repeat(MAX_DETAIL_CHARS + 1),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(String(MAX_DETAIL_CHARS));
  });

  it("refuses a non-string detail", () => {
    const result = validateCapturePayload("measurement", { detail: 42 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("text");
  });

  it("refuses photos that is not a list", () => {
    const result = validateCapturePayload("photo_reference", {
      photos: "data:image/png;base64,AAAA",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("list");
  });

  it(`refuses more than ${MAX_PHOTOS_PER_CAPTURE} photos`, () => {
    const result = validateCapturePayload("photo_reference", {
      photos: Array.from(
        { length: MAX_PHOTOS_PER_CAPTURE + 1 },
        () => "data:image/png;base64,AAAA",
      ),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(String(MAX_PHOTOS_PER_CAPTURE));
  });

  it("refuses a photo that is not a data URL", () => {
    const result = validateCapturePayload("photo_reference", {
      photos: ["https://example.com/photo.jpg"],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("data URL");
  });

  it("refuses an oversized photo", () => {
    const result = validateCapturePayload("photo_reference", {
      photos: ["data:image/png;base64," + "A".repeat(MAX_PHOTO_BYTES + 1)],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(String(MAX_PHOTO_BYTES));
  });

  it("accepts a valid photo payload", () => {
    const result = validateCapturePayload("photo_reference", {
      detail: "Crack above window",
      photos: ["data:image/jpeg;base64,/9j/4AAQ"],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a photo_reference with only a text description (honest, not refused)", () => {
    const result = validateCapturePayload("photo_reference", {
      detail: "Crack above window, photo taken on the other phone",
    });
    expect(result.ok).toBe(true);
  });

  it("refuses a payload over the total byte cap (UTF-8 bytes, not chars)", () => {
    // multi-byte characters: fewer chars than bytes
    const result = validateCapturePayload("progress_note", {
      detail: "\u00e9".repeat(Math.floor(MAX_PAYLOAD_BYTES / 2) + 1),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("limit");
  });

  it("enqueue throws (never queues) an oversized payload", () => {
    expect(() =>
      enqueueFieldCapture({
        kind: "progress_note",
        project_label: "Pergola",
        payload: { detail: "x".repeat(MAX_DETAIL_CHARS + 1) },
      }),
    ).toThrow();
    expect(queuedCaptureCount()).toBe(0);
  });
});

describe("engine #11: queue backup export (storage-loss recovery)", () => {
  it("exports an honest, parseable document of the unsynced queue", () => {
    enqueueFieldCapture({
      kind: "measurement",
      project_label: "Pergola",
      device_id: "11111111-2222-3333-4444-555555555555",
      payload: { detail: "2.4 m" },
    });
    enqueueFieldCapture({
      kind: "material_used",
      project_label: "Pergola",
      payload: { detail: "2 bags cement" },
    });
    const doc = JSON.parse(exportQueueDocument(new Date("2026-10-16T00:00:00Z")));
    expect(doc.format).toBe("frelux_field_queue_v1");
    expect(doc.exported_at).toBe("2026-10-16T00:00:00.000Z");
    expect(doc.count).toBe(2);
    expect(doc.captures).toHaveLength(2);
    expect(doc.note).toContain("browser");
  });

  it("exporting does not modify the queue", () => {
    enqueueFieldCapture({
      kind: "progress_note",
      project_label: "Pergola",
      payload: { detail: "started" },
    });
    exportQueueDocument();
    expect(queuedCaptureCount()).toBe(1);
  });

  it("an empty queue exports an honest empty document", () => {
    const doc = JSON.parse(exportQueueDocument(new Date("2026-10-16T00:00:00Z")));
    expect(doc.count).toBe(0);
    expect(doc.captures).toEqual([]);
  });
});
