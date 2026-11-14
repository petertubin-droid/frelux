/**
 * Device-local calibration evidence.
 *
 * This is the offline store, not the system of record: signed-in users write to
 * the `estimation_actuals` table through the repository. It exists so a
 * technician on site with no connection can still record what was used, and so
 * the panel works before a session is established.
 *
 * Three invariants it enforces:
 *  - A stored row can never crash a reader. Unreadable rows are dropped, not
 *    cast, because one hand-edited record should not blank a page.
 *  - The size cap never silently discards accepted evidence.
 *  - A reviewed record cannot be rewritten under its review stamp.
 */

import {
  createAuditEvent,
  sanitiseCalibrationFeedback,
  type AuditEvent,
  type CalibrationFeedback,
} from "./adaptive-calibration";

export const CALIBRATION_FEEDBACK_KEY = "frelux_calibration_feedback_v2";
export const CALIBRATION_LEGACY_KEY = "frelux_calibration_feedback_v1";
export const CALIBRATION_AUDIT_KEY = "frelux_calibration_audit_v1";
export const CALIBRATION_EVENT = "frelux:calibration-changed";
export const MAX_FEEDBACK_ROWS = 500;
export const MAX_AUDIT_EVENTS = 200;

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

export type CalibrationWriteFailure =
  | "duplicate"
  | "invalid"
  | "storage_unavailable"
  | "quota_exceeded"
  | "not_found"
  | "requires_reopen"
  | "immutable_field";

export interface CalibrationWriteResult {
  ok: boolean;
  reason?: CalibrationWriteFailure;
  /** Rows dropped to stay inside the cap. Rejected and pending only. */
  pruned: number;
}

interface Envelope {
  schema: 2;
  revision: number;
  rows: unknown[];
  audit: unknown[];
}

function defaultStorage(): MinimalStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readEnvelope(store: MinimalStorage | null): Envelope {
  const empty: Envelope = { schema: 2, revision: 0, rows: [], audit: [] };
  if (!store) return empty;
  const parse = (key: string): unknown => {
    try {
      const raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const current = parse(CALIBRATION_FEEDBACK_KEY);
  if (current && typeof current === "object" && !Array.isArray(current)) {
    const envelope = current as Partial<Envelope>;
    return {
      schema: 2,
      revision: typeof envelope.revision === "number" ? envelope.revision : 0,
      rows: Array.isArray(envelope.rows) ? envelope.rows : [],
      audit: Array.isArray(envelope.audit) ? envelope.audit : [],
    };
  }
  if (Array.isArray(current)) {
    return { ...empty, rows: current };
  }
  // First run after the v1 key: read it once so nothing recorded is lost.
  const legacy = parse(CALIBRATION_LEGACY_KEY);
  return { ...empty, rows: Array.isArray(legacy) ? legacy : [] };
}

function sanitiseAll(rows: unknown[]): CalibrationFeedback[] {
  const seen = new Set<string>();
  const clean: CalibrationFeedback[] = [];
  for (const raw of rows) {
    const row = sanitiseCalibrationFeedback(raw);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    clean.push(row);
  }
  return clean;
}

function sanitiseAudit(entries: unknown[]): AuditEvent[] {
  const clean: AuditEvent[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const event = raw as Partial<AuditEvent>;
    if (!event.id || !event.action || !event.entityKey) continue;
    clean.push(event as AuditEvent);
  }
  return clean;
}

/** Every readable record, newest first. Never throws, never returns garbage. */
export function getCalibrationFeedback(
  storage?: MinimalStorage,
): CalibrationFeedback[] {
  const rows = sanitiseAll(readEnvelope(storage ?? defaultStorage()).rows);
  return rows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function getCalibrationAudit(storage?: MinimalStorage): AuditEvent[] {
  return sanitiseAudit(readEnvelope(storage ?? defaultStorage()).audit);
}

/**
 * The cap protects the quota, not the evidence. Rejected rows go first, then
 * pending ones, oldest first. An accepted row is only ever dropped when nothing
 * else remains, and that is reported rather than hidden.
 */
export function pruneCalibrationRows(
  rows: CalibrationFeedback[],
  limit = MAX_FEEDBACK_ROWS,
): { rows: CalibrationFeedback[]; pruned: number } {
  if (rows.length <= limit) return { rows, pruned: 0 };
  const kept = [...rows];
  const oldestFirst = [...kept].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
  const drop = (status: CalibrationFeedback["status"]) => {
    for (const row of oldestFirst) {
      if (kept.length <= limit) return;
      const index = kept.findIndex((candidate) => candidate.id === row.id);
      if (index >= 0 && kept[index].status === status) kept.splice(index, 1);
    }
  };
  drop("rejected");
  drop("pending_review");
  return { rows: kept, pruned: rows.length - kept.length };
}

interface MutationPlan {
  rows?: CalibrationFeedback[];
  audit?: AuditEvent[];
  limit?: number;
  failure?: CalibrationWriteFailure;
}

function mutate(
  storage: MinimalStorage | null,
  mutator: (envelope: Envelope) => MutationPlan,
): CalibrationWriteResult {
  if (!storage) return { ok: false, reason: "storage_unavailable", pruned: 0 };
  let pruned = 0;
  // Compare and retry: two tabs can otherwise overwrite each other's rows, and
  // a read-modify-write with no verification loses evidence silently.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const envelope = readEnvelope(storage);
    const next = mutator(envelope);
    if (next.failure) {
      return { ok: false, reason: next.failure, pruned: 0 };
    }
    const constrained = pruneCalibrationRows(
      next.rows ?? sanitiseAll(envelope.rows),
      next.limit ?? MAX_FEEDBACK_ROWS,
    );
    pruned = constrained.pruned;
    const audit = (next.audit ?? sanitiseAudit(envelope.audit)).slice(
      0,
      MAX_AUDIT_EVENTS,
    );
    const revision = envelope.revision + 1;
    const payload = JSON.stringify({
      schema: 2,
      revision,
      rows: constrained.rows,
      audit,
    } satisfies Envelope);
    try {
      storage.setItem(CALIBRATION_FEEDBACK_KEY, payload);
    } catch {
      return { ok: false, reason: "quota_exceeded", pruned: 0 };
    }
    // Byte comparison, not a revision check: if another tab replaced the value
    // our write is gone, and reading back our own revision would look identical
    // while the row was silently lost.
    if (storage.getItem(CALIBRATION_FEEDBACK_KEY) === payload) {
      return { ok: true, pruned };
    }
  }
  return { ok: false, reason: "storage_unavailable", pruned };
}

function announce(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CALIBRATION_EVENT));
}

