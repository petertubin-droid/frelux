// =========================================================
// FRELUX PROJECT AGENT — AUDIT SANITIZER (Phase 6, Stage 10)
//
// Shared secret hygiene for everything the agent persists:
// activity payloads, memory facts, audit trails. Secrets never
// enter storage; the read layer sanitizes again so legacy rows
// cannot leak either.
// =========================================================

const SECRET_KEY_RE =
  /(secret|password|passwd|token|api_?key|apikey|authorization|credential|private_?key|session_?id|cookie)/i;

/** Recursively redact secret-looking values. Deterministic, pure. */
export function sanitizeAuditValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeAuditValue(v)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_RE.test(k) ? "[REDACTED]" : sanitizeAuditValue(v);
    }
    return out as unknown as T;
  }
  return value;
}
