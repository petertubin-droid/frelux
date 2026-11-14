import type {
  CalibrationFeedback,
  CalibrationApproval,
  AuditEvent,
} from './adaptive-calibration';

export const CALIBRATION_FEEDBACK_KEY = 'frelux_calibration_feedback_v1';
export const CALIBRATION_APPROVALS_KEY = 'frelux_calibration_approvals_v1';
export const CALIBRATION_AUDIT_LOG_KEY = 'frelux_calibration_audit_v1';
export const CALIBRATION_STORAGE_KEY = CALIBRATION_FEEDBACK_KEY;
export const CALIBRATION_UPDATED_EVENT = 'frelux:calibration:updated';

export function isValidCalibrationFeedback(item: unknown): item is CalibrationFeedback {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.projectId === 'string' &&
    typeof r.marketCode === 'string' &&
    typeof r.materialKey === 'string' &&
    typeof r.unit === 'string' &&
    typeof r.estimatedQuantity === 'number' &&
    Number.isFinite(r.estimatedQuantity) &&
    typeof r.actualQuantity === 'number' &&
    Number.isFinite(r.actualQuantity) &&
    (r.measure === 'material' || r.measure === 'labour') &&
    typeof r.recordedAt === 'string' &&
    !Number.isNaN(Date.parse(r.recordedAt))
  );
}

export function isValidCalibrationApproval(item: unknown): item is CalibrationApproval {
  if (!item || typeof item !== 'object') return false;
  const a = item as Record<string, unknown>;
  return (
    typeof a.candidateKey === 'string' &&
    (a.decision === 'approved' || a.decision === 'rejected') &&
    typeof a.reviewerId === 'string' &&
    typeof a.candidateFingerprint === 'string'
  );
}

export function notifyStorageUpdated(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('frelux_calibration_sync'));
  }
}

/**
 * Prioritized retention pruning:
 * Priority 1 (Protect): Accepted verified project records
 * Priority 2: Accepted user-reported records
 * Priority 3: Pending review records
 * Priority 4 (Prune first): Rejected records
 */
export function pruneFeedbackRecords(
  records: CalibrationFeedback[],
  maxLimit = 500
): CalibrationFeedback[] {
  if (records.length <= maxLimit) return records;

  const rejected = records.filter((r) => r.status === 'rejected');
  const pending = records.filter((r) => r.status === 'pending_review');
  const acceptedUnverified = records.filter(
    (r) => r.status === 'accepted' && r.evidence !== 'verified_project'
  );
  const acceptedVerified = records.filter(
    (r) => r.status === 'accepted' && r.evidence === 'verified_project'
  );

  let remainingBudget = maxLimit;

  // 1. Keep accepted verified records first
  const keptVerified = acceptedVerified.slice(0, remainingBudget);
  remainingBudget = Math.max(0, remainingBudget - keptVerified.length);

  // 2. Keep accepted unverified
  const keptUnverified = acceptedUnverified.slice(0, remainingBudget);
  remainingBudget = Math.max(0, remainingBudget - keptUnverified.length);

  // 3. Keep pending
  const keptPending = pending.slice(0, remainingBudget);
  remainingBudget = Math.max(0, remainingBudget - keptPending.length);

  // 4. Any remaining budget goes to rejected
  const keptRejected = rejected.slice(0, remainingBudget);

  return [...keptVerified, ...keptUnverified, ...keptPending, ...keptRejected];
}

export function getCalibrationFeedback(
  storage?: Pick<Storage, 'getItem'>
): CalibrationFeedback[] {
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(CALIBRATION_FEEDBACK_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCalibrationFeedback);
  } catch {
    return [];
  }
}

export function saveCalibrationFeedback(
  feedback: CalibrationFeedback,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): boolean {
  if (!isValidCalibrationFeedback(feedback)) return false;
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return false;
  const existing = getCalibrationFeedback(store);
  if (existing.some((row) => row.id === feedback.id)) return false;
  try {
    const pruned = pruneFeedbackRecords([feedback, ...existing], 500);
    store.setItem(CALIBRATION_FEEDBACK_KEY, JSON.stringify(pruned));
    notifyStorageUpdated();
    return true;
  } catch {
    return false;
  }
}