export function saveCalibrationFeedback(
  feedback: CalibrationFeedback,
  storage?: MinimalStorage,
): CalibrationWriteResult {
  const row = sanitiseCalibrationFeedback(feedback);
  if (!row) return { ok: false, reason: "invalid", pruned: 0 };
  const outcome = mutate(storage ?? defaultStorage(), (envelope) => {
    const rows = sanitiseAll(envelope.rows);
    if (rows.some((existing) => existing.id === row.id)) {
      return { failure: "duplicate" };
    }
    return {
      rows: [row, ...rows],
      audit: [
        createAuditEvent({
          entityType: "calibration_candidate",
          entityKey: row.id,
          action: "proposed",
          actorId: row.reviewerId ?? "device",
          reason: `Recorded ${row.materialKey} actuals for ${row.marketCode}`,
          after: row,
        }),
        ...sanitiseAudit(envelope.audit),
      ],
    };
  });
  if (outcome.ok) announce();
  return outcome;
}

const IMMUTABLE_FIELDS = ["id", "projectId", "recordedAt", "source"] as const;
const EVIDENCE_FIELDS = [
  "estimatedQuantity",
  "actualQuantity",
  "unit",
  "materialKey",
  "marketCode",
  "measure",
  "context",
] as const;

/**
 * Updates a record. Identity fields never change. Editing the quantities, unit
 * or material of an accepted record clears its review and sends it back to
 * pending, unless the caller explicitly reopens it.
 */
export function updateCalibrationFeedback(
  id: string,
  update: Partial<CalibrationFeedback>,
  options: { storage?: MinimalStorage; allowReopen?: boolean } = {},
): CalibrationWriteResult {
  if (IMMUTABLE_FIELDS.some((field) => field in update)) {
    return { ok: false, reason: "immutable_field", pruned: 0 };
  }
  const outcome = mutate(options.storage ?? defaultStorage(), (envelope) => {
    const rows = sanitiseAll(envelope.rows);
    const index = rows.findIndex((row) => row.id === id);
    const current = index >= 0 ? rows[index] : null;
    if (!current) {
      return { failure: "not_found" };
    }
    const touchesEvidence = EVIDENCE_FIELDS.some(
      (field) => field in update && update[field] !== current[field],
    );
    if (current.status === "accepted" && touchesEvidence) {
      if (!options.allowReopen) {
        return { failure: "requires_reopen" };
      }
      update = {
        ...update,
        status: "pending_review",
        evidence: "self_attested",
        reviewerId: undefined,
        reviewerRole: undefined,
        reviewedAt: undefined,
      };
    }
    const merged = sanitiseCalibrationFeedback({ ...current, ...update });
    if (!merged) {
      return { failure: "invalid" };
    }
    // An administrator's verification is the only source of admin_verified.
    if (
      merged.evidence === "admin_verified" &&
      merged.reviewerRole !== "admin"
    ) {
      merged.evidence = "self_attested";
    }
    const next = [...rows];
    next[index] = merged;
    const action =
      merged.status === "accepted"
        ? "approved"
        : merged.status === "rejected"
          ? "rejected"
          : "proposed";
    return {
      rows: next,
      audit: [
        createAuditEvent({
          entityType: "calibration_candidate",
          entityKey: id,
          action,
          actorId: merged.reviewerId ?? "device",
          reason:
            action === "proposed" ? "Review reopened after an edit" : action,
          before: current,
          after: merged,
        }),
        ...sanitiseAudit(envelope.audit),
      ],
    };
  });
  if (outcome.ok) announce();
  return outcome;
}

export function deleteCalibrationFeedback(
  id: string,
  actorId = "device",
  storage?: MinimalStorage,
): CalibrationWriteResult {
  const outcome = mutate(storage ?? defaultStorage(), (envelope) => {
    const rows = sanitiseAll(envelope.rows);
    const target = rows.find((row) => row.id === id);
    if (!target) {
      return { failure: "not_found" };
    }
    return {
      rows: rows.filter((row) => row.id !== id),
      audit: [
        createAuditEvent({
          entityType: "calibration_candidate",
          entityKey: id,
          action: "record_deleted",
          actorId,
          reason: "Actuals record removed",
          before: target,
        }),
        ...sanitiseAudit(envelope.audit),
      ],
    };
  });
  if (outcome.ok) announce();
  return outcome;
}

/** Fires on writes from this tab and from any other tab. */
export function subscribeCalibrationFeedback(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (
      event.key &&
      event.key !== CALIBRATION_FEEDBACK_KEY &&
      event.key !== CALIBRATION_LEGACY_KEY
    ) {
      return;
    }
    listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CALIBRATION_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CALIBRATION_EVENT, listener);
  };
}
