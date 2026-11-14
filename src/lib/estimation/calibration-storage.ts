import type {
  CalibrationFeedback,
  CalibrationApproval,
} from "./adaptive-calibration";

export const CALIBRATION_FEEDBACK_KEY = "frelux_calibration_feedback_v1";
export const CALIBRATION_APPROVALS_KEY = "frelux_calibration_approvals_v1";

export function getCalibrationFeedback(
  storage?: Pick<Storage, "getItem">,
): CalibrationFeedback[] {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(CALIBRATION_FEEDBACK_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CalibrationFeedback[]) : [];
  } catch {
    return [];
  }
}

export function saveCalibrationFeedback(
  feedback: CalibrationFeedback,
  storage?: Pick<Storage, "getItem" | "setItem">,
): boolean {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return false;
  const existing = getCalibrationFeedback(store);
  if (existing.some((row) => row.id === feedback.id)) return false;
  try {
    store.setItem(
      CALIBRATION_FEEDBACK_KEY,
      JSON.stringify([feedback, ...existing].slice(0, 500)),
    );
    return true;
  } catch {
    return false;
  }
}

export function updateCalibrationFeedback(
  id: string,
  update: Partial<CalibrationFeedback>,
  storage?: Pick<Storage, "getItem" | "setItem">,
): boolean {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return false;
  const existing = getCalibrationFeedback(store);
  const index = existing.findIndex((row) => row.id === id);
  if (index < 0) return false;
  try {
    existing[index] = { ...existing[index], ...update };
    store.setItem(CALIBRATION_FEEDBACK_KEY, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
}

export function getCalibrationApprovals(
  storage?: Pick<Storage, "getItem">,
): CalibrationApproval[] {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(CALIBRATION_APPROVALS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CalibrationApproval[]) : [];
  } catch {
    return [];
  }
}

export function saveCalibrationApproval(
  approval: CalibrationApproval,
  storage?: Pick<Storage, "getItem" | "setItem">,
): boolean {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return false;
  const existing = getCalibrationApprovals(store).filter(
    (item) => item.candidateKey !== approval.candidateKey,
  );
  try {
    store.setItem(
      CALIBRATION_APPROVALS_KEY,
      JSON.stringify([approval, ...existing].slice(0, 200)),
    );
    return true;
  } catch {
    return false;
  }
}

export function getApprovalForCandidate(
  candidateKey: string,
  storage?: Pick<Storage, "getItem">,
): CalibrationApproval | null {
  const approvals = getCalibrationApprovals(storage);
  return approvals.find((item) => item.candidateKey === candidateKey) ?? null;
}
