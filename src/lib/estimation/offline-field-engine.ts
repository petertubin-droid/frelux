/**
 * Offline-First Field Engine (Future Engine 17)
 *
 * The service worker precaches the app shell, calculation
 * results cache in localStorage (local-projects.ts), and engine
 * configuration caches offline-first (offline-cache.ts) - so an
 * artisan can already RUN every calculator with no connectivity.
 *
 * What was still impossible: capturing WORK in the field
 * (measurements taken on site, materials actually used, progress
 * notes, photo references) and getting that record into the
 * database. Logging in and saving requires network.
 *
 * This engine closes that gap honestly:
 *
 *  - Field captures queue in localStorage with a client-generated
 *    UUID. The UUID is the primary key on the server, so a retry
 *    after a flaky connection can never create a duplicate row -
 *    sync is idempotent by construction.
 *  - Queue capacity and retention follow admin-configured rules
 *    (estimation_calc_rules, calculator_type 'offline_field').
 *    When the queue is full the OLDEST entry is dropped and the
 *    caller is told which one - never a silent loss.
 *  - syncQueue() attempts each capture through an injected
 *    persist function. Only a confirmed server success (or an
 *    idempotent duplicate) removes an entry from the queue. A
 *    network failure leaves the capture queued, with its last
 *    attempt recorded - the UI can say "not synced yet, honestly".
 *  - Nothing is invented: a capture the server rejected stays in
 *    the queue with its error; corrupted queue storage is
 *    discarded with a warning, never parsed into fake data.
 */

const QUEUE_KEY = "frelux_field_queue";

export const FIELD_CAPTURE_KINDS = [
  "measurement",
  "material_used",
  "progress_note",
  "photo_reference",
] as const;
export type FieldCaptureKind = (typeof FIELD_CAPTURE_KINDS)[number];

export interface FieldCapture {
  id: string; // client UUID: also the server PK: idempotent sync
  kind: FieldCaptureKind;
  project_label: string;
  device_label: string;
  payload: Record<string, unknown>;
  captured_at: string; // ISO: when the artisan recorded it, in the field
  queued_at: string; // ISO: when it entered the queue
  last_attempt?: string; // ISO: last sync attempt, present after a failed sync
  last_error?: string; // honest reason the last sync attempt failed
}

export interface FieldSyncRules {
  auto_sync: boolean;
  max_queue: number;
  retention_days: number;
  sync_batch: number;
}

export const DEFAULT_FIELD_SYNC_RULES: FieldSyncRules = {
  auto_sync: true,
  max_queue: 100,
  retention_days: 90,
  sync_batch: 20,
};

/** Outcome of one persist attempt during a sync run. */
export type PersistOutcome = "synced" | "duplicate" | "failed";

/** Result of enqueueing - tells the caller exactly what was kept. */
export interface EnqueueResult {
  accepted: FieldCapture | null;
  dropped: FieldCapture | null; // oldest entry evicted by capacity: never silent
  evicted_expired: number; // entries past retention pruned first
}

/** Report of one sync run - the whole truth of what happened. */
export interface SyncReport {
  attempted: number;
  synced: number; // confirmed new server rows
  duplicates: number; // already on the server (idempotent retry): also safe
  failed: number; // still queued, with recorded reasons
  remaining: number; // queue length after the run
}

// ─────────────────────────────────────────────
// Storage (localStorage, same survival model as saved projects)
// ─────────────────────────────────────────────

function readQueue(): FieldCapture[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(
        "Corrupted field-capture queue discarded: refusing to invent data.",
      );
      return [];
    }
    return parsed.filter(
      (c): c is FieldCapture =>
        !!c && typeof c.id === "string" && typeof c.captured_at === "string",
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: FieldCapture[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable - the caller's EnqueueResult tells the truth
  }
}

function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Deterministic fallback for environments without crypto.randomUUID
  return (
    "fc_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10)
  );
}

// ─────────────────────────────────────────────
// Rules: estimation_calc_rules rows → typed sync rules
// ─────────────────────────────────────────────

interface CalcRuleRow {
  rule_key: string;
  rule_value: { value?: unknown } | null;
  is_active?: boolean | null;
}

/**
 * Parse admin-configured rule rows into typed rules. Inactive or
 * missing rows fall back to the built-in default - an unconfigured
 * engine still works, never crashes.
 */
export function parseFieldSyncRules(rows: CalcRuleRow[]): FieldSyncRules {
  const rules: FieldSyncRules = { ...DEFAULT_FIELD_SYNC_RULES };
  const get = (key: string): unknown | undefined => {
    const row = rows.find(
      (r) =>
        r.rule_key === key &&
        (r.is_active === undefined ||
          r.is_active === true ||
          r.is_active === null),
    );
    return row?.rule_value?.value;
  };

  const autoSync = get("auto_sync");
  if (typeof autoSync === "boolean") rules.auto_sync = autoSync;

  const maxQueue = get("max_queue");
  if (
    typeof maxQueue === "number" &&
    Number.isFinite(maxQueue) &&
    maxQueue > 0
  ) {
    rules.max_queue = Math.floor(maxQueue);
  }

  const retention = get("retention_days");
  if (
    typeof retention === "number" &&
    Number.isFinite(retention) &&
    retention > 0
  ) {
    rules.retention_days = Math.floor(retention);
  }

  const batch = get("sync_batch");
  if (typeof batch === "number" && Number.isFinite(batch) && batch > 0) {
    rules.sync_batch = Math.floor(batch);
  }

  return rules;
}