export function updateCalibrationFeedback(
  id: string,
  update: Partial<CalibrationFeedback>,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): boolean {
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return false;
  const existing = getCalibrationFeedback(store);
  const index = existing.findIndex((row) => row.id === id);
  if (index < 0) return false;

  const current = existing[index];
  const isDataModified =
    (update.estimatedQuantity !== undefined &&
      update.estimatedQuantity !== current.estimatedQuantity) ||
    (update.actualQuantity !== undefined &&
      update.actualQuantity !== current.actualQuantity) ||
    (update.unit !== undefined && update.unit !== current.unit) ||
    (update.materialKey !== undefined &&
      update.materialKey !== current.materialKey) ||
    (update.marketCode !== undefined &&
      update.marketCode !== current.marketCode) ||
    (update.measure !== undefined && update.measure !== current.measure) ||
    (update.evidence !== undefined && update.evidence !== current.evidence) ||
    (update.evidenceReference !== undefined &&
      update.evidenceReference !== current.evidenceReference);

  // If core evidence data changed on an accepted record, review status is revoked
  const sanitizedUpdate = { ...update };
  if (isDataModified && current.status === 'accepted') {
    sanitizedUpdate.status = 'pending_review';
    sanitizedUpdate.reviewerId = undefined;
    sanitizedUpdate.reviewedAt = undefined;
  }

  try {
    const updatedRecord = { ...current, ...sanitizedUpdate };
    if (!isValidCalibrationFeedback(updatedRecord)) return false;
    existing[index] = updatedRecord;
    store.setItem(CALIBRATION_FEEDBACK_KEY, JSON.stringify(existing));
    notifyStorageUpdated();
    return true;
  } catch {
    return false;
  }
}

export function deleteCalibrationFeedback(
  id: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): boolean {
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return false;
  const existing = getCalibrationFeedback(store);
  const filtered = existing.filter((row) => row.id !== id);
  if (filtered.length === existing.length) return false;
  try {
    store.setItem(CALIBRATION_FEEDBACK_KEY, JSON.stringify(filtered));
    notifyStorageUpdated();
    return true;
  } catch {
    return false;
  }
}

export function getCalibrationApprovals(
  storage?: Pick<Storage, 'getItem'>
): CalibrationApproval[] {
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(CALIBRATION_APPROVALS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCalibrationApproval);
  } catch {
    return [];
  }
}

export function saveCalibrationApproval(
  approval: CalibrationApproval,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): boolean {
  if (!isValidCalibrationApproval(approval)) return false;
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return false;
  const existing = getCalibrationApprovals(store).filter(
    (item) => item.candidateKey !== approval.candidateKey
  );
  try {
    store.setItem(
      CALIBRATION_APPROVALS_KEY,
      JSON.stringify([approval, ...existing].slice(0, 200))
    );

    // Record audit event for compliance tracking
    recordAuditEvent({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      entityType: 'calibration_candidate',
      entityKey: approval.candidateKey,
      action: approval.decision === 'approved' ? 'approved' : 'rejected',
      actorId: approval.reviewerId,
      occurredAt: approval.reviewedAt,
      reason: approval.reason,
      after: { fingerprint: approval.candidateFingerprint },
    }, store);

    notifyStorageUpdated();
    return true;
  } catch {
    return false;
  }
}

export function getApprovalForCandidate(
  candidateKey: string,
  storage?: Pick<Storage, 'getItem'>
): CalibrationApproval | null {
  const approvals = getCalibrationApprovals(storage);
  return approvals.find((item) => item.candidateKey === candidateKey) ?? null;
}

export function getAuditEvents(
  storage?: Pick<Storage, 'getItem'>
): AuditEvent[] {
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(CALIBRATION_AUDIT_LOG_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEvent[]) : [];
  } catch {
    return [];
  }
}

export function recordAuditEvent(
  event: AuditEvent,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): boolean {
  const store =
    storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return false;
  try {
    const existing = getAuditEvents(store);
    store.setItem(
      CALIBRATION_AUDIT_LOG_KEY,
      JSON.stringify([event, ...existing].slice(0, 500))
    );
    return true;
  } catch {
    return false;
  }
}