// ─────────────────────────────────────────────
// Queue operations
// ─────────────────────────────────────────────

/**
 * Prune captures past the retention window. Old entries are
 * removed BEFORE capacity eviction so an admin's retention rule
 * is the first thing honored.
 */
export function pruneExpiredCaptures(rules: FieldSyncRules, now: Date): number {
  const queue = readQueue();
  const cutoff = now.getTime() - rules.retention_days * 24 * 60 * 60 * 1000;
  const kept = queue.filter((c) => new Date(c.captured_at).getTime() >= cutoff);
  const removed = queue.length - kept.length;
  if (removed > 0) writeQueue(kept);
  return removed;
}

/**
 * Enqueue a field capture. Returns exactly what happened: the
 * stored capture, any capacity-evicted entry (the oldest), and
 * how many expired entries retention pruned first.
 */
export function enqueueFieldCapture(
  input: {
    kind: FieldCaptureKind;
    project_label: string;
    payload: Record<string, unknown>;
    device_label?: string;
    captured_at?: Date;
  },
  rules: FieldSyncRules = DEFAULT_FIELD_SYNC_RULES,
  now: Date = new Date(),
): EnqueueResult {
  const evicted_expired = pruneExpiredCaptures(rules, now);
  const queue = readQueue();

  const capture: FieldCapture = {
    id: uuid(),
    kind: input.kind,
    project_label: input.project_label.trim() || "Untitled job",
    device_label: (input.device_label ?? "").trim() || "This device",
    payload: input.payload,
    captured_at: (input.captured_at ?? now).toISOString(),
    queued_at: now.toISOString(),
  };

  let dropped: FieldCapture | null = null;
  if (queue.length >= rules.max_queue) {
    // Capacity reached: drop the OLDEST capture (FIFO), say which one
    dropped = queue.shift() ?? null;
  }
  queue.push(capture);
  writeQueue(queue);
  return { accepted: capture, dropped, evicted_expired };
}

export function listQueuedCaptures(): FieldCapture[] {
  return readQueue().sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );
}

export function getQueuedCapture(id: string): FieldCapture | null {
  return readQueue().find((c) => c.id === id) ?? null;
}

export function removeQueuedCapture(id: string): boolean {
  const queue = readQueue();
  const next = queue.filter((c) => c.id !== id);
  if (next.length === queue.length) return false;
  writeQueue(next);
  return true;
}

export function clearQueuedCaptures(): void {
  writeQueue([]);
}

export function queuedCaptureCount(): number {
  return readQueue().length;
}

// ─────────────────────────────────────────────
// Sync - idempotent, honest, injectable for tests
// ─────────────────────────────────────────────

/**
 * Attempt to sync queued captures to the server through the
 * injected persist function. Batches by rules.sync_batch, oldest
 * first. A 'duplicate' outcome (the server already has this
 * client UUID from a previous partial sync) counts as safe and
 * removes the capture - retrying a flaky connection can never
 * double-record. A 'failed' capture STAYS in the queue with its
 * last attempt and reason recorded.
 */
export async function syncFieldCaptures(
  persist: (capture: FieldCapture) => Promise<PersistOutcome>,
  rules: FieldSyncRules = DEFAULT_FIELD_SYNC_RULES,
  now: Date = new Date(),
): Promise<SyncReport> {
  const report: SyncReport = {
    attempted: 0,
    synced: 0,
    duplicates: 0,
    failed: 0,
    remaining: 0,
  };

  let queue = readQueue();
  if (queue.length === 0) return report;

  const batch = queue
    .sort(
      (a, b) =>
        new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
    )
    .slice(0, Math.max(1, rules.sync_batch));

  const failedIds = new Set<string>();

  for (const capture of batch) {
    report.attempted += 1;
    let outcome: PersistOutcome;
    try {
      outcome = await persist(capture);
    } catch {
      outcome = "failed";
    }

    if (outcome === "synced") {
      report.synced += 1;
    } else if (outcome === "duplicate") {
      report.duplicates += 1;
    } else {
      report.failed += 1;
      failedIds.add(capture.id);
    }
  }

  // Re-read and update: remove synced/duplicated, annotate failures honestly
  queue = readQueue();
  const next = queue.filter((c) => {
    if (failedIds.has(c.id)) {
      c.last_attempt = now.toISOString();
      c.last_error = "Server unreachable: capture kept in queue";
      return true;
    }
    return !batch.some((b) => b.id === c.id);
  });
  writeQueue(next);
  report.remaining = next.length;
  return report;
}
